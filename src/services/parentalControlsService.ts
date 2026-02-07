import { Capacitor } from '@capacitor/core';

export type Platform = 'android' | 'ios' | 'web';

export interface OpenParentalControlsResult {
  success: boolean;
  opened: boolean;
  platform: Platform;
  appName: string;
  message: string;
}

/**
 * Service to handle opening parental control apps (Family Link on Android, Screen Time on iOS)
 */
class ParentalControlsService {
  private static instance: ParentalControlsService;

  public static getInstance(): ParentalControlsService {
    if (!ParentalControlsService.instance) {
      ParentalControlsService.instance = new ParentalControlsService();
    }
    return ParentalControlsService.instance;
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    if (!Capacitor.isNativePlatform()) return 'web';
    return Capacitor.getPlatform() as Platform;
  }

  /**
   * Check if running on a native platform (Android or iOS)
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get the name of the parental control app for the current platform
   */
  getParentalControlAppName(): string {
    const platform = this.getPlatform();
    switch (platform) {
      case 'android':
        return 'Family Link';
      case 'ios':
        return 'Bildschirmzeit';
      default:
        return 'Kindersicherung';
    }
  }

  /**
   * Try to open the parental control app
   * 
   * Android: Opens Family Link app or Play Store if not installed
   * iOS: Opens Screen Time settings directly
   * Web: Returns instructions
   */
  async openParentalControlApp(minutes?: number): Promise<OpenParentalControlsResult> {
    const platform = this.getPlatform();
    
    switch (platform) {
      case 'android':
        return this.openFamilyLink(minutes);
      case 'ios':
        return this.openScreenTimeSettings(minutes);
      default:
        return this.getWebInstructions(minutes);
    }
  }

  /**
   * Open Google Family Link app on Android
   */
  private async openFamilyLink(minutes?: number): Promise<OpenParentalControlsResult> {
    const familyLinkPackage = 'com.google.android.apps.kids.familylink';
    
    // Primary deep link to Family Link
    // Unfortunately, Family Link doesn't have a documented deep link to pass minutes
    // But we can open the app directly
    const familyLinkDeepLink = `familylink://`;
    const familyLinkIntent = `intent://com.google.android.apps.kids.familylink#Intent;scheme=android-app;package=${familyLinkPackage};end`;
    const playStoreLink = `https://play.google.com/store/apps/details?id=${familyLinkPackage}`;
    
    try {
      // Try to open Family Link app directly
      const opened = await this.tryOpenUrl(familyLinkDeepLink);
      
      if (opened) {
        return {
          success: true,
          opened: true,
          platform: 'android',
          appName: 'Family Link',
          message: minutes 
            ? `Family Link wurde geöffnet. Bitte vergeben Sie ${minutes} Minuten zusätzliche Bildschirmzeit für Ihr Kind.`
            : 'Family Link wurde geöffnet.'
        };
      }
      
      // Fallback: Try intent URL
      const intentOpened = await this.tryOpenUrl(familyLinkIntent);
      if (intentOpened) {
        return {
          success: true,
          opened: true,
          platform: 'android',
          appName: 'Family Link',
          message: minutes 
            ? `Family Link wurde geöffnet. Bitte vergeben Sie ${minutes} Minuten zusätzliche Bildschirmzeit.`
            : 'Family Link wurde geöffnet.'
        };
      }
      
      // Last fallback: Open Play Store to install Family Link
      await this.tryOpenUrl(playStoreLink);
      return {
        success: true,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: 'Family Link ist nicht installiert. Der Play Store wurde geöffnet, damit Sie die App installieren können.'
      };
      
    } catch (error) {
      console.error('Error opening Family Link:', error);
      return {
        success: false,
        opened: false,
        platform: 'android',
        appName: 'Family Link',
        message: 'Family Link konnte nicht geöffnet werden. Bitte öffnen Sie die App manuell.'
      };
    }
  }

  /**
   * Open Screen Time settings on iOS
   */
  private async openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
    // iOS Screen Time deep links
    // Note: App-Prefs URLs require specific entitlements, but we can try
    const screenTimeUrls = [
      'App-Prefs:SCREENTIME',
      'App-Prefs:root=SCREENTIME',
      'prefs:root=SCREENTIME',
      'app-settings:' // Fallback to app settings
    ];
    
    try {
      for (const url of screenTimeUrls) {
        const opened = await this.tryOpenUrl(url);
        if (opened) {
          return {
            success: true,
            opened: true,
            platform: 'ios',
            appName: 'Bildschirmzeit',
            message: minutes 
              ? `Bildschirmzeit-Einstellungen wurden geöffnet. Bitte vergeben Sie ${minutes} Minuten zusätzliche Zeit für Ihr Kind.`
              : 'Bildschirmzeit-Einstellungen wurden geöffnet.'
          };
        }
      }
      
      return {
        success: false,
        opened: false,
        platform: 'ios',
        appName: 'Bildschirmzeit',
        message: 'Bildschirmzeit konnte nicht automatisch geöffnet werden. Bitte öffnen Sie: Einstellungen → Bildschirmzeit → [Kind] → App-Limits'
      };
      
    } catch (error) {
      console.error('Error opening Screen Time settings:', error);
      return {
        success: false,
        opened: false,
        platform: 'ios',
        appName: 'Bildschirmzeit',
        message: 'Bitte öffnen Sie manuell: Einstellungen → Bildschirmzeit → [Kind] → App-Limits'
      };
    }
  }

  /**
   * Return instructions for web users
   */
  private getWebInstructions(minutes?: number): OpenParentalControlsResult {
    const minutesText = minutes ? ` ${minutes} Minuten` : '';
    return {
      success: true,
      opened: false,
      platform: 'web',
      appName: 'Kindersicherung',
      message: `Um${minutesText} Bildschirmzeit freizugeben, öffnen Sie bitte:\n• Android: Family Link App → [Kind] → Gerätezeit → Heute mehr Zeit\n• iPhone/iPad: Einstellungen → Bildschirmzeit → [Kind] → App-Limits`
    };
  }

  /**
   * Try to open a URL using Capacitor's native capabilities
   */
  private async tryOpenUrl(url: string): Promise<boolean> {
    try {
      // Use window.open as a fallback that works across platforms
      // On native platforms, Capacitor will handle the URL scheme
      const newWindow = window.open(url, '_system');
      
      // On native platforms, window.open returns null but might still work
      // We need to check if the app is in background after a short delay
      if (Capacitor.isNativePlatform()) {
        // Give the OS time to process the deep link
        await new Promise(resolve => setTimeout(resolve, 500));
        return true; // Assume success on native, the OS will handle it
      }
      
      return newWindow !== null;
    } catch (error) {
      console.error('Error trying to open URL:', url, error);
      return false;
    }
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
