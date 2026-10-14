import { Capacitor } from '@capacitor/core';
import { openFamilyLink, isFamilyLinkInstalled, openFamilyLinkInstall } from './parentalControls/android';
import { openScreenTimeSettings } from './parentalControls/ios';
import { openFamilyLinkIos } from './parentalControls/familyLinkIos';
import { getWebInstructions } from './parentalControls/web';
import type { OpenParentalControlsResult, Platform } from './parentalControls/types';
import { freigabeWeg } from '@/lib/geraeteAnleitung';

export type { Platform, OpenParentalControlsResult };

/** Plattform des Kindes (Web zählt als „unbekannt" für Absprünge). */
export type ChildPlatform = 'android' | 'ios';

export type ParentalControlTargetKind = 'family_link' | 'screen_time' | 'unsupported' | 'manual';

export interface ParentalControlTarget {
  kind: ParentalControlTargetKind;
  /** Name der Ziel-App, z.B. „Family Link" oder „Bildschirmzeit". */
  appName: string;
  /** Beschriftung für den Absprung-Button (nur wenn canOpen === true). */
  buttonLabel: string;
  /** Ein kurzer Satz (sichtbar). */
  hint: string;
  /** Schritte zum Aufklappen („So gibst du die Zeit frei“). */
  schritte: string[];
  /** Ob ein Absprung technisch möglich ist. */
  canOpen: boolean;
}

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

  /* ---------------- kindzentrierte Logik ---------------- */

  /**
   * Das Ziel ergibt sich aus der Plattform des KINDES,
   * die Plattform des Elternteils entscheidet nur, ob ein Absprung möglich ist.
   */
  getTargetForChild(childPlatform: ChildPlatform | null, childName = 'dein Kind'): ParentalControlTarget {
    const parent = this.getPlatform();
    const native = this.isNativePlatform();

    if (!childPlatform) {
      return {
        kind: 'manual',
        appName: 'Kindersicherung',
        buttonLabel: 'Gerät des Kindes angeben',
        hint: `Wir wissen noch nicht, welches Gerät ${childName} nutzt.`,
        schritte: [],
        canOpen: false,
      };
    }

    // Kurzer Satz sichtbar, die Schritte zum Aufklappen (lib/geraeteAnleitung.ts)
    const weg = freigabeWeg(childPlatform, childName);

    if (childPlatform === 'ios') {
      // Absprung über einen nicht dokumentierten Link — siehe parentalControls/ios.ts.
      if (native && parent === 'ios') {
        return {
          kind: 'screen_time',
          appName: 'Bildschirmzeit',
          buttonLabel: 'Bildschirmzeit öffnen',
          hint: weg.kurz,
          schritte: weg.schritte,
          canOpen: true,
        };
      }
      return {
        kind: 'unsupported',
        appName: 'Bildschirmzeit',
        buttonLabel: '',
        hint: weg.kurz,
        schritte: weg.schritte,
        canOpen: false,
      };
    }

    // Kind Android → Family Link (Elternapp gibt es für Android und iOS)
    return {
      kind: 'family_link',
      appName: 'Family Link',
      buttonLabel: native ? 'Family Link öffnen' : '',
      hint: weg.kurz,
      schritte: weg.schritte,
      canOpen: native && (parent === 'android' || parent === 'ios'),
    };
  }

  /** Öffnet das für die Plattform des Kindes passende Ziel. */
  async openForChild(childPlatform: ChildPlatform | null, minutes?: number): Promise<OpenParentalControlsResult> {
    const target = this.getTargetForChild(childPlatform);
    if (!target.canOpen) {
      return {
        success: false,
        opened: false,
        platform: this.getPlatform(),
        appName: target.appName,
        message: target.hint,
      };
    }
    if (target.kind === 'screen_time') return openScreenTimeSettings(minutes);
    // Family Link: Elternteil Android → Play-Store-Fallback, Elternteil iOS → App-Store-Fallback
    return this.getPlatform() === 'ios' ? openFamilyLinkIos(minutes) : openFamilyLink(minutes);
  }

  /** Für Tracking: z.B. 'child_ios_parent_android'. Enthält keine personenbezogenen Daten. */
  getPlatformCombo(childPlatform: ChildPlatform | null): string {
    return `child_${childPlatform ?? 'unknown'}_parent_${this.getPlatform()}`;
  }
}

export const parentalControlsService = ParentalControlsService.getInstance();