/**
 * Normalisierung und Hashen personenbezogener Kennungen vor dem Versand an
 * Werbeplattformen.
 *
 * Die Vorgabe dazu ist nicht verhandelbar und steht in
 * docs/datenschutz-entwurf.md, § 8a: Eine E-Mail-Adresse verlaesst diese
 * Infrastruktur NIE im Klartext. Google und Meta bekommen ausschliesslich
 * einen SHA-256-Hashwert.
 *
 * Warum das ein eigenes Modul mit Tests ist und nicht drei Zeilen im
 * Versandcode: Der Hash ist nur dann etwas wert, wenn vorher richtig
 * normalisiert wurde. Zwei Schreibweisen derselben Adresse ergeben sonst zwei
 * verschiedene Hashes, die Plattform erkennt niemanden wieder, und die
 * Messung ist still wertlos. Umgekehrt ist ein Fehler in die andere Richtung
 * — zu viel wegnormalisieren — ein Datenschutzproblem, weil dann fremde
 * Adressen denselben Hash bekaemen.
 *
 * Google und Meta normalisieren NICHT gleich. Das ist kein Detail:
 *
 *   Google  Kleinschreibung, Leerraum weg, und bei gmail.com/googlemail.com
 *           zusaetzlich alle Punkte im lokalen Teil entfernen — Google
 *           behandelt max.mustermann@ und maxmustermann@ als dieselbe Adresse.
 *   Meta    Kleinschreibung und Leerraum weg. Sonst nichts.
 *
 * Wer fuer beide dieselbe Normalisierung nimmt, liefert einer der beiden
 * Plattformen Hashes, die sie nicht zuordnen kann.
 */

/** Sichtbarer Leerraum inklusive geschuetzter Leerzeichen. */
const LEERRAUM = /[\s ​]+/g;

function grundform(email: string): string {
  return email.replace(LEERRAUM, '').toLowerCase();
}

/**
 * Normalisierung fuer Google (Enhanced Conversions, Offline Conversion
 * Import).
 *
 * Der Punkt-Sonderfall gilt ausdruecklich nur fuer Googles eigene Domains.
 * Bei allen anderen sind Punkte im lokalen Teil bedeutungstragend — sie dort
 * zu entfernen wuerde verschiedene Menschen zusammenwerfen.
 */
export function normalisiereEmailGoogle(email: string): string {
  const roh = grundform(email);
  const at = roh.lastIndexOf('@');
  if (at <= 0) return roh;

  const lokal = roh.slice(0, at);
  const domain = roh.slice(at + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Auch das Plus-Suffix faellt weg: max+werbung@gmail.com landet bei
    // max@gmail.com, und Google zaehlt beide als dieselbe Person.
    const ohnePlus = lokal.split('+')[0];
    return `${ohnePlus.replace(/\./g, '')}@${domain}`;
  }
  return `${lokal}@${domain}`;
}

/** Normalisierung fuer Meta (Conversions API). Bewusst schlichter. */
export function normalisiereEmailMeta(email: string): string {
  return grundform(email);
}

/** SHA-256 als Kleinbuchstaben-Hex, so wie beide Plattformen es erwarten. */
export async function sha256Hex(wert: string): Promise<string> {
  const daten = new TextEncoder().encode(wert);
  const digest = await crypto.subtle.digest('SHA-256', daten);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Der Weg, den der Versandcode nimmt: aus einer Klartextadresse wird direkt
 * der fertige Hashwert. Die Zwischenstufe wird nirgends abgelegt.
 *
 * Eine leere oder offensichtlich unvollstaendige Adresse ergibt `null` statt
 * des Hashwerts einer leeren Zeichenkette. Sonst bekaeme jede Zeile ohne
 * E-Mail denselben Hash, und die Plattform saehe eine Person, die es nicht
 * gibt.
 */
export async function hashEmail(
  email: string | null | undefined,
  plattform: 'google' | 'meta',
): Promise<string | null> {
  if (!email) return null;
  const normalisiert = plattform === 'google'
    ? normalisiereEmailGoogle(email)
    : normalisiereEmailMeta(email);
  if (!normalisiert.includes('@') || normalisiert.startsWith('@') || normalisiert.endsWith('@')) {
    return null;
  }
  return await sha256Hex(normalisiert);
}
