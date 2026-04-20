import { Capacitor } from '@capacitor/core';

let appLauncherPromise: Promise<any> | null = null;
let browserPromise: Promise<any> | null = null;

function wrapPluginMethod<T extends object>(plugin: T, methodName: keyof T) {
  return (...args: any[]) => {
    const method = plugin[methodName];
    if (typeof method !== 'function') {
      throw new Error(`[ParentalControls] Plugin method ${String(methodName)} is not available.`);
    }
    return (method as (...innerArgs: any[]) => any).apply(plugin, args);
  };
}

export async function getAppLauncher(): Promise<any> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!appLauncherPromise) {
    appLauncherPromise = import('@capacitor/app-launcher')
      .then((mod) => {
        const plugin = mod.AppLauncher;
        return {
          canOpenUrl: wrapPluginMethod(plugin, 'canOpenUrl'),
          openUrl: wrapPluginMethod(plugin, 'openUrl'),
        };
      })
      .catch((e) => {
        console.warn('[ParentalControls] AppLauncher not available:', e);
        appLauncherPromise = null;
        return null;
      });
  }
  return appLauncherPromise;
}

export async function getBrowser(): Promise<any> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!browserPromise) {
    browserPromise = import('@capacitor/browser')
      .then((mod) => {
        const plugin = mod.Browser;
        return {
          open: wrapPluginMethod(plugin, 'open'),
        };
      })
      .catch((e) => {
        console.warn('[ParentalControls] Browser not available:', e);
        browserPromise = null;
        return null;
      });
  }
  return browserPromise;
}

/**
 * Diagnostic helper: probes if a URL can be opened by any installed app.
 * Logs result for Logcat inspection. Never throws.
 */
export async function probeUrl(launcher: any, url: string, label: string): Promise<boolean> {
  try {
    const result = await launcher.canOpenUrl({ url });
    const canOpen = !!result?.value;
    console.log(`[ParentalControls] 🔎 canOpenUrl(${label}) → ${canOpen}`, { url, result });
    return canOpen;
  } catch (e) {
    console.warn(`[ParentalControls] ⚠️ canOpenUrl(${label}) threw:`, e);
    return false;
  }
}