import type { OpenParentalControlsResult } from './types';

/**
 * iOS: Bildschirmzeit lässt sich aus einer App heraus nicht öffnen.
 *
 * Apple bietet keinen öffentlichen Link dorthin. `app-settings:` öffnet nur die
 * Seite der eigenen App in den Einstellungen (Siri, Mitteilungen, …) — genau
 * dort landeten Eltern bis 29.09.2026 nach einer Freigabe. `App-Prefs:` ist
 * nicht öffentlich und gefährdet die App-Prüfung. Deshalb nur der Weg als Text.
 */
export async function openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Zeit für Ihr Kind freigeben.`
    : '';

  return {
    success: false,
    opened: false,
    platform: 'ios',
    appName: 'Bildschirmzeit',
    message: `Bitte manuell öffnen: Einstellungen → Bildschirmzeit → [Kind] → App-Limits. ${minutesMsg}`.trim(),
  };
}
