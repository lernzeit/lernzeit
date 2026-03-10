/**
 * Native Storage Adapter for Supabase Auth
 * Uses @capacitor/preferences on native platforms for reliable session persistence.
 * Falls back to localStorage on web.
 */
import { Capacitor } from '@capacitor/core';

let Preferences: any = null;

async function getPreferences() {
  if (!Preferences && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/preferences');
      Preferences = mod.Preferences;
    } catch (e) {
      console.warn('Capacitor Preferences not available:', e);
    }
  }
  return Preferences;
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
    if (!prefs) return;

    // Load the main Supabase auth key
    const { value } = await prefs.get({ key: SUPABASE_STORAGE_KEY });
    if (value) {
      memoryCache.set(SUPABASE_STORAGE_KEY, value);
      console.log('✅ Session restored from native storage');
    } else {
      console.log('ℹ️ No saved session found in native storage');
    }
  } catch (e) {
    console.warn('Failed to init native storage:', e);
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

    // Write-through to native storage (fire-and-forget)
    if (Capacitor.isNativePlatform()) {
      getPreferences().then(prefs => {
        if (prefs) {
          prefs.set({ key, value }).catch((e: any) =>
            console.warn('Failed to persist to native storage:', e)
          );
        }
      });
    }
  },

  removeItem: (key: string): void => {
    memoryCache.delete(key);

    if (Capacitor.isNativePlatform()) {
      getPreferences().then(prefs => {
        if (prefs) {
          prefs.remove({ key }).catch((e: any) =>
            console.warn('Failed to remove from native storage:', e)
          );
        }
      });
    }
  },
};
