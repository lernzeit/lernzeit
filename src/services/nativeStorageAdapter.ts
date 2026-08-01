/**
 * Native Storage Adapter for Supabase Auth
 * Uses @capacitor/preferences on native platforms for reliable session persistence.
 * Falls back to localStorage on web.
 */
import { Capacitor } from '@capacitor/core';

type PreferencesPluginLike = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
  keys?: () => Promise<{ keys: string[] }>;
};

let Preferences: PreferencesPluginLike | null = null;
let preferencesStatus: 'unknown' | 'available' | 'unavailable' = 'unknown';
let initPromise: Promise<void> | null = null;

/** Buffered writes that arrived before the Preferences bridge was ready. */
type PendingOp = { type: 'set'; key: string; value: string } | { type: 'remove'; key: string };
const pendingOps: PendingOp[] = [];

async function flushPendingOps(): Promise<void> {
  if (preferencesStatus !== 'available' || !Preferences) {
    pendingOps.length = 0;
    return;
  }
  const ops = pendingOps.splice(0, pendingOps.length);
  for (const op of ops) {
    try {
      if (op.type === 'set') {
        await Preferences.set({ key: op.key, value: op.value });
      } else {
        await Preferences.remove({ key: op.key });
      }
    } catch (e) {
      console.warn('Failed to flush buffered storage op:', e);
    }
  }
}

async function ensurePreferencesInitialized(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    preferencesStatus = 'unavailable';
    return;
  }

  if (preferencesStatus !== 'unknown') return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import('@capacitor/preferences');
      const candidate = mod.Preferences as PreferencesPluginLike;

      // Validate plugin bridge. Do not return plugin objects from async fns
      // because Capacitor proxy can be treated as thenable on Android.
      await candidate.get({ key: '__test__' });

      Preferences = candidate;
      preferencesStatus = 'available';
    } catch (e) {
      console.warn('Capacitor Preferences not available, falling back to localStorage:', e);
      Preferences = null;
      preferencesStatus = 'unavailable';
    } finally {
      initPromise = null;
    }
    await flushPendingOps();
  })();

  return initPromise;
}

// In-memory cache to serve getItem synchronously (Supabase requires sync storage API)
const memoryCache = new Map<string, string>();
let initialized = false;

/**
 * Derive the Supabase storage key prefix from the project URL instead of
 * hardcoding it, so a project switch cannot silently break persistence.
 */
const SUPABASE_URL = 'https://fsmgynpdfxkaiiuguqyr.supabase.co';
const projectRef = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0];
  } catch {
    return '';
  }
})();
const SUPABASE_STORAGE_KEY = `sb-${projectRef}-auth-token`;
const SB_KEY_PREFIX = 'sb-';

export type AuthBootstrapInfo = {
  preferencesAvailable: boolean;
  keys: string[];
  sessionSource: 'preferences' | 'localstorage' | 'none';
};

let bootstrapInfo: AuthBootstrapInfo = {
  preferencesAvailable: false,
  keys: [],
  sessionSource: 'none',
};

export function getAuthBootstrapInfo(): AuthBootstrapInfo {
  return bootstrapInfo;
}

/**
 * Pre-load session data from native storage into memory cache.
 * Must be called BEFORE creating the Supabase client.
 */
export async function initNativeStorage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!Capacitor.isNativePlatform()) return;

  await ensurePreferencesInitialized();

  const foundKeys = new Set<string>();
  let sessionSource: AuthBootstrapInfo['sessionSource'] = 'none';

  // 1) Load every sb-* key from Capacitor Preferences.
  try {
    if (preferencesStatus === 'available' && Preferences) {
      let prefKeys: string[] = [];
      try {
        prefKeys = (await Preferences.keys?.())?.keys ?? [];
      } catch {
        prefKeys = [];
      }
      if (prefKeys.length === 0) prefKeys = [SUPABASE_STORAGE_KEY];

      for (const key of prefKeys.filter((k) => k.startsWith(SB_KEY_PREFIX))) {
        const { value } = await Preferences.get({ key });
        if (value !== null && value !== undefined) {
          memoryCache.set(key, value);
          foundKeys.add(key);
          if (key === SUPABASE_STORAGE_KEY || key.startsWith(`${SUPABASE_STORAGE_KEY}.`)) {
            sessionSource = 'preferences';
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to read native storage:', e);
  }

  // 2) Always also inspect localStorage — earlier writes may have landed there
  //    only. Migrate anything missing back into Preferences.
  try {
    const localKeys = Object.keys(localStorage).filter((k) => k.startsWith(SB_KEY_PREFIX));
    for (const key of localKeys) {
      if (memoryCache.has(key)) continue;
      const stored = localStorage.getItem(key);
      if (stored === null) continue;

      memoryCache.set(key, stored);
      foundKeys.add(key);
      if (
        sessionSource === 'none' &&
        (key === SUPABASE_STORAGE_KEY || key.startsWith(`${SUPABASE_STORAGE_KEY}.`))
      ) {
        sessionSource = 'localstorage';
      }

      // Migration: write back to Preferences so the next start finds it there.
      if (preferencesStatus === 'available' && Preferences) {
        void Preferences.set({ key, value: stored }).catch(() => { /* ignore */ });
      }
    }
  } catch (e) {
    console.warn('Failed to read localStorage fallback:', e);
  }

  bootstrapInfo = {
    preferencesAvailable: preferencesStatus === 'available',
    keys: Array.from(foundKeys),
    sessionSource,
  };
}

/** Safely persist to native storage or fall back to localStorage */
function persistValue(key: string, value: string): void {
  if (!Capacitor.isNativePlatform()) return;

  if (preferencesStatus === 'unknown') {
    pendingOps.push({ type: 'set', key, value });
    void ensurePreferencesInitialized();
  } else if (preferencesStatus === 'available' && Preferences) {
    void Preferences.set({ key, value }).catch((e: unknown) => {
      console.warn('Failed to persist to native storage:', e);
    });
  }

  // Always also write to localStorage as backup
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Safely remove from native storage and localStorage */
function removeValue(key: string): void {
  if (!Capacitor.isNativePlatform()) return;

  if (preferencesStatus === 'unknown') {
    pendingOps.push({ type: 'remove', key });
    void ensurePreferencesInitialized();
  } else if (preferencesStatus === 'available' && Preferences) {
    void Preferences.remove({ key }).catch((e: unknown) => {
      console.warn('Failed to remove from native storage:', e);
    });
  }

  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Synchronous storage adapter that reads from memory cache
 * and writes through to native Preferences asynchronously.
 */
export const nativeStorageAdapter = {
  getItem: (key: string): string | null => {
    return memoryCache.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    memoryCache.set(key, value);
    persistValue(key, value);
  },

  removeItem: (key: string): void => {
    memoryCache.delete(key);
    removeValue(key);
  },
};
