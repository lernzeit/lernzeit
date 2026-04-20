import { Capacitor } from '@capacitor/core';

let appLauncherPromise: Promise<any> | null = null;
let browserPromise: Promise<any> | null = null;

export async function getAppLauncher(): Promise<any> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!appLauncherPromise) {
    appLauncherPromise = import('@capacitor/app-launcher')
      .then((mod) => mod.AppLauncher)
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
      .then((mod) => mod.Browser)
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