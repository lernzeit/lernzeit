import { Capacitor } from '@capacitor/core';
import { openFamilyLink, isFamilyLinkInstalled, openFamilyLinkInstall } from './parentalControls/android';
import { openScreenTimeSettings } from './parentalControls/ios';
import { getWebInstructions } from './parentalControls/web';
import type { OpenParentalControlsResult, Platform } from './parentalControls/types';

export type { Platform, OpenParentalControlsResult };

/**
 * Facade for opening native parental control apps (Family Link / Screen Time).
 * Platform-specific logic lives in ./parentalControls/{android,ios,web}.ts.
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
    switch (this.getPlatform()) {
      case 'android': return 'Family Link';
      case 'ios': return 'Bildschirmzeit';
      default: return 'Kindersicherung';
    }
  }

  async openParentalControlApp(minutes?: number): Promise<OpenParentalControlsResult> {
    switch (this.getPlatform()) {
      case 'android': return openFamilyLink(minutes);
      case 'ios': return openScreenTimeSettings(minutes);
      default: return getWebInstructions(minutes);
    }
  }

  /** Android only: check if Family Link app is installed (without launching it). */
  async isParentalControlAppInstalled(): Promise<boolean> {
    if (this.getPlatform() !== 'android') return true;
    return isFamilyLinkInstalled();
  }

  /** Android only: open Play Store to install Family Link. */
  async openInstallParentalControlApp(): Promise<void> {
    if (this.getPlatform() === 'android') {
      await openFamilyLinkInstall();
    }
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