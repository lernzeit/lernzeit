/**
 * Werbemessung: Google-Tag (Ads) und Meta-Pixel, nur nach Einwilligung.
 * Entscheidung des Betreibers vom 26.10.2026 (Variante B), Begründung und
 * Grenzen in docs/conversion-tracking-2026-10-26.md.
 *
 * Wann ein Skript geladen wird – alle Bedingungen zugleich:
 *  1. Website im Browser auf lernzeit.app (nie in den Apps, nie lokal, nie automatisiert)
 *  2. `ad_settings.tags_enabled` ist true (der Notaus, docs/werbung-notaus.md)
 *  3. Die Person hat für genau diesen Dienst zugestimmt (werbeEinwilligung.ts)
 *  4. Es ist eine Seite für Erwachsene: eine Marketing-Seite ohne Einladungscode,
 *     oder der Augenblick der Eltern-Registrierung
 *
 * Gesendet wird genau ein Ereignis: „Registrierung abgeschlossen“ eines Elternkontos
 * (Google: Conversion, Meta: CompleteRegistration). Keine E-Mail, kein Name, keine
 * Nutzer-ID, kein Betrag. Keine Seitenaufrufe an Meta, keine Personalisierung bei Google.
 */
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { leseEinwilligung, uebernimmEinwilligung } from '@/lib/werbeEinwilligung';

export const GOOGLE_TAG_ID = 'AW-18531716505';
export const GOOGLE_CONVERSION = `${GOOGLE_TAG_ID}/xplPCJeu1aodEJmbzoRF`;
export const META_PIXEL_ID = '1463780805688443';

const MESS_HOSTS = ['lernzeit.app', 'www.lernzeit.app'];

/** Seiten für Erwachsene, auf denen (mit Zustimmung) gemessen werden darf. */
const MARKETING_PFADE = [
  '/start', '/faq', '/preise', '/vergleich', '/bildschirmzeit-kind', '/kindersicherung-ergaenzen',
  '/lern-app-klasse-1-10', '/hilfe/einrichtung', '/ratgeber',
];

type Fenster = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
};

const w = (): Fenster => window as Fenster;

export function istMarketingSeite(pfad: string = window.location.pathname): boolean {
  return MARKETING_PFADE.some((p) => pfad === p || pfad.startsWith(`${p}/`));
}

/** Browser, Host und Ausnahmen: kein Gerät, auf dem je gemessen würde. */
export function webMessungMoeglich(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (Capacitor.isNativePlatform()) return false;
    if (navigator.webdriver) return false;
    return MESS_HOSTS.includes(window.location.hostname);
  } catch {
    return false;
  }
}

/** Seite mit Einladungscode: Hier kommt ein Kind an. Nie messen. */
function mitEinladungscode(): boolean {
  try { return new URLSearchParams(window.location.search).has('code'); } catch { return true; }
}

let tagsErlaubt: Promise<boolean> | null = null;
/** Der Notaus aus der Datenbank (`ad_settings.tags_enabled`); bei Fehler: aus. */
export function werbeTagsErlaubt(): Promise<boolean> {
  if (!webMessungMoeglich()) return Promise.resolve(false);
  tagsErlaubt ??= (async () => {
    try {
      const { data, error } = await supabase.from('ad_settings').select('tags_enabled').maybeSingle();
      return !error && data?.tags_enabled === true;
    } catch {
      return false;
    }
  })();
  return tagsErlaubt;
}

function skriptLaden(src: string): Promise<void> {
  return new Promise((ok, fehler) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => fehler(new Error(`Skript nicht geladen: ${src}`));
    document.head.appendChild(s);
  });
}

let googleBereit: Promise<boolean> | null = null;
async function googleLaden(): Promise<boolean> {
  googleBereit ??= (async () => {
    try {
      const f = w();
      f.dataLayer = f.dataLayer || [];
      f.gtag = f.gtag || function gtag() { (f.dataLayer as unknown[]).push(arguments); };
      // Consent Mode v2: Vorgabe „verweigert“; nur Messung der Anzeige freigeben, keine Personalisierung
      f.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
      f.gtag('js', new Date());
      f.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
      f.gtag('config', GOOGLE_TAG_ID, { allow_ad_personalization_signals: false, allow_google_signals: false });
      await skriptLaden(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`);
      return true;
    } catch {
      return false;
    }
  })();
  return googleBereit;
}

let metaBereit: Promise<boolean> | null = null;
async function metaLaden(): Promise<boolean> {
  metaBereit ??= (async () => {
    try {
      const f = w();
      if (!f.fbq) {
        const n = function fbq(...a: unknown[]) {
          if (n.callMethod) n.callMethod(...a); else (n.queue as unknown[][]).push(a);
        } as NonNullable<Fenster['fbq']>;
        n.queue = [];
        n.loaded = true;
        n.version = '2.0';
        n.push = n;
        f.fbq = n;
        f._fbq = n;
      }
      // Keine automatische Zuordnung über E-Mail oder Telefon, keine Automatik-Ereignisse
      f.fbq!('set', 'autoConfig', false, META_PIXEL_ID);
      f.fbq!('init', META_PIXEL_ID);
      await skriptLaden('https://connect.facebook.net/en_US/fbevents.js');
      return true;
    } catch {
      return false;
    }
  })();
  return metaBereit;
}

/**
 * Lädt die Tags, für die zugestimmt wurde, auf einer Seite für Erwachsene.
 * Aufruf bei jedem Seitenwechsel und nach einer Zustimmung; ohne Zustimmung tut sie nichts.
 */
export async function ladeWerbeTags(): Promise<void> {
  try {
    if (!webMessungMoeglich() || mitEinladungscode() || !istMarketingSeite()) return;
    const e = uebernimmEinwilligung();
    if (!e || (!e.google && !e.meta)) return;
    if (!(await werbeTagsErlaubt())) return;
    if (e.google) await googleLaden();
    // Meta bekommt keinen Seitenaufruf, nur die Registrierung; das Skript wird erst dann nötig.
  } catch { /* Messung darf nie stören */ }
}

let zuletztGemeldet = 0;
/**
 * „Registrierung abgeschlossen“ eines ELTERNkontos melden. Aufgerufen aus
 * `track('sign_up_completed', { role: 'parent' })` (analytics.ts) – dort ist die
 * Rollenprüfung; hier zusätzlich: Zustimmung, Notaus, Browser.
 */
export async function meldeRegistrierung(): Promise<void> {
  try {
    if (Date.now() - zuletztGemeldet < 15000) return;
    if (!webMessungMoeglich()) return;
    const e = leseEinwilligung();
    if (!e || (!e.google && !e.meta)) return;
    if (!(await werbeTagsErlaubt())) return;
    zuletztGemeldet = Date.now();
    // Zufallskennung gegen Doppelzählung bei Google und Meta; crypto.randomUUID fehlt ohne sicheren Kontext
    const kennung = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `reg-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    if (e.google && (await googleLaden())) {
      w().gtag!('event', 'conversion', { send_to: GOOGLE_CONVERSION, transaction_id: kennung });
    }
    if (e.meta && (await metaLaden())) {
      w().fbq!('track', 'CompleteRegistration', {}, { eventID: kennung });
    }
  } catch { /* Messung darf nie stören */ }
}
