/**
 * Aufgabe ohne Zeit, wenn das Kind LernZeit während einer offenen Aufgabe
 * verlässt (20.10.2026). Gedacht gegen Nachschlagen bei Google oder einer KI
 * auf demselben Gerät. Ersetzt den früheren Abzug der Lösezeit, der langsame
 * Leser bestrafte: Die Zeit je Aufgabe zählt nicht mehr.
 *
 * Kurze Unterbrechungen (Mitteilung, Kontrollzentrum) zählen nicht: erst ab
 * WEG_GRENZE_MS außerhalb der App, gemessen über `visibilitychange`.
 */
export const WEG_GRENZE_MS = 5000;

/** War das Kind lange genug weg, dass die Aufgabe ohne Zeit zählt? */
export function zuLangeWeg(wegAb: number | null, zurueckAm: number, grenzeMs: number = WEG_GRENZE_MS): boolean {
  return wegAb !== null && zurueckAm - wegAb >= grenzeMs;
}

/** Richtige Aufgaben, die Zeit bringen. */
export function aufgabenMitZeit(richtig: number, richtigOhneZeit: number): number {
  return Math.max(0, richtig - Math.max(0, richtigOhneZeit));
}

/** Verdiente Sekunden einer Runde: nur richtige Aufgaben mit Zeit, keine Lösezeit abgezogen. */
export function verdienteSekunden(richtig: number, richtigOhneZeit: number, sekundenJeAufgabe: number): number {
  return aufgabenMitZeit(richtig, richtigOhneZeit) * Math.max(0, sekundenJeAufgabe);
}
