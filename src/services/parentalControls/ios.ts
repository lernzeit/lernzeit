import { getAppLauncher } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

/**
 * Öffnet auf dem iPhone der Eltern die Bildschirmzeit in den Einstellungen.
 *
 * `App-prefs:SCREEN_TIME` ist nicht von Apple dokumentiert — einen öffentlichen
 * Link zur Bildschirmzeit gibt es nicht. Der Betreiber hat sich am 29.09.2026
 * bewusst dafür entschieden, weil er genau dort landen will. Bei der
 * App-Prüfung kann Apple nicht öffentliche URL-Schemata beanstanden
 * (Richtlinie 2.5.1); dann diesen Link entfernen, der Text-Rückfall bleibt.
 *
 * Nicht mehr verwendet: `app-settings:`. Der öffnet nur die Seite der eigenen
 * App in den Einstellungen (Siri, Mitteilungen, …).
 */
const SCREEN_TIME_URL = 'App-prefs:SCREEN_TIME';

export async function openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Zeit für Ihr Kind freigeben.`
    : '';

  const launcher = await getAppLauncher();
  if (launcher) {
    try {
      const result = await launcher.openUrl({ url: SCREEN_TIME_URL });
      if (result?.completed !== false) {
        return {
          success: true,
          opened: true,
          platform: 'ios',
          appName: 'Bildschirmzeit',
          message: `Bildschirmzeit geöffnet. Unter „Familie“ Ihr Kind wählen → App-Limits. ${minutesMsg}`.trim(),
        };
      }
    } catch (e) {
      console.warn('[ParentalControls] iOS Bildschirmzeit ließ sich nicht öffnen:', e);
    }
  }

  return {
    success: false,
    opened: false,
    platform: 'ios',
    appName: 'Bildschirmzeit',
    message: `Bitte manuell öffnen: Einstellungen → Bildschirmzeit → [Kind] → App-Limits. ${minutesMsg}`.trim(),
  };
}
