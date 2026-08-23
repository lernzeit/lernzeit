/**
 * Zentrales Event-Tracking für den Funnel (Landingpage → erster Zeitantrag).
 *
 * - Schreibt jedes Event in die Tabelle `analytics_events` (Supabase)
 * - Spiegelt jedes Event zusätzlich in `window.dataLayer`, damit GA4 / Google Ads
 *   später ohne Codeänderung per Google Tag Manager angeklemmt werden können
 * - Wirft niemals einen Fehler nach außen: Tracking darf die App nie blockieren
 * - Funktioniert auf Web und nativ (Capacitor), `platform` wird korrekt gesetzt
 */
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

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

export interface Attribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  referrer?: string | null;
}

const ATTRIBUTION_FIELDS: (keyof Attribution)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
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

    pushToDataLayer(eventName, { ...properties, platform, page_path: pagePath });

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    const payload: Record<string, unknown> = {
      event_name: eventName,
      user_id: userId,
      anonymous_id: anonymousId,
      properties,
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

    const { error } = await (supabase as any).from('analytics_events').insert(payload);

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
  } catch {
    /* ignore */
  }
}

export function trackPageView(pagePath?: string): void {
  void track('page_view', { page_path: pagePath ?? getPagePath() ?? '/' });
}
