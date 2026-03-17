import { Capacitor } from '@capacitor/core';

let AppLauncher: any = null;

async function getAppLauncher() {
  if (!AppLauncher && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/app-launcher');
      AppLauncher = mod.AppLauncher;
    } catch (e) {
      console.warn('AppLauncher not available:', e);
    }
  }
  return AppLauncher;
}

export type Platform = 'android' | 'ios' | 'web';

export interface OpenParentalControlsResult {
  success: boolean;
  opened: boolean;
  platform: Platform;
  appName: string;
  message: string;
}

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

  private async openFamilyLink(minutes?: number): Promise<OpenParentalControlsResult> {
    const parentPackageName = 'com.google.android.apps.kids.familylink';
    const childHelperPackageName = 'com.google.android.apps.kids.familylinkhelper';
    const systemControlsPackageName = 'com.google.android.gms.supervision';
    const playStoreLink = `https://play.google.com/store/apps/details?id=${parentPackageName}`;
    const marketUri = `market://details?id=${parentPackageName}`;
    const minutesMsg = minutes
      ? `Bitte vergeben Sie ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind.`
      : '';

    try {
      const launcher = await getAppLauncher();

      if (launcher) {
        // 1) Explicit Android intent URIs targeting likely Family Link packages.
        // These are more reliable in native Android apps than generic HTTPS links.
        const intentUrls = [
          `intent://families.google.com/familylink/#Intent;scheme=https;package=${parentPackageName};end`,
          `intent://families.google.com/#Intent;scheme=https;package=${parentPackageName};end`,
          `intent://families.google.com/familylink/#Intent;scheme=https;package=${childHelperPackageName};end`,
          `intent://families.google.com/#Intent;scheme=https;package=${systemControlsPackageName};end`,
        ];

        for (const url of intentUrls) {
          try {
            await launcher.openUrl({ url });
            console.log('✅ Family Link opened via explicit Android intent:', url);
            return {
              success: true,
              opened: true,
              platform: 'android',
              appName: 'Family Link',
              message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
            };
          } catch (e) {
            console.warn(`Android intent failed for ${url}:`, e);
          }
        }

        // 2) Try verified/web app links as secondary fallback.
        const appLinkUrls = [
          'https://families.google.com/familylink/',
          'https://families.google.com/',
        ];

        for (const url of appLinkUrls) {
          try {
            await launcher.openUrl({ url });
            console.log('✅ Family Link opened via App Link:', url);
            return {
              success: true,
              opened: true,
              platform: 'android',
              appName: 'Family Link',
              message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
            };
          } catch (e) {
            console.warn(`App Link failed for ${url}:`, e);
          }
        }

        // 3) Open Play Store page so the user can at least tap "Öffnen" if installed.
        try {
          await launcher.openUrl({ url: marketUri });
          console.log('✅ Play Store opened via market:// URI');
          return {
            success: true,
            opened: false,
            platform: 'android',
            appName: 'Family Link',
            message: `Family Link konnte nicht direkt geöffnet werden. Im Play Store bitte auf „Öffnen“ tippen. ${minutesMsg}`.trim(),
          };
        } catch (e) {
          console.warn('market:// URI failed:', e);
        }

        try {
          await launcher.openUrl({ url: playStoreLink });
          console.log('✅ Play Store opened via HTTPS');
          return {
            success: true,
            opened: false,
            platform: 'android',
            appName: 'Family Link',
            message: `Family Link konnte nicht direkt geöffnet werden. Im Play Store bitte auf „Öffnen“ tippen. ${minutesMsg}`.trim(),
          };
        } catch (e) {
          console.warn('HTTPS Play Store link failed:', e);
        }
      }

      // Final fallback: use window.location (more reliable than window.open in WebView)
      console.warn('All AppLauncher methods failed, using window.location fallback');
      window.location.href = playStoreLink;
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: 'Family Link konnte nicht direkt geöffnet werden. Bitte öffnen Sie die App manuell oder tippen Sie im Play Store auf „Öffnen“.',
      };
    } catch (error) {
      console.error('Error opening Family Link:', error);
      return {
        success: false,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: 'Family Link konnte nicht geöffnet werden. Bitte öffnen Sie die App manuell.',
      };
    }
  }

  private async openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
    const screenTimeUrls = [
      'App-Prefs:SCREENTIME',
      'App-Prefs:root=SCREENTIME',
      'prefs:root=SCREENTIME',
      'app-settings:',
    ];
    const minutesMsg = minutes
      ? `Bitte vergeben Sie ${minutes} Minuten zusätzliche Zeit für Ihr Kind.`
      : '';

    try {
      const launcher = await getAppLauncher();

      if (launcher) {
        for (const url of screenTimeUrls) {
          try {
            const { value: canOpen } = await launcher.canOpenUrl({ url });
            if (canOpen) {
              await launcher.openUrl({ url });
              return {
                success: true, opened: true, platform: 'ios',
                appName: 'Bildschirmzeit',
                message: `Bildschirmzeit-Einstellungen wurden geöffnet. ${minutesMsg}`.trim(),
              };
            }
          } catch { /* try next */ }
        }
      }

      return {
        success: false, opened: false, platform: 'ios',
        appName: 'Bildschirmzeit',
        message: 'Bildschirmzeit konnte nicht automatisch geöffnet werden. Bitte öffnen Sie: Einstellungen → Bildschirmzeit → [Kind] → App-Limits',
      };
    } catch (error) {
      console.error('Error opening Screen Time settings:', error);
      return {
        success: false, opened: false, platform: 'ios',
        appName: 'Bildschirmzeit',
        message: 'Bitte öffnen Sie manuell: Einstellungen → Bildschirmzeit → [Kind] → App-Limits',
      };
    }
  }

  private getWebInstructions(minutes?: number): OpenParentalControlsResult {
    const minutesText = minutes ? ` ${minutes} Minuten` : '';
    return {
      success: true, opened: false, platform: 'web',
      appName: 'Kindersicherung',
      message: `Um${minutesText} Bildschirmzeit freizugeben, öffnen Sie bitte:\n• Android: Family Link App → [Kind] → Gerätezeit → Heute mehr Zeit\n• iPhone/iPad: Einstellungen → Bildschirmzeit → [Kind] → App-Limits`,
    };
  }

  /**
   * Get platform-specific instructions
   */
  getInstructions(minutes?: number): { android: string; ios: string } {
    const minutesText = minutes ? `${minutes} Minuten` : 'zusätzliche Zeit';
    return {
      android: `Family Link App öffnen → [Kind auswählen] → Gerätezeit → Heute mehr Zeit → ${minutesText} hinzufügen`,
      ios: `Einstellungen → Bildschirmzeit → [Kind auswählen] → App-Limits → ${minutesText} gewähren`
    };
  }
}

export const parentalControlsService = ParentalControlsService.getInstance();
