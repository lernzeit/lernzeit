/**
 * Einwilligung in die Werbemessung (Google Ads, Meta), Stand 26.10.2026.
 *
 * Regeln (Entscheidung des Betreibers, 26.10.2026, Variante B in
 * docs/conversion-tracking-2026-10-26.md):
 *  - Ohne ausdrückliche Zustimmung wird kein Skript von Google oder Meta geladen
 *    und nichts an sie übermittelt. Der Vorgabewert ist „nein“.
 *  - Zwei getrennte Zwecke, einzeln wählbar: Google und Meta.
 *  - Ablehnen ist so einfach wie Zustimmen (zwei gleichwertige Knöpfe).
 *  - Widerruf jederzeit über „Werbe-Einstellungen“ im Seitenfuß.
 *  - Nie in den Apps, nie für Kinder, nie auf Seiten mit Einladungscode.
 *
 * Gespeichert wird nur die Entscheidung selbst (localStorage); sie ist der
 * Nachweis der Einwilligung und braucht deshalb selbst keine.
 */
import { setWerbeEinwilligung } from '@/lib/analytics';

export const EINWILLIGUNG_KEY = 'lernzeit_werbe_einwilligung';
/** Bei einer inhaltlichen Änderung der Zwecke erhöhen: Dann wird neu gefragt. */
export const EINWILLIGUNG_VERSION = 1;
export const EINWILLIGUNG_GEAENDERT = 'lernzeit:werbe-einwilligung';
export const WERBE_EINSTELLUNGEN_OEFFNEN = 'lernzeit:werbe-einstellungen';

export interface Einwilligung {
  v: number;
  google: boolean;
  meta: boolean;
  am: string;
}

export function leseEinwilligung(): Einwilligung | null {
  try {
    const roh = localStorage.getItem(EINWILLIGUNG_KEY);
    if (!roh) return null;
    const e = JSON.parse(roh) as Einwilligung;
    if (e?.v !== EINWILLIGUNG_VERSION || typeof e.google !== 'boolean' || typeof e.meta !== 'boolean') return null;
    return e;
  } catch {
    return null;
  }
}

/** Setzt analytics.ts auf den gespeicherten Stand (Google-Zustimmung öffnet die Klick-Zuordnung bei der Eltern-Registrierung). */
export function uebernimmEinwilligung(): Einwilligung | null {
  const e = leseEinwilligung();
  setWerbeEinwilligung(Boolean(e?.google));
  return e;
}

export function speichereEinwilligung(google: boolean, meta: boolean): Einwilligung {
  const e: Einwilligung = { v: EINWILLIGUNG_VERSION, google, meta, am: new Date().toISOString() };
  try { localStorage.setItem(EINWILLIGUNG_KEY, JSON.stringify(e)); } catch { /* ohne Speicher keine Messung */ }
  setWerbeEinwilligung(google);
  try { window.dispatchEvent(new Event(EINWILLIGUNG_GEAENDERT)); } catch { /* kein Fenster */ }
  return e;
}

/** Cookies, die Google und Meta auf dieser Domain gesetzt haben, entfernen (Widerruf oder Ablehnen nach früherer Zustimmung). */
export function loescheWerbeCookies(): void {
  try {
    const namen = document.cookie.split(';').map((c) => c.split('=')[0].trim())
      .filter((n) => /^(_gcl_|_ga|_gid|_fbp|_fbc|_gac_|IDE|test_cookie)/.test(n));
    const host = window.location.hostname;
    const domains = [host, `.${host}`, `.${host.replace(/^www\./, '')}`];
    for (const n of namen) {
      for (const d of domains) {
        document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      }
      document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch { /* ignore */ }
}
