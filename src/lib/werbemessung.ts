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
 *     oder ein angemeldetes Elternkonto mit bestätigter E-Mail (Conversion)
 *
 * Gesendet wird:
 *  - Meta: Seitenaufruf (PageView) auf den Seiten für Erwachsene (seit 31.10.2026, vorher lud
 *    das Pixel erst bei der Registrierung: kein PageView, kein _fbp, keine Zuordnung zum Klick)
 *  - Google und Meta: „Registrierung abgeschlossen“ eines Elternkontos, seit 31.10.2026 erst
 *    nach bestätigter E-Mail und je Konto genau einmal (Server: werbe_conversion_beanspruchen)
 * Keine E-Mail, kein Name, keine Nutzer-ID, kein Betrag. Keine Personalisierung bei Google.
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
    if (e.meta && (await metaLaden())) metaSeitenaufruf();
  } catch { /* Messung darf nie stören */ }
}

let letzterSeitenaufruf = '';
/** PageView an Meta, einmal je Seitenwechsel (die Website wechselt Seiten ohne Neuladen). */
function metaSeitenaufruf(): void {
  const pfad = window.location.pathname;
  if (pfad === letzterSeitenaufruf) return;
  letzterSeitenaufruf = pfad;
  w().fbq!('track', 'PageView');
}

let pruefungLaeuft = false;
const GEPRUEFT_KEY = 'lernzeit_conversion_geprueft';

/**
 * „Registrierung abgeschlossen“ eines ELTERNkontos melden – erst wenn die E-Mail
 * bestätigt ist, und je Konto genau einmal (31.10.2026).
 *
 * Aufgerufen nach jeder Anmeldung, nach einer Zustimmung und nach `sign_up_completed`
 * (Google/Apple: dort ist die E-Mail schon bestätigt). Den Ausschlag gibt der Server:
 * `werbe_conversion_beanspruchen()` liefert die transaction_id nur beim ersten Mal und nur
 * für bestätigte Elternkonten ab dem 31.10.2026, nie für Test- oder Kinderkonten. Neuladen,
 * erneute Anmeldung oder der Bestätigungslink ein zweites Mal melden deshalb nichts.
 */
export async function meldeBestaetigteRegistrierung(): Promise<void> {
  if (pruefungLaeuft) return;
  pruefungLaeuft = true;
  try {
    if (!webMessungMoeglich()) return;
    const e = leseEinwilligung();
    if (!e || (!e.google && !e.meta)) return;
    if (!(await werbeTagsErlaubt())) return;
    const { data } = await supabase.auth.getSession();
    const nutzer = data?.session?.user;
    if (!nutzer?.email_confirmed_at) return;
    try { if (localStorage.getItem(GEPRUEFT_KEY) === nutzer.id) return; } catch { /* ohne Speicher fragt der Server */ }

    const { data: kennung, error } = await supabase.rpc('werbe_conversion_beanspruchen');
    // null: schon gemeldet, altes Konto, Test- oder Kinderkonto, oder (Google/Apple) die Rolle
    // ist noch nicht gewählt. Dann beim nächsten Anlass wieder fragen; der Server bleibt dabei.
    if (error || typeof kennung !== 'string' || !kennung) return;
    try { localStorage.setItem(GEPRUEFT_KEY, nutzer.id); } catch { /* egal */ }

    if (e.google && (await googleLaden())) {
      w().gtag!('event', 'conversion', { send_to: GOOGLE_CONVERSION, transaction_id: kennung });
    }
    if (e.meta && (await metaLaden())) {
      w().fbq!('track', 'CompleteRegistration', {}, { eventID: kennung });
    }
  } catch { /* Messung darf nie stören */ } finally {
    pruefungLaeuft = false;
  }
}

/** Meta-Kennungen aus den Cookies (_fbp, _fbc), nur mit Zustimmung für Meta. */
export function metaKennungen(): { fbp: string | null; fbc: string | null } {
  try {
    if (!leseEinwilligung()?.meta) return { fbp: null, fbc: null };
    const keks = (n: string) => document.cookie.split(';').map((c) => c.trim())
      .find((c) => c.startsWith(`${n}=`))?.slice(n.length + 1).slice(0, 200) ?? null;
    return { fbp: keks('_fbp'), fbc: keks('_fbc') };
  } catch {
    return { fbp: null, fbc: null };
  }
}
