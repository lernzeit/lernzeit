/*
 * Sperre und Freigabe richtet ein Elternteil auf dem Geraet des Kindes ein
 * (13.10.2026). Frueher standen an mehreren Stellen Meldungen, die nur sagten,
 * was nicht geht („Das geht nur auf einem iPhone oder iPad“, „Family Link
 * ist nicht installiert“, Apples Fehlercodes in Rot). Jetzt steht dort die
 * Loesung, und sie haengt vom Endgeraet ab, auf dem die Meldung steht:
 * iPhone/iPad (App oder Browser), Android (App oder Browser) oder Computer.
 * Seit 14.10.2026 vorne nur ein Satz; die Schritte stehen zum Aufklappen
 * dahinter (components/SoGehtEs.tsx), weil sie nur braucht, wer es noch nicht
 * oder nicht mehr weiss.
 *
 * Reine Funktionen ohne React, damit sie sich testen lassen.
 */
import { erkenneGeraet } from '@/lib/appEmpfehlung';

export interface Endgeraet {
  system: 'ios' | 'android' | 'andere';
  /** In der LernZeit-App (nicht im Browser) */
  nativ: boolean;
}

/** `plattform` ist `Capacitor.getPlatform()`: 'ios', 'android' oder 'web'. */
export function endgeraetVon(plattform: string, ua = '', beruehrungspunkte = 0): Endgeraet {
  if (plattform === 'ios' || plattform === 'android') return { system: plattform, nativ: true };
  return { system: erkenneGeraet(ua, beruehrungspunkte), nativ: false };
}

export const FAMILY_LINK_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.kids.familylink';
export const APPLE_BILDSCHIRMZEIT_URL = 'https://support.apple.com/de-de/HT208982';

export interface Anleitung {
  text: string;
  schritte: string[];
  links: { text: string; url: string }[];
}

const SCHRITTE_LERNZEIT = [
  'In LernZeit: Einstellungen → Bildschirmzeit → „Handy sperren“ und bei Apple bestätigen.',
  '„Was zählt als Handyzeit?“ wählen.',
  'Freiminuten und Ruhezeit stellt das Elternteil auf seinem Handy ein: Kinder → Regeln.',
];

const SCHRITTE_FAMILY_LINK = [
  'Family Link auf dem Handy des Elternteils installieren und dieses Gerät verbinden.',
  'Dort Tageslimit und Schlafenszeit einstellen.',
  'Verdiente Zeit geben: in Family Link „Bonuszeit“ für heute.',
];

/**
 * Karte „Kindersicherung“ in den Einstellungen des Kindes: Wer richtet was
 * wo ein? Immer das Elternteil, immer auf dem Geraet des Kindes.
 */
export function kindGeraetAnleitung(e: Endgeraet): Anleitung {
  // iPhone/iPad (22.10.2026): die LernZeit-Handysperre, Apples Bildschirmzeit nur als letzter Schritt
  if (e.system === 'ios') {
    return {
      text: e.nativ
        ? 'Das richtet ein Elternteil hier in LernZeit ein: unten bei „Handy sperren“.'
        : 'Das richtet ein Elternteil in der LernZeit-App auf diesem iPhone oder iPad ein.',
      schritte: e.nativ ? SCHRITTE_LERNZEIT : ['LernZeit aus dem App Store laden und mit dem Konto des Kindes anmelden.', ...SCHRITTE_LERNZEIT],
      links: [],
    };
  }
  if (e.system === 'android') {
    return {
      text: 'Das richtet ein Elternteil mit Google Family Link ein.',
      schritte: SCHRITTE_FAMILY_LINK,
      links: [{ text: 'Family Link im Play Store', url: FAMILY_LINK_PLAY_URL }],
    };
  }
  return {
    text: 'Das richtet ein Elternteil auf dem Handy oder Tablet des Kindes ein.',
    schritte: [
      'iPhone oder iPad: LernZeit-App auf dem Gerät des Kindes, dort Einstellungen → Bildschirmzeit → „Handy sperren“.',
      'Android: Google Family Link auf dem Handy des Elternteils, dort das Gerät verbinden.',
    ],
    links: [
      { text: 'Family Link im Play Store', url: FAMILY_LINK_PLAY_URL },
    ],
  };
}

export type SperreGrund = 'platform' | 'os-version' | 'entitlement-missing' | 'plugin-missing';

/**
 * Karte „Handy sperren“ (LernZeit-Sperre, nur iPhone/iPad): Warum es auf
 * diesem Geraet nicht geht, steht nicht im Vordergrund. Vorne steht, was das
 * Elternteil tun muss, damit es geht.
 */
export function sperreNichtMoeglich(grund: SperreGrund | undefined, e: Endgeraet): Anleitung {
  if (grund === 'os-version') {
    return {
      text: 'Aktualisiere zuerst iOS: Die Sperre geht ab iOS 16.',
      schritte: ['Einstellungen → Allgemein → Softwareupdate.', 'Danach hier „Handy sperren“ noch einmal öffnen.'],
      links: [],
    };
  }
  if (grund === 'plugin-missing' || grund === 'entitlement-missing') {
    return {
      text: 'Aktualisiere zuerst LernZeit: Diese Fassung kann die Sperre noch nicht.',
      schritte: ['App Store öffnen und LernZeit aktualisieren.', 'Danach hier „Handy sperren“ noch einmal öffnen. Hilft das nicht: info@lernzeit.app.'],
      links: [],
    };
  }
  if (e.system === 'android') {
    return {
      text: 'Auf Android läuft die Sperre über Google Family Link. Ein Elternteil richtet sie dort ein.',
      schritte: SCHRITTE_FAMILY_LINK.slice(0, 2),
      links: [{ text: 'Family Link im Play Store', url: FAMILY_LINK_PLAY_URL }],
    };
  }
  return {
    text: e.system === 'ios'
      ? 'Die Sperre richtet ein Elternteil in der LernZeit-App auf diesem iPhone oder iPad ein.'
      : 'Die Sperre gilt für das Handy des Kindes. Ein Elternteil richtet sie in der LernZeit-App auf dem iPhone oder iPad des Kindes ein.',
    schritte: [
      'LernZeit aus dem App Store laden und mit dem Konto des Kindes anmelden.',
      'Dann in LernZeit: Einstellungen → Bildschirmzeit → „Handy sperren“.',
    ],
    links: [],
  };
}

/**
 * Apples Grund, warum die Zustimmung nicht klappte, als Schritt fuer das
 * Elternteil. Die Namen sind die Faelle von `FamilyControlsError`.
 */
export function appleAblehnung(grund: string): string {
  if (grund.includes('invalidAccountType')) {
    return 'Apple erlaubt die Sperre nur auf dem Gerät eines Kindes in der Familienfreigabe. Das Elternteil legt für das Kind ein Kinderkonto an (Einstellungen → Familie) und meldet es auf diesem Gerät damit an.';
  }
  if (grund.includes('authorizationCanceled')) {
    return 'Tippe noch einmal auf „Sperre einrichten“. Das Elternteil bestätigt dann bei Apple.';
  }
  if (grund.includes('authorizationConflict')) {
    return 'Eine andere App verwaltet hier schon die Bildschirmzeit. Das Elternteil beendet das dort oder löscht die App und versucht es noch einmal.';
  }
  if (grund.includes('restricted')) {
    return 'Ein Verwaltungsprofil schränkt die Bildschirmzeit ein. Das Elternteil entfernt es unter Einstellungen → Allgemein → VPN & Geräteverwaltung.';
  }
  if (grund.includes('authenticationMethodUnavailable')) {
    return 'Richte zuerst einen Gerätecode ein (Einstellungen → Face ID & Code, am iPad Touch ID & Code) und versuche es dann noch einmal.';
  }
  if (grund.includes('networkError')) return 'Verbinde das Gerät mit dem Internet und versuche es noch einmal.';
  if (grund.includes('unavailable')) {
    return 'Aktualisiere LernZeit im App Store und versuche es noch einmal. Hilft das nicht, schreib an info@lernzeit.app.';
  }
  return 'Versuche es noch einmal. Hilft das nicht, schreib an info@lernzeit.app und nenne den Text darunter.';
}

/**
 * Eltern-Geraet: Wo wird die genehmigte Zeit freigegeben? `kurz` steht
 * sichtbar, `schritte` zum Aufklappen (fuer alle, die es nicht mehr wissen).
 */
export function freigabeWeg(kind: 'ios' | 'android', name: string, lernzeitSperre = false): { kurz: string; schritte: string[] } {
  // iPhone (22.10.2026): Mit der LernZeit-Handysperre gibt LernZeit die Zeit
  // selbst frei. Sonst steht die Einrichtung vorne, Apples Weg nur zuletzt.
  if (kind === 'ios' && lernzeitSperre) {
    return { kurz: `LernZeit gibt die Zeit auf dem iPhone von ${name} frei.`, schritte: [] };
  }
  if (kind === 'ios') {
    return {
      kurz: 'Mit der LernZeit-Handysperre gibt LernZeit genehmigte Zeit selbst frei.',
      schritte: [
        `Auf dem iPhone von ${name} in LernZeit: Einstellungen → Bildschirmzeit → „Handy sperren“.`,
        'Ist „Handy sperren“ dort nicht zu sehen: LernZeit im App Store aktualisieren.',
        `Bis dahin: am iPhone von ${name} bei „Mehr Zeit anfragen“ deinen Bildschirmzeit-Code eingeben.`,
      ],
    };
  }
  return {
    kurz: 'Die Zeit gibst du in Google Family Link frei.',
    schritte: [
      `Family Link öffnen und ${name} wählen.`,
      '„Bonuszeit“ antippen und die Minuten für heute eintragen.',
      'Family Link gibt es als App für Android und iPhone.',
    ],
  };
}

/** Fuer Meldungen nach einem Fehler: erst der naechste Schritt, der Rohtext zuletzt (hilft dem Support). */
export function nachFehler(e: unknown): string {
  return `Versuche es noch einmal. Hilft das nicht, schließe LernZeit und öffne sie neu oder schreib an info@lernzeit.app. (${String(e)})`;
}
