import { Capacitor } from '@capacitor/core';

let AppLauncher: any = null;
let Browser: any = null;

async function getAppLauncher() {
  if (!AppLauncher && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/app-launcher');
      AppLauncher = mod.AppLauncher;
    } catch (e) {
      console.warn('[ParentalControls] AppLauncher not available:', e);
    }
  }
  return AppLauncher;
}

async function getBrowser() {
  if (!Browser && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/browser');
      Browser = mod.Browser;
    } catch (e) {
      console.warn('[ParentalControls] Browser not available:', e);
    }
  }
  return Browser;
}

export type Platform = 'android' | 'ios' | 'web';

export interface OpenParentalControlsResult {
  success: boolean;
  opened: boolean;
  platform: Platform;
  appName: string;
  message: string;
  fallbackUrl?: string;
}

/**
 * Service to open native parental control apps (Family Link / Screen Time).
 *
 * Strategy:
 * - Android: Try Family Link app via documented URL schemes, fall back to Play Store.
 *   NOTE: Direct deep-linking into Family Link is not officially supported by Google.
 *   We use the publicly documented web URL `https://families.google.com/familylink`
 *   which opens the app on devices where it is installed (via Android App Links),
 *   otherwise falls back to the browser/Play Store.
 * - iOS: Try `App-Prefs:` (works on some iOS versions), then fall back to instructions.
 *   Apple does not provide a public deep-link for Screen Time settings.
 * - Web/PWA: Show platform-specific instructions and store links.
 */
class ParentalControlsService {
  private static instance: ParentalControlsService;

  public static getInstance(): ParentalControlsService {
    if (!ParentalControlsService.instance) {
      ParentalControlsService.instance = new ParentalControlsService();
    }
    return ParentalControlsService.instance;
  }

  getPlatform(): Platform {
    if (!Capacitor.isNativePlatform()) return 'web';
    return Capacitor.getPlatform() as Platform;
  }

  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  getParentalControlAppName(): string {
    const platform = this.getPlatform();
    switch (platform) {
      case 'android': return 'Family Link';
      case 'ios': return 'Bildschirmzeit';
      default: return 'Kindersicherung';
    }
  }

  async openParentalControlApp(minutes?: number): Promise<OpenParentalControlsResult> {
    const platform = this.getPlatform();
    switch (platform) {
      case 'android': return this.openFamilyLink(minutes);
      case 'ios': return this.openScreenTimeSettings(minutes);
      default: return this.getWebInstructions(minutes);
    }
  }

  /**
   * Diagnostic helper: probes if a URL can be opened by any installed app.
   * Logs result for Logcat inspection. Never throws.
   */
  private async probeUrl(launcher: any, url: string, label: string): Promise<boolean> {
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

  /**
   * Try to open Family Link on Android.
   * Order of attempts:
   * 1. Official Family Link web URL (Android App Links → opens app if installed)
   * 2. Play Store (market://) → falls back to web Play Store
   */
  private async openFamilyLink(minutes?: number): Promise<OpenParentalControlsResult> {
    const packageName = 'com.google.android.apps.kids.familylink';
    const familyLinkWebUrl = 'https://families.google.com/familylink/';
    const playStoreWeb = `https://play.google.com/store/apps/details?id=${packageName}`;
    const marketUrl = `market://details?id=${packageName}`;
    const minutesMsg = minutes
      ? `Bitte ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind freigeben.`
      : '';

    const launcher = await getAppLauncher();

    if (launcher) {
      // Diagnostic probes (non-blocking)
      console.log('[ParentalControls] 🩺 Starting diagnostic probes...');
      await this.probeUrl(launcher, familyLinkWebUrl, 'FamilyLink AppLink');
      await this.probeUrl(launcher, marketUrl, 'Play Store (market://)');
      await this.probeUrl(launcher, playStoreWeb, 'Play Store (web)');
      await this.probeUrl(launcher, 'familylink://', 'familylink:// scheme');

      // 1) Official Family Link App Link (most reliable, opens app if installed)
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

      // 2) Play Store deep link (market://)
      try {
        await launcher.openUrl({ url: `market://details?id=${packageName}` });
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

      // 3) Web Play Store
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

    // Final fallback: in-app browser
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

  /**
   * Try to open iOS Screen Time settings.
   * Apple does not provide a public deep-link, so we try undocumented schemes
   * and fall back to instructions if they fail.
   */
  private async openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
    const minutesMsg = minutes
      ? `Bitte ${minutes} Minuten zusätzliche Zeit für Ihr Kind freigeben.`
      : '';

    const launcher = await getAppLauncher();

    if (launcher) {
      // Try opening the Settings app at root (this is reliable on all iOS versions)
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

  private getWebInstructions(minutes?: number): OpenParentalControlsResult {
    const minutesText = minutes ? ` ${minutes} Minuten` : '';
    return {
      success: true,
      opened: false,
      platform: 'web',
      appName: 'Kindersicherung',
      message: `Um${minutesText} Bildschirmzeit freizugeben:\n• Android: Family Link App → [Kind] → Tageslimit\n• iPhone/iPad: Einstellungen → Bildschirmzeit → [Kind] → App-Limits`,
    };
  }

  getInstructions(minutes?: number): { android: string; ios: string } {
    const minutesText = minutes ? `${minutes} Minuten` : 'zusätzliche Zeit';
    return {
      android: `Family Link App öffnen → [Kind auswählen] → Tageslimit → ${minutesText} hinzufügen`,
      ios: `Einstellungen → Bildschirmzeit → [Kind auswählen] → App-Limits → ${minutesText} gewähren`,
    };
  }
}

export const parentalControlsService = ParentalControlsService.getInstance();
