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
};

let Preferences: PreferencesPluginLike | null = null;
let preferencesStatus: 'unknown' | 'available' | 'unavailable' = 'unknown';
let initPromise: Promise<void> | null = null;

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
  })();

  return initPromise;
}

// In-memory cache to serve getItem synchronously (Supabase requires sync storage API)
const memoryCache = new Map<string, string>();
let initialized = false;

const SUPABASE_STORAGE_KEY = 'sb-fsmgynpdfxkaiiuguqyr-auth-token';

/**
 * Pre-load session data from native storage into memory cache.
 * Must be called BEFORE creating the Supabase client.
 */
export async function initNativeStorage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!Capacitor.isNativePlatform()) return;

  await ensurePreferencesInitialized();

  try {
    if (preferencesStatus === 'available' && Preferences) {
      const { value } = await Preferences.get({ key: SUPABASE_STORAGE_KEY });
      if (value) {
        memoryCache.set(SUPABASE_STORAGE_KEY, value);
        console.log('✅ Session restored from native storage');
      } else {
        console.log('ℹ️ No saved session found in native storage');
      }
      return;
    }

    // Preferences plugin not working — seed memory cache from localStorage
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      memoryCache.set(SUPABASE_STORAGE_KEY, stored);
      console.log('✅ Session restored from localStorage fallback');
    }
  } catch (e) {
    console.warn('Failed to init native storage, using localStorage fallback:', e);
  }
}

/** Safely persist to native storage or fall back to localStorage */
function persistValue(key: string, value: string): void {
  if (!Capacitor.isNativePlatform()) return;

  if (preferencesStatus === 'unknown') {
    void ensurePreferencesInitialized();
  }

  if (preferencesStatus === 'available' && Preferences) {
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
    void ensurePreferencesInitialized();
  }

  if (preferencesStatus === 'available' && Preferences) {
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
