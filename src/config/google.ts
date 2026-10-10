/**
 * Anmeldung mit Google direkt bei Google statt über Supabase (06.10.2026).
 *
 * Über Supabase zeigte Google „Weiter zu fsmgynpdfxkaiiuguqyr.supabase.co“ –
 * viele Eltern brachen dort ab (seit 29.09. keine einzige Google-Anmeldung aus
 * den Apps). Direkt zeigt Google „lernzeit.app“ bzw. „LernZeit“. Supabase
 * bekommt nur noch Googles ID-Token (signInWithIdToken).
 *
 * Jeder Weg hat einen Schalter: Er geht erst an, wenn die passende Einstellung
 * in der Google Cloud Console steht (docs/google-anmeldung.md). Bis dahin
 * bleibt der bisherige Weg über Supabase aktiv.
 */

/** Web-Client (Google Cloud → Anmeldedaten, Typ Webanwendung); auch Supabase nutzt ihn. */
export const GOOGLE_WEB_CLIENT_ID = '249121461672-1jjba17n9sagviqjani0jj3h4cj94jef.apps.googleusercontent.com';

/**
 * Website: true, sobald beim Web-Client die Weiterleitungs-URIs
 * https://lernzeit.app/google-rueckkehr.html und
 * https://www.lernzeit.app/google-rueckkehr.html eingetragen sind.
 */
export const GOOGLE_WEB_BEREIT = true; // 10.10.2026: Rücksprungadressen bei Google eingetragen (scripts/pruefe-google-rueckkehr.sh)

/** Nur hier ist die Rücksprungadresse bei Google eingetragen (nicht in Vorschau/lokal). */
export const GOOGLE_WEB_HOSTS = ['lernzeit.app', 'www.lernzeit.app'];

/**
 * iOS-Client (Typ iOS, Bundle-ID de.lernzeit.app). Leer = bisheriger Weg.
 * codemagic.yaml liest diesen Wert und trägt das URL-Schema in die Info.plist
 * ein – ohne Schema bricht Googles Bibliothek beim Antippen ab.
 * In Supabase unter Authentication → Providers → Google → Client IDs ergänzen.
 */
export const GOOGLE_IOS_CLIENT_ID = '249121461672-okt1ljt5guu46pr5hlv8seveue1ffena.apps.googleusercontent.com';

/**
 * Android: true, sobald ein Android-Client (Paket de.lernzeit.app, SHA-1 des
 * Play-App-Signaturschlüssels und des eigenen Upload-Schlüssels) angelegt ist.
 */
export const GOOGLE_ANDROID_BEREIT = false;
