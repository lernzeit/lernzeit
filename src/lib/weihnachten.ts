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
 * richtigen geht es auf (Weihnachts-Sticker, Tuerchen 6 und 24 auch eine
 * Figur). Sonst keine Belohnung: keine Zeit, keine Tinte, keine Reise.
 * Gleiche Regeln in der Datenbank: advent_runde() in
 * supabase/migrations/20261011230000_weihnachten_advent.sql.
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

/** Sticker hinter einem Tuerchen. Reihenfolge wie advent_sticker(). */
export const ADVENT_STICKER = [
  'schneeflocke', 'plaetzchen', 'kerze', 'socke', 'glocke', 'weihnachtsmann',
  'rentier', 'schleife', 'bonbon', 'engel', 'schlitten', 'weihnachtsbaum',
] as const;

export const adventSticker = (tuer: number): string => ADVENT_STICKER[(Math.max(1, tuer) - 1) % ADVENT_STICKER.length];

/** Figur hinter einem Tuerchen (Nikolaus und Heiligabend). Wie advent_avatar(). */
export const adventAvatar = (tuer: number): string | null =>
  tuer === 6 ? 'weihnachtsmann' : tuer === 24 ? 'tannenbaum' : null;

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
  sticker?: string;
  avatar?: string | null;
}
