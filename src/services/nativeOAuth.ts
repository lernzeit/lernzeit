/**
 * Anmeldung mit Google (und Apple auf Android) in der nativen App.
 *
 * Befund vom 27.09.2026 (TestFlight, iOS): Die Anmeldung mit Google landete
 * in Safari und blieb dort. Ursache: In der App ist `window.location.origin`
 * nicht https://lernzeit.app, sondern `capacitor://localhost`. Die App leitete
 * ihre eigene Ansicht zu Google um — Capacitor öffnet fremde Adressen in
 * Safari —, und die Rücksprungadresse `capacitor://localhost/` stand nicht
 * auf Supabases Liste. Supabase fiel auf die Website zurück; nichts führte
 * zurück in die App.
 *
 * Der Weg jetzt:
 *   1. Supabase liefert die Google-Adresse, OHNE selbst weiterzuleiten
 *      (`skipBrowserRedirect`).
 *   2. Sie öffnet sich in einem Browserfenster innerhalb der App
 *      (@capacitor/browser: SFSafariViewController bzw. Custom Tab).
 *   3. Google/Supabase springen zurück an `de.lernzeit.app://auth`. Das
 *      Schema ist in iOS (codemagic.yaml, Info.plist) und Android
 *      (AndroidManifest.xml) auf LernZeit registriert.
 *   4. `uebernimmOAuthRueckkehr` (aufgerufen vom Deep-Link-Handler) schließt
 *      das Fenster und übergibt die Sitzung an Supabase. Den Rest erledigt
 *      der bestehende onAuthStateChange-Weg — useAuth bleibt unberührt.
 *
 * Voraussetzung in Supabase: `de.lernzeit.app://auth` steht unter
 * Authentication → URL Configuration → Redirect URLs.
 */
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const NATIVE_AUTH_REDIRECT = 'de.lernzeit.app://auth';

export function istNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Startet die Anmeldung im Browserfenster der App. Kehrt zurück, sobald das
 * Fenster offen ist. `beimSchliessen` läuft, wenn das Fenster zugeht — auch
 * wenn der Nutzer abbricht —, damit der Anmeldebildschirm nicht im
 * Ladezustand hängen bleibt.
 */
export async function oauthImAppBrowser(
  provider: 'google' | 'apple',
  queryParams?: Record<string, string>,
  beimSchliessen?: () => void,
): Promise<void> {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_AUTH_REDIRECT,
      skipBrowserRedirect: true,
      queryParams,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Keine Anmeldeadresse erhalten.');

  const { Browser } = await import('@capacitor/browser');
  if (beimSchliessen) {
    const handle = await Browser.addListener('browserFinished', () => {
      try { void handle.remove(); } catch { /* ignore */ }
      beimSchliessen();
    });
  }
  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

/** Parameter aus Fragment und Query eines Rücksprungs, Fragment gewinnt. */
function parameter(rawUrl: string): URLSearchParams {
  const ohneFragment = rawUrl.split('#')[0];
  const fragment = rawUrl.includes('#') ? rawUrl.slice(rawUrl.indexOf('#') + 1) : '';
  const query = ohneFragment.includes('?') ? ohneFragment.slice(ohneFragment.indexOf('?') + 1) : '';
  const p = new URLSearchParams(query);
  new URLSearchParams(fragment).forEach((wert, name) => p.set(name, wert));
  return p;
}

/**
 * Nimmt den Rücksprung nach der Anmeldung entgegen. Gibt `false` zurück,
 * wenn die Adresse kein Anmelde-Rücksprung ist — dann behandelt der
 * Deep-Link-Handler sie wie bisher.
 *
 * Versteht beide Varianten, die Supabase liefern kann: Tokens im Fragment
 * (implicit, Standard dieses Clients) und einen Code (PKCE).
 */
export async function uebernimmOAuthRueckkehr(rawUrl: string): Promise<boolean> {
  if (!rawUrl?.toLowerCase().startsWith(NATIVE_AUTH_REDIRECT)) return false;

  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch { /* Fenster war schon zu */ }

  const p = parameter(rawUrl);
  const fehler = p.get('error_description') || p.get('error');
  if (fehler) {
    toast.error('Anmeldung nicht abgeschlossen', { description: fehler.replace(/\+/g, ' ') });
    return true;
  }

  try {
    const { supabase } = await import('@/lib/supabase');
    const code = p.get('code');
    const accessToken = p.get('access_token');
    const refreshToken = p.get('refresh_token');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
    } else {
      throw new Error('Der Rücksprung enthielt keine Anmeldedaten.');
    }
  } catch (err) {
    console.error('[nativeOAuth] Sitzung nicht übernommen:', err);
    toast.error('Anmeldung nicht abgeschlossen', {
      description: err instanceof Error ? err.message : 'Bitte noch einmal versuchen.',
    });
  }
  return true;
}
