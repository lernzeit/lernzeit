/**
 * Streak-Rechnung: aufeinanderfolgende Tage mit mindestens einer Runde.
 *
 * Befund 30.09.2026: Klara hatte vier Tage hintereinander gespielt, die App
 * zeigte 1. Zwei Fehler zusammen:
 *
 *  1. useStreak las einen Tag als Mitternacht in ORTSZEIT
 *     (`new Date('2026-09-30T00:00:00')`) und verglich ihn per
 *     `toISOString()` in UTC. In Deutschland wurde daraus der 29.09., schon
 *     der erste Vergleich scheiterte, der errechnete Streak war immer 0.
 *  2. Übrig blieb der gespeicherte Wert, und den setzte LearningGame nach jeder
 *     Runde auf 1 (siehe dort, `streakBeforeSession`).
 *
 * Hier gilt deshalb durchgehend der Kalendertag in Ortszeit des Geräts — für
 * die Sitzungen wie für „heute". Eine Runde um 00:30 zählt zum neuen Tag,
 * nicht (wie bei UTC) zum alten.
 */

/** Kalendertag in Ortszeit als `YYYY-MM-DD`. */
export function lokalerTag(datum: Date): string {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, '0');
  const t = String(datum.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

/** Der Tag `n` Tage vor `tag` (beide `YYYY-MM-DD`), sommerzeitfest. */
function tageVorher(tag: string, n: number): string {
  const [j, m, t] = tag.split('-').map(Number);
  // Mittag statt Mitternacht: Eine Zeitumstellung kann den Tag dann nicht
  // verschieben.
  return lokalerTag(new Date(j, m - 1, t - n, 12));
}

/** Ganze Kalendertage zwischen zwei Tagen (`bis` nach `von` → positiv). */
export function tageZwischen(von: string, bis: string): number {
  const [j1, m1, t1] = von.split('-').map(Number);
  const [j2, m2, t2] = bis.split('-').map(Number);
  return Math.round((Date.UTC(j2, m2 - 1, t2) - Date.UTC(j1, m1 - 1, t1)) / 86400000);
}

export interface StreakErgebnis {
  /** Länge der Kette, die am letzten Spieltag endet. */
  streak: number;
  /** Tage seit dem letzten Spieltag (0 = heute gespielt). */
  inaktiveTage: number;
  /** Letzter Spieltag oder null. */
  letzterTag: string | null;
}

/**
 * Zählt die Kette rückwärts vom letzten Spieltag. Ob die Kette noch zählt
 * (z. B. höchstens zwei Tage Pause), entscheidet der Aufrufer anhand von
 * `inaktiveTage`.
 */
export function berechneStreak(zeitpunkte: Array<string | Date>, jetzt: Date = new Date()): StreakErgebnis {
  const tage = new Set(zeitpunkte.map((z) => lokalerTag(new Date(z))));
  if (tage.size === 0) return { streak: 0, inaktiveTage: 0, letzterTag: null };

  const sortiert = Array.from(tage).sort((a, b) => b.localeCompare(a));
  const letzterTag = sortiert[0];
  const inaktiveTage = Math.max(0, tageZwischen(letzterTag, lokalerTag(jetzt)));

  let streak = 0;
  while (tage.has(tageVorher(letzterTag, streak))) streak++;

  return { streak, inaktiveTage, letzterTag };
}
