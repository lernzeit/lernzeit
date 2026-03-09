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
    const packageName = 'com.google.android.apps.kids.familylink';
    const intentUri = `intent://#Intent;package=${packageName};scheme=familylink;end`;
    const playStoreLink = `https://play.google.com/store/apps/details?id=${packageName}`;
    const marketUri = `market://details?id=${packageName}`;
    const minutesMsg = minutes
      ? `Bitte vergeben Sie ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind.`
      : '';

    try {
      const launcher = await getAppLauncher();

      if (launcher) {
        // Try multiple approaches to open Family Link
        const urlsToTry = [
          `familylink://`,                    // URI scheme
          intentUri,                           // Intent URI
          packageName,                         // Package name (legacy)
        ];

        for (const url of urlsToTry) {
          try {
            const { value: canOpen } = await launcher.canOpenUrl({ url });
            if (canOpen) {
              await launcher.openUrl({ url });
              return {
                success: true, opened: true, platform: 'android',
                appName: 'Family Link',
                message: `Family Link wurde geöffnet. ${minutesMsg}`.trim(),
              };
            }
          } catch (e) {
            console.warn(`Failed to open Family Link with ${url}:`, e);
          }
        }

        // Not installed or not queryable – open Play Store via market URI first, then HTTPS
        for (const storeUrl of [marketUri, playStoreLink]) {
          try {
            await launcher.openUrl({ url: storeUrl });
            return {
              success: true, opened: false, platform: 'android',
              appName: 'Family Link',
              message: 'Family Link konnte nicht direkt geöffnet werden. Der Play Store wurde geöffnet.',
            };
          } catch { /* try next */ }
        }
      }

      // Fallback without AppLauncher plugin
      window.open(playStoreLink, '_system');
      return {
        success: true, opened: false, platform: 'android',
        appName: 'Family Link',
        message: 'Family Link konnte nicht direkt geöffnet werden. Bitte öffnen Sie die App manuell.',
      };
    } catch (error) {
      console.error('Error opening Family Link:', error);
      return {
        success: false, opened: false, platform: 'android',
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
