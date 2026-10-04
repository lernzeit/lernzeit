/**
 * Regeln fuer den KI-Lernplan (Entscheidung des Betreibers 04.10.2026).
 *
 * - Laenge: hoechstens 5 Tage. Mit Testdatum so viele Tage, wie bis zum Test
 *   bleiben (Test morgen → 1 Tag). Vorher hatte jeder Plan 5 Tage; bei einem
 *   frueheren Test verschwand er aber am Testtag, die letzten Tage sah das Kind
 *   nie.
 * - Fach: muss nicht abgefragt werden. Erst ein Stichwort-Abgleich (kostenlos),
 *   sonst entscheidet die KI (Fotos oder kurze Einordnung), sonst fragt die App.
 *
 * Rein rechnerisch, ohne Abhaengigkeiten, damit testbar.
 */

export const TAGE_HOECHSTENS = 5;

/** Kalendertag in deutscher Zeit, z. B. "2026-10-04". */
export function heuteInDeutschland(jetzt = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(jetzt);
}

/**
 * Anzahl der Plantage. `null` bei ungueltigem oder vergangenem Datum.
 * Test heute → 1 Tag (kurz wiederholen), morgen → 1, in 3 Tagen → 3, ab 5 → 5.
 */
export function planTage(testDatum: string | null | undefined, heute: string): number | null {
  if (!testDatum) return TAGE_HOECHSTENS;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(testDatum);
  if (!m) return null;
  const test = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const [hj, hm, ht] = heute.split('-').map(Number);
  const tage = Math.round((test - Date.UTC(hj, hm - 1, ht)) / 86_400_000);
  if (tage < 0) return null;
  return Math.min(TAGE_HOECHSTENS, Math.max(1, tage));
}

export const FAECHER_KLASSEN: Record<string, { min: number; max: number; name: string }> = {
  math: { min: 1, max: 10, name: 'Mathematik' },
  german: { min: 1, max: 10, name: 'Deutsch' },
  science: { min: 1, max: 4, name: 'Sachkunde' },
  english: { min: 3, max: 10, name: 'Englisch' },
  geography: { min: 5, max: 10, name: 'Geographie' },
  history: { min: 5, max: 10, name: 'Geschichte' },
  physics: { min: 5, max: 10, name: 'Physik' },
  biology: { min: 5, max: 10, name: 'Biologie' },
  chemistry: { min: 7, max: 10, name: 'Chemie' },
  latin: { min: 5, max: 10, name: 'Latein' },
};

export function fachPasst(fach: string, klasse: number): boolean {
  const f = FAECHER_KLASSEN[fach];
  return !!f && klasse >= f.min && klasse <= f.max;
}

// Eindeutige Stichworte je Fach. "Vokabeln" fehlt absichtlich (Englisch oder Latein).
const STICHWORTE: Array<[string, RegExp]> = [
  ['math', /\b(mathe\w*|rechn\w*|br[uü]ch\w*|geometrie|gleichung\w*|prozent\w*|einmaleins|terme?|dreisatz|bruchrechnung)\b/i],
  ['german', /\b(deutsch\w*|diktat\w*|aufsatz|er[oö]rterung|rechtschreib\w*|wortarten|gedicht\w*|grammatik deutsch)\b/i],
  ['english', /\b(englisch\w*|english|simple past|present (perfect|progressive)|irregular verbs)\b/i],
  ['latin', /\b(latein\w*|deklination\w*|konjugation\w* latein)\b/i],
  ['science', /\b(sachkunde|sachunterricht|hsu|heimat- und sachunterricht)\b/i],
  ['geography', /\b(erdkunde|geograph\w*|geografie|kontinent\w*|klimazonen)\b/i],
  ['history', /\b(geschichte|r[oö]mer|mittelalter|weltkrieg\w*|antike)\b/i],
  ['physics', /\b(physik\w*|stromkreis\w*|mechanik|optik)\b/i],
  ['biology', /\b(bio|biologie\w*|zelle\w*|photosynthese|[oö]kosystem\w*)\b/i],
  ['chemistry', /\b(chemie\w*|periodensystem|s[aä]uren?|basen)\b/i],
];

/** Fach aus Thema/Hinweisen, nur wenn genau eines eindeutig passt und zur Klasse gehoert. */
export function fachAusText(text: string, klasse: number): string | null {
  const treffer = STICHWORTE.filter(([fach, muster]) => muster.test(text) && fachPasst(fach, klasse)).map(([f]) => f);
  return treffer.length === 1 ? treffer[0] : null;
}
