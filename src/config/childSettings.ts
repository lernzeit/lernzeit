/**
 * Vorgabewerte der Kind-Einstellungen und die Texte, die sie beschreiben.
 *
 * Warum an einer Stelle: Die Zahlen 30 / 30 / 60 standen in mindestens vier
 * Dateien, und zweimal zusaetzlich ausgeschrieben im Fliesstext. Wer den
 * Standard aendert, aendert ihn dann an vier Stellen und vergisst die zwei
 * Saetze — die Oberflaeche behauptet danach etwas, das nicht mehr stimmt.
 *
 * Die Werte muessen mit den Spalten-Vorgabewerten in `child_settings`
 * uebereinstimmen. `npm run verify-claims` prueft genau das gegen die
 * Datenbank (Faktenpruefung Zeile 3 und 4).
 */

export const DEFAULT_SECONDS_PER_TASK = 30;
export const DEFAULT_WEEKDAY_MAX_MINUTES = 30;
export const DEFAULT_WEEKEND_MAX_MINUTES = 60;

/** Die Faecher, fuer die es eine eigene Sekundenzahl gibt. */
export const SECONDS_PER_TASK_KEYS = [
  'math', 'german', 'science', 'english', 'geography',
  'history', 'physics', 'biology', 'chemistry', 'latin',
] as const;

export interface DailyLimits {
  weekday_max_minutes: number;
  weekend_max_minutes: number;
}

export type SecondsPerTask = Partial<Record<`${(typeof SECONDS_PER_TASK_KEYS)[number]}_seconds_per_task`, number>>;

/**
 * „30 Minuten an Schultagen und 60 Minuten am Wochenende“ — oder, wenn beide
 * Werte gleich sind, schlicht „30 Minuten am Tag“.
 *
 * Der Sonderfall ist nicht Kosmetik: Stellt ein Elternteil beide Werte auf
 * dasselbe, klaenge die lange Fassung nach einem Unterschied, den es nicht
 * gibt.
 */
export function describeDailyLimits(limits: DailyLimits): string {
  const { weekday_max_minutes: werktags, weekend_max_minutes: wochenende } = limits;
  if (werktags === wochenende) {
    return `höchstens ${werktags} Minuten am Tag`;
  }
  return `höchstens ${werktags} Minuten an Schultagen und ${wochenende} Minuten am Wochenende`;
}

/**
 * „30 Sekunden pro richtiger Aufgabe“ — oder ein ehrliches „je nach Fach
 * unterschiedlich“, wenn die Eltern die Faecher verschieden eingestellt
 * haben.
 *
 * Eine einzelne Zahl zu nennen, waehrend Mathe auf 45 und Deutsch auf 20
 * steht, waere schlicht falsch.
 */
export function describeSecondsPerTask(settings: SecondsPerTask): string {
  const werte = SECONDS_PER_TASK_KEYS
    .map((fach) => settings[`${fach}_seconds_per_task`])
    .filter((wert): wert is number => typeof wert === 'number');

  if (werte.length === 0) {
    return `${DEFAULT_SECONDS_PER_TASK} Sekunden pro richtiger Aufgabe`;
  }

  const einheitlich = werte.every((wert) => wert === werte[0]);
  if (!einheitlich) {
    return 'je nach Fach unterschiedlich viele Sekunden pro richtiger Aufgabe';
  }

  const sekunden = werte[0];
  if (sekunden % 60 === 0 && sekunden >= 60) {
    const minuten = sekunden / 60;
    return `${minuten} ${minuten === 1 ? 'Minute' : 'Minuten'} pro richtiger Aufgabe`;
  }
  return `${sekunden} Sekunden pro richtiger Aufgabe`;
}

/** Der Standard, wie er ohne Premium gilt — als fertiger Satzteil. */
export function describeStandard(): string {
  return `${describeSecondsPerTask({})}, ${describeDailyLimits({
    weekday_max_minutes: DEFAULT_WEEKDAY_MAX_MINUTES,
    weekend_max_minutes: DEFAULT_WEEKEND_MAX_MINUTES,
  })}`;
}
