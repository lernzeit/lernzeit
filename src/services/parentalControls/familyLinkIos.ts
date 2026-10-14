import { getAppLauncher, getBrowser, probeUrl } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

const FAMILY_LINK_SCHEME = 'familylink://';
const APP_STORE_URL = 'https://apps.apple.com/de/app/google-family-link/id1150085200';

/**
 * Öffnet die Family-Link-Elternapp auf einem iPhone/iPad (ab iOS 16 verfügbar).
 * Wird gebraucht, wenn das KIND auf Android ist, der Elternteil aber iOS nutzt.
 * Fallback: App Store statt Play Store.
 */
export async function openFamilyLinkIos(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Gib dort ${minutes} Minuten frei (Bonuszeit).`
    : '';

  const launcher = await getAppLauncher();

  if (launcher) {
    const installed = await probeUrl(launcher, FAMILY_LINK_SCHEME, 'FamilyLink iOS scheme');
    if (installed) {
      try {
        await launcher.openUrl({ url: FAMILY_LINK_SCHEME });
        return {
          success: true,
          opened: true,
          platform: 'ios',
          appName: 'Family Link',
          message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
          fallbackUrl: APP_STORE_URL,
        };
      } catch (e) {
        console.warn('[ParentalControls] Family Link iOS open failed:', e);
      }
    }

    try {
      await launcher.openUrl({ url: APP_STORE_URL });
      return {
        success: true,
        opened: false,
        platform: 'ios',
        appName: 'Family Link',
        message: `Lade Family Link im App Store (er ist geöffnet), dann gib die Zeit dort frei. ${minutesMsg}`.trim(),
        fallbackUrl: APP_STORE_URL,
        notInstalled: true,
      };
    } catch (e) {
      console.warn('[ParentalControls] App Store open failed:', e);
    }
  }

  const browser = await getBrowser();
  if (browser) {
    try {
      await browser.open({ url: APP_STORE_URL });
      return {
        success: true,
        opened: false,
        platform: 'ios',
        appName: 'Family Link',
        message: `Lade Family Link aus dem App Store, dann gib die Zeit dort frei. ${minutesMsg}`.trim(),
        fallbackUrl: APP_STORE_URL,
        notInstalled: true,
      };
    } catch (e) {
      console.warn('[ParentalControls] Browser fallback failed:', e);
    }
  }

  return {
    success: false,
    opened: false,
    platform: 'ios',
    appName: 'Family Link',
    message: 'Öffne Family Link selbst und gib die Zeit dort frei. Ist die App nicht da: im App Store laden.',
    fallbackUrl: APP_STORE_URL,
    notInstalled: true,
  };
}