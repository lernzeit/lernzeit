/**
 * Anmeldung mit Google direkt bei Google (06.10.2026), siehe config/google.ts.
 *
 * Website: Weiterleitung zu Google (kein Pop-up – auf Handys oft blockiert),
 * Rücksprung auf die statische Seite /google-rueckkehr.html. Die legt das
 * ID-Token in den sessionStorage und kehrt zu /?auth=true zurück; dort reicht
 * googleWebAbschliessen() es an Supabase weiter. Googles Skript wird nie auf
 * unseren Seiten geladen.
 *
 * Apps: natives Google-Fenster über @capgo/capacitor-social-login.
 *
 * Nonce: Google bekommt den SHA-256 eines Zufallswerts, Supabase den
 * Zufallswert selbst und prüft, dass beide zusammenpassen.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import {
  GOOGLE_ANDROID_BEREIT,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_BEREIT,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_WEB_HOSTS,
} from '@/config/google';

// Gleiche Schlüssel in public/google-rueckkehr.html
const NONCE = 'lz_google_nonce';
const STATE = 'lz_google_state';
const TOKEN = 'lz_google_id_token';
const FEHLER = 'lz_google_fehler';

function zufall(laenge = 32): string {
  const zeichen = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = new Uint8Array(laenge);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => zeichen[b % zeichen.length]).join('');
}

async function sha256Hex(wert: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(wert));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Browser in Facebook/Instagram: Google lässt dort keine Anmeldung zu
 * („disallowed_useragent“) – egal auf welchem Weg. Die meisten Besucher aus
 * den Anzeigen kommen genau so.
 */
export function googleImAppBrowserGesperrt(): boolean {
  if (typeof navigator === 'undefined' || Capacitor.isNativePlatform()) return false;
  return /FBAN|FBAV|FB_IAB|FBIOS|Instagram/i.test(navigator.userAgent);
}

/** Welcher direkte Weg ist eingerichtet? null = bisheriger Weg über Supabase. */
export function googleDirekterWeg(): 'web' | 'nativ' | null {
  if (Capacitor.isNativePlatform()) {
    const plattform = Capacitor.getPlatform();
    if (plattform === 'ios' && GOOGLE_IOS_CLIENT_ID) return 'nativ';
    if (plattform === 'android' && GOOGLE_ANDROID_BEREIT) return 'nativ';
    return null;
  }
  if (GOOGLE_WEB_BEREIT && GOOGLE_WEB_HOSTS.includes(window.location.hostname)) return 'web';
  return null;
}

/** Website: zu Google weiterleiten. Die Seite wird verlassen. */
export async function googleWebStarten(): Promise<void> {
  const roh = zufall();
  const state = zufall(20);
  sessionStorage.setItem(NONCE, roh);
  sessionStorage.setItem(STATE, state);
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(FEHLER);
  const parameter = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/google-rueckkehr.html`,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: await sha256Hex(roh),
    state,
    prompt: 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${parameter}`);
}

export type GoogleAbschluss = { status: 'keiner' | 'abgebrochen' | 'ok' | 'fehler'; meldung?: string };

/** Website: nach dem Rücksprung die Anmeldung bei Supabase abschließen. */
export async function googleWebAbschliessen(): Promise<GoogleAbschluss> {
  let token: string | null = null;
  let fehler: string | null = null;
  let roh: string | null = null;
  try {
    token = sessionStorage.getItem(TOKEN);
    fehler = sessionStorage.getItem(FEHLER);
    roh = sessionStorage.getItem(NONCE);
    if (!token && !fehler) return { status: 'keiner' };
    [TOKEN, FEHLER, NONCE, STATE].forEach((k) => sessionStorage.removeItem(k));
  } catch {
    return { status: 'keiner' };
  }
  if (fehler) {
    return fehler === 'access_denied' ? { status: 'abgebrochen' } : { status: 'fehler', meldung: fehler };
  }
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: token!, nonce: roh ?? undefined });
  return error ? { status: 'fehler', meldung: error.message } : { status: 'ok' };
}

let initialisiert = false;

/** Apps: natives Google-Fenster. Wirft bei Fehlern; Abbruch → 'abgebrochen'. */
export async function googleNativ(): Promise<'ok' | 'abgebrochen'> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!initialisiert) {
    await SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
        mode: 'online',
      },
    });
    initialisiert = true;
  }
  const roh = zufall();
  let idToken: string | null | undefined;
  try {
    const antwort = await SocialLogin.login({
      provider: 'google',
      // Keine scopes angeben: Beide Plattformen fragen ohne Angabe email/profile/openid ab.
      // Mit scopes lehnt das Plugin auf Android ab („You CANNOT use scopes without
      // modifying the main activity“), und android/ bleibt unangetastet.
      options: { nonce: await sha256Hex(roh) },
    });
    idToken = (antwort.result as { idToken?: string | null }).idToken;
  } catch (err) {
    const text = String((err as { message?: string; code?: string })?.message ?? (err as { code?: string })?.code ?? err);
    if (/cancel|abgebrochen|12501|user_cancel/i.test(text)) return 'abgebrochen';
    throw err;
  }
  if (!idToken) throw new Error('Google hat kein Anmelde-Token geliefert.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: roh });
  if (error) throw error;
  return 'ok';
}
