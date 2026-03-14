/**
 * Native Storage Adapter for Supabase Auth
 * Uses @capacitor/preferences on native platforms for reliable session persistence.
 * Falls back to localStorage on web.
 */
import { Capacitor } from '@capacitor/core';

let Preferences: any = null;
let preferencesAvailable = false;

async function getPreferences() {
  if (Preferences) return Preferences;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
    // Test that it actually works on this platform
    await Preferences.get({ key: '__test__' });
    preferencesAvailable = true;
    return Preferences;
  } catch (e) {
    console.warn('Capacitor Preferences not available, falling back to localStorage:', e);
    Preferences = null;
    preferencesAvailable = false;
    return null;
  }
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

  try {
    const prefs = await getPreferences();
    if (!prefs) {
      // Preferences plugin not working — seed memory cache from localStorage
      try {
        const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
        if (stored) {
          memoryCache.set(SUPABASE_STORAGE_KEY, stored);
          console.log('✅ Session restored from localStorage fallback');
        }
      } catch { /* ignore */ }
      return;
    }

    const { value } = await prefs.get({ key: SUPABASE_STORAGE_KEY });
    if (value) {
      memoryCache.set(SUPABASE_STORAGE_KEY, value);
      console.log('✅ Session restored from native storage');
    } else {
      console.log('ℹ️ No saved session found in native storage');
    }
  } catch (e) {
    console.warn('Failed to init native storage, using localStorage fallback:', e);
  }
}

/** Safely persist to native storage or fall back to localStorage */
function persistValue(key: string, value: string): void {
  if (!Capacitor.isNativePlatform()) return;

  if (preferencesAvailable && Preferences) {
    try {
      Preferences.set({ key, value }).catch((e: any) =>
        console.warn('Failed to persist to native storage:', e)
      );
    } catch {
      // sync error — fall through to localStorage
    }
  }

  // Always also write to localStorage as backup
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/** Safely remove from native storage and localStorage */
function removeValue(key: string): void {
  if (!Capacitor.isNativePlatform()) return;

  if (preferencesAvailable && Preferences) {
    try {
      Preferences.remove({ key }).catch((e: any) =>
        console.warn('Failed to remove from native storage:', e)
      );
    } catch { /* ignore */ }
  }

  try { localStorage.removeItem(key); } catch { /* ignore */ }
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
