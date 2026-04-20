import { getAppLauncher, probeUrl } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

/**
 * Try to open iOS Screen Time settings.
 * Apple does not provide a public deep-link, so we fall back to the Settings root.
 */
export async function openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Zeit für Ihr Kind freigeben.`
    : '';

  const launcher = await getAppLauncher();

  if (launcher) {
    await probeUrl(launcher, 'app-settings:', 'iOS app-settings:');
    await probeUrl(launcher, 'App-Prefs:root=SCREEN_TIME', 'iOS App-Prefs ScreenTime');

    try {
      await launcher.openUrl({ url: 'app-settings:' });
      return {
        success: true,
        opened: true,
        platform: 'ios',
        appName: 'Einstellungen',
        message: `Einstellungen geöffnet. Bitte navigieren Sie zu „Bildschirmzeit → [Kind] → App-Limits". ${minutesMsg}`.trim(),
      };
    } catch (e) {
      console.warn('[ParentalControls] iOS Settings open failed:', e);
    }
  }

  return {
    success: false,
    opened: false,
    platform: 'ios',
    appName: 'Bildschirmzeit',
    message: `Bitte manuell öffnen: Einstellungen → Bildschirmzeit → [Kind] → App-Limits. ${minutesMsg}`.trim(),
  };
}