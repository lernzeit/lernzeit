import { getAppLauncher, getBrowser, probeUrl } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

/**
 * Try to open Family Link on Android.
 * Order of attempts:
 * 1. Official Family Link web URL (Android App Links → opens app if installed)
 * 2. Play Store (market://) → falls back to web Play Store
 */
export async function openFamilyLink(minutes?: number): Promise<OpenParentalControlsResult> {
  const packageName = 'com.google.android.apps.kids.familylink';
  const familyLinkWebUrl = 'https://families.google.com/familylink/';
  const playStoreWeb = `https://play.google.com/store/apps/details?id=${packageName}`;
  const marketUrl = `market://details?id=${packageName}`;
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind freigeben.`
    : '';

  const launcher = await getAppLauncher();

  if (launcher) {
    console.log('[ParentalControls] 🩺 Starting diagnostic probes...');
    await probeUrl(launcher, familyLinkWebUrl, 'FamilyLink AppLink');
    await probeUrl(launcher, marketUrl, 'Play Store (market://)');
    await probeUrl(launcher, playStoreWeb, 'Play Store (web)');
    await probeUrl(launcher, 'familylink://', 'familylink:// scheme');

    try {
      await launcher.openUrl({ url: familyLinkWebUrl });
      console.log('[ParentalControls] ✅ Opened Family Link via App Link');
      return {
        success: true,
        opened: true,
        platform: 'android',
        appName: 'Family Link',
        message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
        fallbackUrl: familyLinkWebUrl,
      };
    } catch (e) {
      console.warn('[ParentalControls] App Link failed:', e);
    }

    try {
      await launcher.openUrl({ url: marketUrl });
      console.log('[ParentalControls] ✅ Opened Play Store (market://)');
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: `Family Link konnte nicht direkt geöffnet werden. Im Play Store auf „Öffnen" tippen. ${minutesMsg}`.trim(),
        fallbackUrl: playStoreWeb,
      };
    } catch (e) {
      console.warn('[ParentalControls] Play Store deep link failed:', e);
    }

    try {
      await launcher.openUrl({ url: playStoreWeb });
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: `Bitte öffnen Sie Family Link manuell. ${minutesMsg}`.trim(),
        fallbackUrl: playStoreWeb,
      };
    } catch (e) {
      console.warn('[ParentalControls] Web Play Store failed:', e);
    }
  }

  const browser = await getBrowser();
  if (browser) {
    try {
      await browser.open({ url: playStoreWeb });
    } catch (e) {
      console.warn('[ParentalControls] Browser fallback failed:', e);
    }
  }

  return {
    success: false,
    opened: false,
    platform: 'android',
    appName: 'Family Link',
    message: 'Family Link konnte nicht geöffnet werden. Bitte manuell öffnen oder aus dem Play Store installieren.',
    fallbackUrl: playStoreWeb,
  };
}