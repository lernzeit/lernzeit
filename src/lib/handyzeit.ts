/**
 * Tagesbudget der LernZeit-Handysperre (17.10.2026), wie Apples App-Limits:
 * Das Handy ist offen, bis die Freiminuten des Tages plus die heute
 * dazugekommene Zeit (genehmigt oder vom Elternteil extra) GENUTZT sind.
 * Gezählt wird auf dem Kinder-Handy (Swift, `ScreenTimeShared.swift`), nur
 * während eine App im Vordergrund ist. Der Tag beginnt um 0 Uhr Ortszeit.
 *
 * Hier stehen nur die Rechnungen, die App und Eltern-Ansicht teilen —
 * ohne React und ohne Supabase, damit `npm run test:reise` sie prüft.
 */

/** „Ohne Limit“: so viele Extra-Minuten bedeuten den ganzen Tag. */
export const OHNE_LIMIT_MINUTEN = 1440;

/** 'YYYY-MM-DD' in Ortszeit — derselbe Schlüssel wie im Swift-Teil (`heuteText`). */
export function tagSchluessel(d: Date = new Date()): string {
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

export function tagesbeginn(d: Date = new Date()): Date {
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return b;
}

export function istWochenende(d: Date = new Date()): boolean {
  const t = d.getDay();
  return t === 0 || t === 6;
}

/** Freiminuten heute: Wochenende eigener Wert, sonst wie werktags. */
export function freiminutenHeute(werktag: number, wochenende: number | null, d: Date = new Date()): number {
  const wert = istWochenende(d) && wochenende != null ? wochenende : werktag;
  return Math.max(0, Math.round(wert || 0));
}

/** Summe der Minuten, die seit 0 Uhr Ortszeit dazugekommen sind. */
export function zusatzHeute(zeilen: { minuten: number; zeit: string }[], d: Date = new Date()): number {
  const ab = tagesbeginn(d).getTime();
  return zeilen
    .filter((z) => new Date(z.zeit).getTime() >= ab && new Date(z.zeit).getTime() <= d.getTime() + 60_000)
    .reduce((summe, z) => summe + Math.max(0, z.minuten || 0), 0);
}

export interface TagesStand {
  /** Budget heute (Freiminuten + Zusatz), null = kein Tagesbudget. */
  budget: number | null;
  genutzt: number;
  aufgebraucht: boolean;
}

export function ohneLimit(budget: number | null): boolean {
  return budget != null && budget >= OHNE_LIMIT_MINUTEN;
}

export function restMinuten(stand: TagesStand): number | null {
  if (stand.budget == null || ohneLimit(stand.budget)) return null;
  if (stand.aufgebraucht) return 0;
  return Math.max(0, stand.budget - stand.genutzt);
}

/** Kurzer Satz für Kind und Eltern, z. B. „noch 25 Min. (35 von 60 genutzt)“. */
export function standText(stand: TagesStand): string {
  if (stand.budget == null) return '';
  if (ohneLimit(stand.budget)) return 'Heute ohne Limit';
  const rest = restMinuten(stand) ?? 0;
  if (rest <= 0) return 'Für heute aufgebraucht';
  const genutzt = Math.min(stand.genutzt, stand.budget);
  return `noch ${rest} Min. (${genutzt} von ${stand.budget} genutzt)`;
}

/** Anteil für den Balken, 0–1. */
export function anteilGenutzt(stand: TagesStand): number {
  if (stand.budget == null || stand.budget <= 0 || ohneLimit(stand.budget)) return stand.aufgebraucht ? 1 : 0;
  if (stand.aufgebraucht) return 1;
  return Math.min(1, Math.max(0, stand.genutzt / stand.budget));
}
