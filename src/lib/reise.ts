/*
 * Kleckis Heftrand-Reise (11.10.2026): eine Reise fuer alle Faecher.
 *
 * Vergeben wird nur auf dem Server (runde_belohnen in
 * supabase/migrations/20261011200000_klecksi_reise.sql). Hier steht, was die
 * App zum Anzeigen braucht. Regeln, damit Kinder- und Elternansicht sie gleich
 * erklaeren:
 *   - Jede geschaffte Runde (ab 60 % richtig) malt ein Feld in der Heftfarbe
 *     des Fachs aus; Lernplan und Schwerpunkt-Fach zwei Felder.
 *   - 12 Felder je Seite; hoechstens 24 Felder am Tag.
 *   - Tinte: 1 je richtige Aufgabe (Berichtigung 2), alles richtig +5,
 *     Seite fertig +30, bunte Seite (3 Faecher) +20.
 *   - Am Seitenende faltet Klecksi etwas aus Papier fuer das Regal; jede Figur
 *     hat eine Anleitung zum Nachfalten (lib/falten.ts).
 */

export const FELDER_JE_SEITE = 12;
export const BUNT_AB_FAECHERN = 3;

export type ReiseQuelle = 'runde' | 'lernplan' | 'schwerpunkt' | 'berichtigung';

export interface ReiseFeld {
  seite: number;
  feld: number;
  fach: string;
  quelle: ReiseQuelle;
}

/** Reihenfolge muss zu v_faltungen in runde_belohnen passen. */
export const FALTUNGEN = [
  'papierflieger', 'hund', 'becher', 'hut', 'papierschiff', 'katze', 'himmel_hoelle', 'tulpe',
] as const;
export type Faltung = (typeof FALTUNGEN)[number];

export const FALTUNG_NAME: Record<Faltung, string> = {
  papierflieger: 'Papierflieger',
  hund: 'Hund',
  becher: 'Becher',
  hut: 'Papierhut',
  papierschiff: 'Papierschiff',
  katze: 'Katze',
  himmel_hoelle: 'Himmel & Hölle',
  tulpe: 'Tulpe',
};

export interface ReiseSeite {
  seite: number;
  faltung: Faltung;
  bunt: boolean;
  bonus_minuten: number;
  fertig_am: string;
}

export interface SeiteFertig {
  seite: number;
  faltung: Faltung;
  bunt: boolean;
  bonus_minuten: number;
}

/** Antwort von runde_belohnen */
export interface RundenBelohnung {
  tinte: number;
  stand: number;
  geschafft: boolean;
  quelle: ReiseQuelle | null;
  felder: ReiseFeld[];
  seite_fertig: SeiteFertig | null;
}

export const faltungFuer = (seite: number): Faltung =>
  FALTUNGEN[(Math.max(1, seite) - 1) % FALTUNGEN.length];

export const istDoppelt = (quelle: ReiseQuelle) => quelle === 'lernplan' || quelle === 'schwerpunkt';

/** Die Seite, auf der Klecksi gerade steht: letzte Seite, oder die naechste, wenn sie voll ist. */
export function aktuelleSeite(felder: ReiseFeld[]): { seite: number; felder: ReiseFeld[] } {
  if (felder.length === 0) return { seite: 1, felder: [] };
  const letzte = Math.max(...felder.map((f) => f.seite));
  const aufLetzter = felder.filter((f) => f.seite === letzte).sort((a, b) => a.feld - b.feld);
  if (aufLetzter.length >= FELDER_JE_SEITE) return { seite: letzte + 1, felder: [] };
  return { seite: letzte, felder: aufLetzter };
}

/** Faecher auf einer Seite, das haeufigste zuerst */
export function faecherAufSeite(felder: ReiseFeld[]): { fach: string; anzahl: number }[] {
  const zaehler = new Map<string, number>();
  for (const f of felder) zaehler.set(f.fach, (zaehler.get(f.fach) ?? 0) + 1);
  return [...zaehler.entries()]
    .map(([fach, anzahl]) => ({ fach, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.fach.localeCompare(b.fach));
}

/** Kurzer Satz zum Ergebnis einer Runde (Rundenende) */
export function belohnungsText(b: RundenBelohnung): string {
  const n = b.felder.length;
  if (b.seite_fertig) return `Seite ${b.seite_fertig.seite} fertig!`;
  if (n === 0) return b.geschafft ? 'Für heute ist die Reise voll.' : 'Ab 3 richtigen malt Klecksi ein Feld.';
  if (n === 2) return b.quelle === 'lernplan' ? 'Lernplan: 2 Felder!' : 'Schwerpunkt: 2 Felder!';
  return '1 Feld ausgemalt';
}
