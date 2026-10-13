/*
 * Hinweis „LernZeit ist fuer die App optimiert“ (13.10.2026): Im Browser
 * empfehlen wir bei der Anmeldung und beim Spielen die App aus dem Store.
 * Nur im Browser, nie in den Apps und nicht im installierten PWA.
 */

export const APP_STORE_URL = 'https://apps.apple.com/de/app/lernzeit-lernen-f%C3%BCr-handyzeit/id6789603688';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=de.lernzeit.app&utm_source=website';

export type Geraet = 'ios' | 'android' | 'andere';

export function erkenneGeraet(ua = '', beruehrungspunkte = 0): Geraet {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && beruehrungspunkte > 1)) return 'ios';
  return 'andere';
}

/** iPhone sieht nur den App Store, Android nur Google Play, Computer beide. */
export function storeLinksFuer(geraet: Geraet, quelle = 'web_hinweis') {
  return [
    { id: 'ios' as const, url: APP_STORE_URL, text: 'App Store' },
    { id: 'android' as const, url: PLAY_STORE_URL.replace('utm_source=website', `utm_source=${quelle}`), text: 'Google Play' },
  ].filter((l) => geraet === 'andere' || l.id === geraet);
}

export const HINWEIS_ZU = 'lernzeit_app_hinweis_zu';

/*
 * Steht der Hinweis einmal in der Seite (Anmeldung, Spiel), bleibt das
 * Banner oben (useAndroidAppBanner) fuer den Rest des Besuchs weg: sonst
 * steht dasselbe doppelt da, und das Banner deckt im Spiel den Kopf mit
 * dem Beenden-Knopf ab.
 */
let hinweisGezeigt = false;
const beobachter = new Set<() => void>();

export const hinweisWurdeGezeigt = () => hinweisGezeigt;

export function merkeHinweisGezeigt() {
  if (hinweisGezeigt) return;
  hinweisGezeigt = true;
  beobachter.forEach((b) => b());
}

export function beiHinweisGezeigt(b: () => void) {
  beobachter.add(b);
  return () => { beobachter.delete(b); };
}
