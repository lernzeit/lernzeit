import { getAppLauncher, getBrowser, probeUrl } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

const PACKAGE_NAME = 'com.google.android.apps.kids.familylink';
const MARKET_URL = `market://details?id=${PACKAGE_NAME}`;
const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
const FAMILY_LINK_WEB = 'https://families.google.com/familylink/';

/**
 * Check if Family Link is installed without launching it.
 */
export async function isFamilyLinkInstalled(): Promise<boolean> {
  const launcher = await getAppLauncher();
  if (!launcher) return false;
  try {
    return await probeUrl(launcher, PACKAGE_NAME, 'FamilyLink package (check)');
  } catch {
    return false;
  }
}

/**
 * Open Play Store directly to install Family Link.
 */
export async function openFamilyLinkInstall(): Promise<void> {
  const launcher = await getAppLauncher();
  if (launcher) {
    try {
      const canMarket = await probeUrl(launcher, MARKET_URL, 'Play Store (market://)');
      if (canMarket) {
        await launcher.openUrl({ url: MARKET_URL });
        return;
      }
      await launcher.openUrl({ url: PLAY_STORE_WEB });
      return;
    } catch (e) {
      console.warn('[ParentalControls] openFamilyLinkInstall failed:', e);
    }
  }
  const browser = await getBrowser();
  if (browser) {
    try {
      await browser.open({ url: PLAY_STORE_WEB });
    } catch (e) {
      console.warn('[ParentalControls] Browser fallback failed:', e);
    }
  }
}

/**
 * Open Family Link on Android.
 * Strategy:
 * 1. Check & launch via package name (Capacitor AppLauncher uses package names on Android).
 * 2. Fallback: market:// → Play Store web → families.google.com (Browser).
 */
export async function openFamilyLink(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind freigeben.`
    : '';

  const launcher = await getAppLauncher();

  if (launcher) {
    const installed = await probeUrl(launcher, PACKAGE_NAME, 'FamilyLink package');

    if (installed) {
      try {
        await launcher.openUrl({ url: PACKAGE_NAME });
        console.log('[ParentalControls] ✅ Opened Family Link via package name');
        return {
          success: true,
          opened: true,
          platform: 'android',
          appName: 'Family Link',
          message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
          fallbackUrl: FAMILY_LINK_WEB,
        };
      } catch (e) {
        console.warn('[ParentalControls] openUrl(package) failed:', e);
      }
    }

    // Fallback 1: Play Store app via market://
    try {
      const canMarket = await probeUrl(launcher, MARKET_URL, 'Play Store (market://)');
      if (canMarket) {
        await launcher.openUrl({ url: MARKET_URL });
        return {
          success: true,
          opened: false,
          platform: 'android',
          appName: 'Family Link',
          message: `Family Link ist nicht installiert. Play Store wurde geöffnet. ${minutesMsg}`.trim(),
          fallbackUrl: PLAY_STORE_WEB,
          notInstalled: true,
        };
      }
    } catch (e) {
      console.warn('[ParentalControls] market:// failed:', e);
    }

    // Fallback 2: Web Play Store
    try {
      await launcher.openUrl({ url: PLAY_STORE_WEB });
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: `Family Link ist nicht installiert. Bitte aus dem Play Store installieren. ${minutesMsg}`.trim(),
        fallbackUrl: PLAY_STORE_WEB,
        notInstalled: true,
      };
    } catch (e) {
      console.warn('[ParentalControls] Play Store web failed:', e);
    }
  }

  // Fallback 3: families.google.com via Browser
  const browser = await getBrowser();
  if (browser) {
    try {
      await browser.open({ url: FAMILY_LINK_WEB });
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: `Family Link wurde im Browser geöffnet. ${minutesMsg}`.trim(),
        fallbackUrl: FAMILY_LINK_WEB,
        notInstalled: true,
      };
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
    fallbackUrl: PLAY_STORE_WEB,
    notInstalled: true,
  };
}
