import { getAppLauncher } from './pluginLoader';
import type { OpenParentalControlsResult } from './types';

/**
 * Öffnet auf dem iPhone der Eltern die Bildschirmzeit in den Einstellungen.
 *
 * Einen öffentlichen Link dorthin gibt es nicht; die Adressen unten sind nicht
 * von Apple dokumentiert. Der Betreiber hat sich am 29.09.2026 bewusst dafür
 * entschieden. Bei der App-Prüfung kann Apple nicht öffentliche URL-Schemata
 * beanstanden (Richtlinie 2.5.1); dann die Liste leeren, der Text-Rückfall
 * bleibt.
 *
 * Getestet vom Betreiber am 29.09.2026 unter iOS 26 (Kurzbefehle → „URL öffnen“):
 *   settings-navigation://com.apple.Settings.ScreenTime  → Bildschirmzeit ✓
 *   prefs:root=SCREEN_TIME                               → Bildschirmzeit ✓
 *   App-prefs:SCREEN_TIME                                → nur Liste „Apps“ ✗
 *   app-settings:                                        → LernZeit-Seite ✗
 *
 * Reihenfolge: die neue Schreibweise zuerst; kennt ein älteres iOS sie nicht,
 * meldet openUrl `completed: false`, und die zweite wird versucht.
 */
const SCREEN_TIME_URLS = [
  'settings-navigation://com.apple.Settings.ScreenTime',
  'prefs:root=SCREEN_TIME',
];

export async function openScreenTimeSettings(minutes?: number): Promise<OpenParentalControlsResult> {
  const minutesMsg = minutes
    ? `Bitte ${minutes} Minuten zusätzliche Zeit für dein Kind freigeben.`
    : '';

  const launcher = await getAppLauncher();
  if (launcher) {
    for (const url of SCREEN_TIME_URLS) {
      try {
        const result = await launcher.openUrl({ url });
        if (result?.completed !== false) {
          return {
            success: true,
            opened: true,
            platform: 'ios',
            appName: 'Bildschirmzeit',
            message: `Einstellungen geöffnet. Zum Kind: Einstellungen → Familie → [Kind] → Bildschirmzeit. ${minutesMsg}`.trim(),
          };
        }
      } catch (e) {
        console.warn(`[ParentalControls] iOS ${url} ließ sich nicht öffnen:`, e);
      }
    }
  }

  return {
    success: false,
    opened: false,
    platform: 'ios',
    appName: 'Bildschirmzeit',
    message: `Bitte manuell öffnen: Einstellungen → Familie → [Kind] → Bildschirmzeit. ${minutesMsg}`.trim(),
  };
}
