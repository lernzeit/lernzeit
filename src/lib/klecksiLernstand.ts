/*
 * Klecksi als Anzeige fuer die Lerntage in Folge (11.10.2026, ersetzt die
 * Lernpflanze). Das Bild: Jeden Tag faellt ein Tropfen Tinte auf den Klecks,
 * er waechst und glaenzt. Kommt keine Tinte dazu, wird er kleiner und blasser
 * und trocknet aus. Ein trockener Klecksi leidet nicht, er ruht wie ein
 * eingetrockneter Tintenklecks und ist oben auf dem Start nicht aktiv. Eine
 * Runde, und er ist wieder farbig.
 *
 * Rechnung (Tage, Pausentage) unveraendert aus useStreak/lib/streak.ts:
 * 1 Tag Pause = blass, 2 Tage = trocknet (die Kette laesst sich noch retten),
 * ab 3 Tagen = trocken, Kette bei 0.
 */

/** 0 = Start (0–2 Tage), 1 = ab 3, 2 = ab 7, 3 = ab 14, 4 = ab 30 Tagen */
export type Groesse = 0 | 1 | 2 | 3 | 4;
export type Frische = 'frisch' | 'blass' | 'trocknet' | 'trocken';

export interface LernStand {
  stufe: Groesse;
  frische: Frische;
}

/** `tropfen`: Name ohne Klecksi (aeltere Kinder sehen statt der Figur einen Tintentropfen) */
export const KLECKS_STUFEN: { stufe: Groesse; ab: number; name: string; tropfen: string }[] = [
  { stufe: 0, ab: 0, name: 'Kleiner Klecks', tropfen: 'Kleiner Tropfen' },
  { stufe: 1, ab: 3, name: 'Klecks', tropfen: 'Tropfen' },
  { stufe: 2, ab: 7, name: 'Großer Klecks', tropfen: 'Großer Tropfen' },
  { stufe: 3, ab: 14, name: 'Glänzender Klecks', tropfen: 'Glänzender Tropfen' },
  { stufe: 4, ab: 30, name: 'Strahlender Klecks', tropfen: 'Strahlender Tropfen' },
];

/** Groesse nach Stufe (1 = Klecksi wie bisher) und Faktor nach Frische */
export const MASSSTAB: Record<Groesse, number> = { 0: 0.66, 1: 0.78, 2: 0.88, 3: 1, 4: 1.1 };
export const FRISCHE_FAKTOR: Record<Frische, number> = { frisch: 1, blass: 0.94, trocknet: 0.88, trocken: 0.85 };

export const stufeFuer = (tage: number): Groesse =>
  ([...KLECKS_STUFEN].reverse().find((s) => tage >= s.ab) ?? KLECKS_STUFEN[0]).stufe;

export const stufeName = (stufe: Groesse, mitKlecksi = true) =>
  mitKlecksi ? KLECKS_STUFEN[stufe].name : KLECKS_STUFEN[stufe].tropfen;

/** Naechste Stufe, die noch kommt (oder undefined bei der hoechsten) */
export const naechsteStufe = (tage: number) => KLECKS_STUFEN.find((s) => s.ab > tage);

/**
 * Wie Klecksi gerade aussieht.
 * @param streak Tage in Folge (wie angezeigt: nach 3 Tagen Pause schon 0)
 * @param inaktiveTage Tage seit dem letzten Lerntag (0 = heute gelernt)
 * @param hatGelernt false = noch nie eine Runde (frischer Klecksi, kein trockener)
 */
export function lernStand(streak: number, inaktiveTage: number, hatGelernt = true): LernStand {
  if (!hatGelernt) return { stufe: 0, frische: 'frisch' };
  if (inaktiveTage >= 3) return { stufe: 0, frische: 'trocken' };
  const frische: Frische = inaktiveTage === 0 ? 'frisch' : inaktiveTage === 1 ? 'blass' : 'trocknet';
  return { stufe: stufeFuer(Math.max(0, streak)), frische };
}

/** Passiv: trocknet oder trocken, Klecksi bewegt sich nicht und gruesst nicht */
export const istPassiv = (s: LernStand) => s.frische === 'trocknet' || s.frische === 'trocken';

/** Retten laesst sich die Kette bei 1–2 Tagen Pause (eine Runde, keine Minuten) */
export const istRettbar = (streak: number, inaktiveTage: number) => inaktiveTage > 0 && inaktiveTage <= 2 && streak > 0;

/** Sichtbarer Massstab */
export const massstab = (s: LernStand) => MASSSTAB[s.stufe] * FRISCHE_FAKTOR[s.frische];

/** Ueberschrift fuer Dialog, freundlich und ohne Leid */
export function stufenTitel(s: LernStand, tage: number, mitKlecksi = true): string {
  const er = mitKlecksi ? 'Klecksi' : 'Der Tropfen';
  if (s.frische === 'blass') return `${er} wird blass`;
  if (s.frische === 'trocknet') return `${er} trocknet`;
  if (s.frische === 'trocken') return `${er} ist eingetrocknet`;
  return tage === 0 ? `${er} wartet auf Tinte` : stufeName(s.stufe, mitKlecksi);
}

/** Kurzer Satz unter der Zahl (Kachel). Ohne Klecksi sachlich, ohne Figur. */
export function stufenSatz(s: LernStand, tage: number, mitKlecksi = true): string {
  const er = mitKlecksi ? 'Klecksi' : 'Der Tropfen';
  if (s.frische === 'blass') return `${er} wird blass`;
  if (s.frische === 'trocknet') return `${er} trocknet`;
  if (s.frische === 'trocken') return `${er} ruht, bis du lernst`;
  if (tage === 0) return mitKlecksi ? 'Lern heute, dann bekommt Klecksi Tinte' : 'Lern heute, dann wächst der Tropfen';
  return 'in Folge gelernt';
}

/** Erklaerung im Dialog: was gerade los ist und was ihm hilft */
export function stufenErklaerung(s: LernStand, tage: number, mitKlecksi = true): string {
  const er = mitKlecksi ? 'Klecksi' : 'Der Tropfen';
  if (s.frische === 'blass') return `Heute gab es noch keine Tinte. ${er} wird blass.`;
  if (s.frische === 'trocknet') return `Zwei Tage ohne Tinte: ${er} trocknet langsam aus.`;
  if (s.frische === 'trocken') {
    return mitKlecksi
      ? 'Klecksi ruht wie ein eingetrockneter Klecks. Eine Runde, und er ist wieder farbig.'
      : 'Der Tropfen ist eingetrocknet. Eine Runde, und er ist wieder farbig.';
  }
  if (tage === 0) return mitKlecksi ? 'Lern heute eine Runde, dann bekommt Klecksi Tinte.' : 'Lern heute eine Runde, dann wächst der Tropfen.';
  return `Du hast ${tage} ${tage === 1 ? 'Tag' : 'Tage'} hintereinander gelernt.`;
}
