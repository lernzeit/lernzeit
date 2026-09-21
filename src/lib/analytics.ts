/**
 * Zentrales Event-Tracking für den Funnel (Landingpage → erster Zeitantrag).
 *
 * - Schreibt jedes Event in die Tabelle `analytics_events` (Supabase, EU) —
 *   erste Partei, verlaesst unsere Infrastruktur nicht
 * - Spiegelt Events zusätzlich in `window.dataLayer`, damit GA4 / Google Ads
 *   später ohne Codeänderung per Google Tag Manager angeklemmt werden können
 * - NIEMALS gespiegelt werden Events von Kindern: siehe `isChildAudience`.
 *   Der dataLayer ist der einzige Weg nach draussen; die erste Haelfte
 *   (analytics_events) bleibt vollstaendig, damit der eigene Funnel-Bericht
 *   weiter funktioniert.
 * - Wirft niemals einen Fehler nach außen: Tracking darf die App nie blockieren
 * - Funktioniert auf Web und nativ (Capacitor), `platform` wird korrekt gesetzt
 */
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/integrations/supabase/types';
import { Capacitor } from '@capacitor/core';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert'];

export type AnalyticsEventName =
  | 'page_view'
  | 'landing_cta_click'
  | 'demo_started'
  | 'demo_question_answered'
  | 'demo_completed_cta_click'
  | 'sign_up_started'
  | 'sign_up_completed'
  | 'invitation_code_created'
  | 'invitation_code_redeemed'
  | 'invite_link_shared'
  | 'onboarding_step_viewed'
  | 'child_linked'
  | 'first_learning_session'
  | 'screen_time_requested'
  | 'screen_time_approved'
  | 'trial_ended_paywall_seen'
  | 'checkout_started'
  | 'subscription_purchased';

const ANON_ID_KEY = 'lernzeit_anonymous_id';
const ATTRIBUTION_KEY = 'lernzeit_attribution';
// Merkposten dafuer, dass fuer dieses Konto bereits ein Klick verbucht wurde.
// Enthaelt die Nutzer-ID, damit ein zweites Konto im selben Browser erneut
// verbucht wird. Kein Werbedatum — deshalb auch ohne Einwilligung zulaessig.
const AD_RECORDED_KEY = 'lernzeit_ad_recorded';

export interface Attribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  /**
   * Bleibt seit dem 21.09.2026 immer leer.
   *
   * Das Feld steht noch im Typ, weil `analytics_events` eine gleichnamige
   * Spalte hat. Gefuellt wird sie nicht mehr: Eine Klick-Kennung im
   * localStorage waere eine Speicherung ohne Einwilligung.
   */
  gclid?: string | null;
  referrer?: string | null;
}

/**
 * Was beim Ankommen dauerhaft gespeichert wird.
 *
 * `gclid` stand hier bis zum 21.09.2026 mit drin und landete damit im
 * localStorage — ohne Einwilligung, bei jedem Besucher. Vorgabe der Kanzlei
 * vom 21.09.2026: keine eigene Werbe-Zwischenablage vor der Zustimmung. Das
 * gilt fuer den Arbeitsspeicher und erst recht fuer eine Ablage, die den
 * Tab ueberlebt.
 *
 * Die Klick-Kennung wird seitdem ueberhaupt nicht mehr abgelegt, sondern
 * erst im Moment der Einwilligung aus der Adresszeile gelesen — siehe
 * `leseKlickAusAdresse()`.
 */
const ATTRIBUTION_FIELDS: (keyof Attribution)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'referrer',
];

/* ------------------------------------------------------------------ */
/* Storage helpers (localStorage + Capacitor Preferences auf nativ)     */
/* ------------------------------------------------------------------ */

type PreferencesPluginLike = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
};

let preferences: PreferencesPluginLike | null = null;

async function getPreferences(): Promise<PreferencesPluginLike | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (preferences) return preferences;
  try {
    const mod = await import('@capacitor/preferences');
    preferences = mod.Preferences as unknown as PreferencesPluginLike;
    return preferences;
  } catch {
    return null;
  }
}

function readLocal(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage?.setItem(key, value);
  } catch {
    /* ignore */
  }
  void (async () => {
    try {
      const prefs = await getPreferences();
      await prefs?.set({ key, value });
    } catch {
      /* ignore */
    }
  })();
}

/* ------------------------------------------------------------------ */
/* Anonymous ID & Attribution                                          */
/* ------------------------------------------------------------------ */

function createUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getAnonymousId(): string {
  const existing = readLocal(ANON_ID_KEY);
  if (existing) return existing;
  const fresh = createUuid();
  writeLocal(ANON_ID_KEY, fresh);
  return fresh;
}

export function getAttribution(): Attribution {
  try {
    const raw = readLocal(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Attribution;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Liest UTM-Parameter und gclid beim ersten Seitenaufruf aus der URL und
 * speichert sie dauerhaft. Bereits gespeicherte Werte werden nur überschrieben,
 * wenn die aktuelle URL neue Kampagnendaten enthält.
 */
export function captureAttribution(): Attribution {
  try {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const fresh: Attribution = {};
    for (const field of ATTRIBUTION_FIELDS) {
      if (field === 'referrer') continue;
      const value = params.get(field);
      if (value) fresh[field] = value.slice(0, 200);
    }

    const stored = getAttribution();
    const hasNew = Object.keys(fresh).length > 0;
    if (!hasNew && stored.referrer !== undefined) return stored;

    const referrer =
      stored.referrer ?? (document.referrer ? document.referrer.slice(0, 300) : null);

    const merged: Attribution = hasNew ? { ...fresh, referrer } : { ...stored, referrer };
    writeLocal(ATTRIBUTION_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return {};
  }
}

function getPlatform(): 'web' | 'android' | 'ios' {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
  } catch {
    /* ignore */
  }
  return 'web';
}

function getPagePath(): string | null {
  try {
    return typeof window !== 'undefined' ? window.location.pathname : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Anzeigenklicks (ad_attribution)                                      */
/* ------------------------------------------------------------------ */

/**
 * Die Kennungen, an denen Google seinen eigenen Klick wiedererkennt.
 *
 * `gbraid` und `wbraid` treten an die Stelle von `gclid`, wenn auf iOS keine
 * Einwilligung fuer geraeteuebergreifende Messung vorliegt. Wer nur `gclid`
 * erfasst, verliert genau die Klicks, die aus der Zielgruppe kommen.
 *
 * ── Warum `fbclid` fehlt ──────────────────────────────────────────────────
 *
 * Meta ist abgeschaltet. Die Kanzlei hat am 21.09.2026 einen technischen
 * Konflikt festgestellt: Metas dokumentierte Schnittstelle verlangt fuer
 * Website-Ereignisse zusaetzlich Ereignis-URL und User-Agent. Beides ist von
 * der abgestimmten Zielkonfiguration nicht gedeckt. Solange Meta nichts
 * empfaengt, hat das Erfassen der Kennung keinen Zweck — und Daten ohne
 * Zweck werden nicht erhoben.
 *
 * Die Spalten `fbclid`, `fbp` und `fbc` stehen weiter in `ad_attribution`.
 * Sie bleiben leer; die Kanzlei hat eine ausdruecklich gekennzeichnete
 * Erweiterungsvariante vorbereitet, fuer die sie wieder gebraucht wuerden.
 */
const AD_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid'] as const;

type AdClick = Record<string, string | null>;

/**
 * Einwilligung in die Werbemessung.
 *
 * Der Vorgabewert ist `false`, und das ist der heutige Zustand: Die CMP
 * steht noch nicht. Solange niemand etwas anderes setzt, wird nichts
 * gespeichert und nichts uebermittelt — die Messung ist vollstaendig aus,
 * nicht nur ungenutzt.
 *
 * Bewusst eine Variable und kein Import aus der CMP: Diese Datei soll nicht
 * wissen, welcher Anbieter die Einwilligung einholt. Wenn die CMP steht, ruft
 * sie setWerbeEinwilligung() — eine Stelle, an der alles andere haengt.
 */
let werbeEinwilligung = false;

export function setWerbeEinwilligung(erteilt: boolean): void {
  werbeEinwilligung = erteilt;
}

function hatWerbeEinwilligung(): boolean {
  return werbeEinwilligung;
}

/**
 * Liest die Klick-Kennung aus der AKTUELLEN Adresszeile — in dem Moment, in
 * dem sie gebraucht wird, und keine Sekunde vorher.
 *
 * ── Warum es keine Zwischenablage mehr gibt ──────────────────────────────
 *
 * Bis zum 21.09.2026 lief es umgekehrt: Beim Ankommen wurde die Kennung
 * gelesen und gemerkt — erst im localStorage, dann in einer Variablen im
 * Arbeitsspeicher. Beides ist nach der Pruefung der Kanzlei vom 21.09.2026
 * nicht haltbar: Auch der Arbeitsspeicher kann rechtlich Speicherung sein
 * (§ 25 TDDDG, EDSA-Leitlinien 2/2023). Ihre Vorgabe lautet, vor der
 * Zustimmung gar keine eigene Werbe-Zwischenablage zu fuehren und danach die
 * noch vorhandene Kennung aus der aktuellen Browseradresse zu uebernehmen.
 *
 * Genau das tut diese Funktion. Sie wird ausschliesslich aus `resolveAdClick`
 * gerufen, also nach geprueftem Elternkonto UND erteilter Einwilligung.
 *
 * ── Was das kostet ───────────────────────────────────────────────────────
 *
 * Steht die Kennung zu diesem Zeitpunkt nicht mehr in der Adresse, ist sie
 * weg. In der heutigen Navigation ist das der Normalfall: Die Anzeige fuehrt
 * auf `/start?gclid=…`, die Registrierung liegt auf `/`, und `/auth` leitet
 * per `Navigate replace` auf `/?auth=true` um — dabei faellt die Abfrage weg.
 *
 * Ob die Kennung waehrend der Navigation IN DER ADRESSE mitgefuehrt werden
 * darf (nicht in einer Ablage), ist die offene Frage an die Kanzlei. Bis zur
 * Antwort misst dieser Weg bewusst eher nichts als zu viel.
 */
function leseKlickAusAdresse(): AdClick | null {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const klick: AdClick = {};
    for (const name of AD_CLICK_PARAMS) {
      const wert = params.get(name);
      if (wert) klick[name] = wert.slice(0, 200);
    }
    return Object.keys(klick).length > 0 ? klick : null;
  } catch {
    return null;
  }
}

/**
 * Verbucht den Anzeigenklick — nur fuer ein Elternkonto, nur nach
 * Einwilligung, und nur aus der Adresszeile dieses Augenblicks.
 *
 * Kinderkonto: Es gibt nichts zu loeschen und nichts zu verwerfen, weil nie
 * etwas gelesen wurde. Die Funktion kehrt um, bevor sie die Adresse ansieht.
 *
 * Die Datenbank prueft die Rolle ein zweites Mal (Zugriffsregel auf
 * ad_attribution). Zwei Sperren an zwei Orten: Wer die eine umgeht, steht vor
 * der anderen.
 */
async function resolveAdClick(userId: string | null, audience: Audience | null): Promise<void> {
  try {
    // Reihenfolge ist hier die halbe Miete: erst Rolle und Einwilligung,
    // DANN die Adresse lesen. Andersherum haette die Funktion die Kennung
    // eines Kindes kurz in der Hand gehabt — genau das soll nicht passieren.
    if (audience !== 'parent' || !userId) return;
    if (!hatWerbeEinwilligung()) return;
    if (readLocal(AD_RECORDED_KEY) === userId) return;

    const klick = leseKlickAusAdresse();
    if (!klick) return;

    writeLocal(AD_RECORDED_KEY, userId);

    const attribution = getAttribution();
    const { error } = await supabase.from('ad_attribution').insert({
      user_id: userId,
      gclid: klick.gclid ?? null,
      gbraid: klick.gbraid ?? null,
      wbraid: klick.wbraid ?? null,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      referrer: attribution.referrer ?? null,
      landing_path: getPagePath(),
    });
    if (error && import.meta.env?.DEV) {
      console.warn('[analytics] ad_attribution insert failed', error.message);
    }
  } catch {
    /* Tracking darf die App nie blockieren. */
  }
}

/* ------------------------------------------------------------------ */
/* Zielgruppe: Kinder werden nie an Werbeplattformen gemeldet          */
/* ------------------------------------------------------------------ */

/**
 * Conversions duerfen ausschliesslich aus Elternkonten gemeldet werden — sie
 * schliessen das Abo ab, und Kinderdaten gehen Google und Meta nichts an.
 *
 * Die Sperre sitzt bewusst HIER und nicht beim Aufrufer: `track()` ist der
 * einzige Weg in den dataLayer, und der dataLayer ist der einzige Weg nach
 * draussen. Wer spaeter ein neues Event ergaenzt, ist damit automatisch auf
 * der sicheren Seite, ohne die Regel zu kennen.
 *
 * Zwei Wege fuehren zur Sperre:
 *   1. Das Event sagt es selbst (`role: 'child'`) — greift schon bei der
 *      Registrierung, bevor ein Profil existiert.
 *   2. Die angemeldete Person hat ein Kinderprofil — einmal je Nutzer
 *      abgefragt und gemerkt.
 *
 * Der Merkposten haengt an der Nutzer-ID. Meldet sich auf demselben Geraet
 * spaeter ein Elternteil an, wird neu abgefragt statt faelschlich gesperrt.
 */
type Audience = 'parent' | 'child';

let cachedAudience: { userId: string; audience: Audience } | null = null;

function eventClaimsChild(properties: AnalyticsProperties): boolean {
  return properties.role === 'child';
}

async function resolveAudience(userId: string | null): Promise<Audience | null> {
  // Nicht angemeldet: noch niemand, dessen Rolle wir kennen koennten. Das ist
  // der anonyme Besucher auf der Landingpage — genau der Fall, fuer den die
  // Messung gedacht ist.
  if (!userId) return null;
  if (cachedAudience?.userId === userId) return cachedAudience.audience;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    // Rolle unbekannt (Zeile fehlt, RLS greift, Netz weg): im Zweifel sperren.
    // Eine verlorene Conversion kostet Messgenauigkeit, ein gemeldetes Kind
    // kostet eine Zusage.
    const audience: Audience = data?.role === 'parent' ? 'parent' : 'child';
    cachedAudience = { userId, audience };
    return audience;
  } catch {
    return 'child';
  }
}

/* ------------------------------------------------------------------ */
/* dataLayer (GA4 / Google Ads über GTM – später ohne Codeänderung)     */
/* ------------------------------------------------------------------ */

function pushToDataLayer(eventName: string, properties: AnalyticsProperties): void {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: eventName, ...properties });
    }
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* track()                                                             */
/* ------------------------------------------------------------------ */

/**
 * Sendet ein Event. Schlägt niemals fehl.
 *
 * Wichtig: In `properties` gehören keine Klartext-Namen, keine E-Mail-Adressen
 * und keine Freitexteingaben von Kindern.
 */
export async function track(
  eventName: AnalyticsEventName | string,
  properties: AnalyticsProperties = {}
): Promise<void> {
  try {
    const attribution = getAttribution();
    const platform = getPlatform();
    const pagePath = getPagePath();
    const anonymousId = getAnonymousId();

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    // Erst die Rolle klaeren, dann spiegeln. Vorher stand der Push oben und
    // lief damit auch fuer Kinder — folgenlos nur so lange, wie kein GTM
    // angeklemmt ist.
    const audience = eventClaimsChild(properties) ? 'child' : await resolveAudience(userId);
    void resolveAdClick(userId, audience);
    if (audience !== 'child') {
      pushToDataLayer(eventName, { ...properties, platform, page_path: pagePath });
    }

    const payload: AnalyticsEventInsert = {
      event_name: eventName,
      user_id: userId,
      anonymous_id: anonymousId,
      // AnalyticsProperties laesst undefined zu, jsonb nicht — undefined
      // verschwindet beim Serialisieren ohnehin.
      properties: properties as Json,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      gclid: attribution.gclid ?? null,
      referrer: attribution.referrer ?? null,
      page_path: pagePath,
      platform,
    };

    const { error } = await supabase.from('analytics_events').insert(payload);

    if (error && import.meta.env?.DEV) {
      console.warn('[analytics] insert failed', error.message);
    }
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('[analytics] track failed', err);
    }
  }
}

/** Feuert `track` ohne await – für Klick-Handler. */
export function trackFireAndForget(
  eventName: AnalyticsEventName | string,
  properties: AnalyticsProperties = {}
): void {
  void track(eventName, properties);
}

/** Einmalige Initialisierung beim App-Start. */
export function initAnalytics(): void {
  try {
    captureAttribution();
    getAnonymousId();
    // captureAdClick() stand hier bis zum 21.09.2026 und legte die
    // Klick-Kennung beim Ankommen ab. Nach der Vorgabe der Kanzlei gibt es
    // vor der Einwilligung keine Zwischenablage mehr — gelesen wird erst in
    // resolveAdClick, aus der Adresszeile dieses Augenblicks.
  } catch {
    /* ignore */
  }
}

export function trackPageView(pagePath?: string): void {
  void track('page_view', { page_path: pagePath ?? getPagePath() ?? '/' });
}
