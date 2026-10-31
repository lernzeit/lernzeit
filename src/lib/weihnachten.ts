/*
 * Weihnachtszeit und Adventskalender (11.10.2026).
 *
 * Weihnachtszeit: jedes Jahr 1. bis 26. Dezember (Berliner Zeit). Dann tragen
 * Klecksi und die Begruessung Weihnachtliches, die Weihnachts-Sticker und
 * -Figuren sind zu haben, und auf dem Kind-Start haengt der Adventskalender
 * (verpasste Tuerchen bis 26.12. nachholen). Ab 27.12. ist alles wieder weg;
 * was ein Kind sich geholt hat, bleibt.
 *
 * Adventskalender: je Tuerchen 5 Aufgaben aus zufaelligen Faechern, ab 4
 * richtigen geht es auf. Seit 01.11.2026 gemischte Ueberraschungen (ADVENT_PLAN):
 * Sticker, Weihnachts-Figuren, Tinte und ein paar Frei-Minuten (je 5). Die
 * Runde selbst bringt keine Zeit, keine Tinte, keine Reise.
 * Gleiche Regeln in der Datenbank: advent_runde() und advent_ueberraschung() in
 * supabase/migrations/20261011230000_weihnachten_advent.sql und
 * 20261101100000_advent_ueberraschungen.sql.
 */

export const ADVENT_AUFGABEN = 5;
export const ADVENT_RICHTIG = 4;
/** Kurz und eher leicht: zum Ueben, nicht zum Pruefen */
export const ADVENT_SCHWIERIGKEIT: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'easy', 'medium', 'easy'];

/** Datum in Berlin als Jahr, Monat (1–12), Tag */
export function berlinerTag(jetzt: Date = new Date()): { jahr: number; monat: number; tag: number } {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(jetzt).split('-').map(Number);
  return { jahr: teile[0], monat: teile[1], tag: teile[2] };
}

export function istWeihnachtszeit(jetzt: Date = new Date()): boolean {
  const { monat, tag } = berlinerTag(jetzt);
  return monat === 12 && tag <= 26;
}

/** Hoechstes Tuerchen, das heute offen sein darf (0 = kein Kalender). Wie advent_offen_bis(). */
export function adventOffenBis(jetzt: Date = new Date()): number {
  const { monat, tag } = berlinerTag(jetzt);
  return monat === 12 && tag <= 26 ? Math.min(tag, 24) : 0;
}

/** Jahr des Kalenders. Wie advent_jahr(). */
export function adventJahr(jetzt: Date = new Date()): number {
  const { jahr, monat } = berlinerTag(jetzt);
  return monat === 1 ? jahr - 1 : jahr;
}

/** Tage bis Heiligabend, nur im Dezember davor */
export function tageBisHeiligabend(jetzt: Date = new Date()): number | null {
  const { monat, tag } = berlinerTag(jetzt);
  return monat === 12 && tag < 24 ? 24 - tag : null;
}

export type AdventArt = 'sticker' | 'avatar' | 'tinte' | 'minuten';
export interface AdventUeberraschung { art: AdventArt; ding?: string; menge?: number }

/**
 * Was hinter jedem Tuerchen steckt (Index = Tuerchen − 1). Wie advent_ueberraschung().
 * 10 Sticker, 5 Figuren (6. Nikolaus, 24. Heiligabend), 6 × Tinte (300), 3 × 5 Frei-Minuten.
 */
export const ADVENT_PLAN: AdventUeberraschung[] = [
  { art: 'sticker', ding: 'schneeflocke' },
  { art: 'tinte', menge: 30 },
  { art: 'sticker', ding: 'plaetzchen' },
  { art: 'minuten', menge: 5 },
  { art: 'sticker', ding: 'kerze' },
  { art: 'avatar', ding: 'weihnachtsmann' },
  { art: 'tinte', menge: 40 },
  { art: 'sticker', ding: 'socke' },
  { art: 'avatar', ding: 'rentier' },
  { art: 'sticker', ding: 'glocke' },
  { art: 'minuten', menge: 5 },
  { art: 'tinte', menge: 50 },
  { art: 'sticker', ding: 'schleife' },
  { art: 'avatar', ding: 'schneemann' },
  { art: 'tinte', menge: 40 },
  { art: 'sticker', ding: 'bonbon' },
  { art: 'minuten', menge: 5 },
  { art: 'sticker', ding: 'engel' },
  { art: 'tinte', menge: 60 },
  { art: 'avatar', ding: 'elf' },
  { art: 'sticker', ding: 'schlitten' },
  { art: 'tinte', menge: 80 },
  { art: 'sticker', ding: 'weihnachtsbaum' },
  { art: 'avatar', ding: 'tannenbaum' },
];

/** Ersatz, wenn ein Kind die Figur hinter einem Tuerchen schon hat (wie in der Datenbank) */
export const ADVENT_ERSATZ_TINTE = 50;

export const adventUeberraschung = (tuer: number): AdventUeberraschung => ADVENT_PLAN[Math.min(24, Math.max(1, tuer)) - 1];

/** 5 Faecher fuer ein Tuerchen: gemischt, jedes Fach kommt dran, bevor sich eines wiederholt */
export function adventFaecher(auswahl: string[], zufall: () => number = Math.random): string[] {
  const quelle = auswahl.length ? auswahl : ['math'];
  const ergebnis: string[] = [];
  while (ergebnis.length < ADVENT_AUFGABEN) {
    const runde = [...quelle];
    for (let i = runde.length - 1; i > 0; i--) {
      const j = Math.floor(zufall() * (i + 1));
      [runde[i], runde[j]] = [runde[j], runde[i]];
    }
    // nicht zweimal dasselbe Fach hintereinander an der Rundengrenze
    if (ergebnis.length && runde.length > 1 && runde[0] === ergebnis[ergebnis.length - 1]) {
      [runde[0], runde[1]] = [runde[1], runde[0]];
    }
    ergebnis.push(...runde);
  }
  return ergebnis.slice(0, ADVENT_AUFGABEN);
}

/** Antwort von advent_runde() */
export interface AdventErgebnis {
  ok: boolean;
  grund?: 'anmelden' | 'unbekannt' | 'nur_kinder' | 'noch_zu';
  offen?: boolean;
  schon?: boolean;
  tag?: number;
  richtig?: number;
  art?: AdventArt;
  sticker?: string | null;
  avatar?: string | null;
  /** Tinte oder Frei-Minuten */
  menge?: number | null;
  /** Figur schon vorhanden: Tinte statt Figur */
  ersatz?: boolean;
}
