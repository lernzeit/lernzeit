/**
 * Elterncode (17.10.2026): sechs Ziffern, die alle 30 Minuten
 * wechseln. Das Elternteil sieht ihn in seiner App (RPC `notfallcode_anzeigen`),
 * das Kinder-Handy prüft ihn OHNE Internet mit demselben Schlüssel.
 *
 * Verfahren wie bei Zwei-Faktor-Apps: HOTP (RFC 4226) mit HMAC-SHA-256,
 * Zähler = Unix-Zeit / 1800. Angenommen werden Zähler -1, 0 und +1 — ein
 * Code gilt so mindestens 30 Minuten, auch wenn die Uhren etwas abweichen.
 * Muss mit `notfallcode_berechnen()` in der Datenbank übereinstimmen
 * (`npm run test:reise` prüft feste Werte aus SQL).
 *
 * Eigenes SHA-256 statt Web Crypto: synchron, und es läuft in jeder
 * WebView, auch wenn `crypto.subtle` fehlt.
 */

export const SCHRITT_SEKUNDEN = 1800;
export const FEHLVERSUCHE_BIS_PAUSE = 5;
export const PAUSE_NACH_FEHLVERSUCHEN_MS = 15 * 60_000;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(daten: Uint8Array): Uint8Array {
  const laenge = daten.length;
  const bloecke = Math.ceil((laenge + 9) / 64);
  const puffer = new Uint8Array(bloecke * 64);
  puffer.set(daten);
  puffer[laenge] = 0x80;
  const bits = laenge * 8;
  const ansicht = new DataView(puffer.buffer);
  ansicht.setUint32(puffer.length - 8, Math.floor(bits / 0x100000000));
  ansicht.setUint32(puffer.length - 4, bits >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let b = 0; b < bloecke; b++) {
    for (let i = 0; i < 16; i++) w[i] = ansicht.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + bb) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const aus = new Uint8Array(32);
  const ausAnsicht = new DataView(aus.buffer);
  h.forEach((wert, i) => ausAnsicht.setUint32(i * 4, wert));
  return aus;
}

export function hmacSha256(schluessel: Uint8Array, nachricht: Uint8Array): Uint8Array {
  let k = schluessel.length > 64 ? sha256(schluessel) : schluessel;
  const block = new Uint8Array(64);
  block.set(k);
  k = block;
  const innen = new Uint8Array(64 + nachricht.length);
  const aussen = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) { innen[i] = k[i] ^ 0x36; aussen[i] = k[i] ^ 0x5c; }
  innen.set(nachricht, 64);
  aussen.set(sha256(innen), 64);
  return sha256(aussen);
}

export function hexZuBytes(hex: string): Uint8Array {
  const sauber = hex.trim().toLowerCase();
  if (!/^([0-9a-f]{2})+$/.test(sauber)) throw new Error('kein Hex');
  const aus = new Uint8Array(sauber.length / 2);
  for (let i = 0; i < aus.length; i++) aus[i] = parseInt(sauber.slice(i * 2, i * 2 + 2), 16);
  return aus;
}

/** Code für einen Zähler (wie `notfallcode_berechnen` in SQL). */
export function codeFuerZaehler(schluessel: Uint8Array, zaehler: number): string {
  const nachricht = new Uint8Array(8);
  const ansicht = new DataView(nachricht.buffer);
  ansicht.setUint32(0, Math.floor(zaehler / 0x100000000));
  ansicht.setUint32(4, zaehler >>> 0);
  const h = hmacSha256(schluessel, nachricht);
  const o = h[31] & 15;
  const zahl = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(zahl % 1_000_000).padStart(6, '0');
}

export function zaehlerZu(jetztMs: number): number {
  return Math.floor(jetztMs / 1000 / SCHRITT_SEKUNDEN);
}

/** Passt der eingegebene Code? Leerzeichen werden ignoriert. */
export function codePasst(schluesselHex: string, eingabe: string, jetztMs: number = Date.now()): boolean {
  const code = eingabe.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  let schluessel: Uint8Array;
  try { schluessel = hexZuBytes(schluesselHex); } catch { return false; }
  const z = zaehlerZu(jetztMs);
  return [z - 1, z, z + 1].some((zaehler) => codeFuerZaehler(schluessel, zaehler) === code);
}

// ── Sperre nach Fehlversuchen ──────────────────────────────────────────────

export interface Fehlversuche {
  anzahl: number;
  /** Bis wann keine Eingabe möglich ist (ms), 0 = frei. */
  gesperrtBis: number;
}

export function nachFehlversuch(stand: Fehlversuche, jetztMs: number): Fehlversuche {
  const anzahl = stand.anzahl + 1;
  if (anzahl >= FEHLVERSUCHE_BIS_PAUSE) return { anzahl: 0, gesperrtBis: jetztMs + PAUSE_NACH_FEHLVERSUCHEN_MS };
  return { anzahl, gesperrtBis: stand.gesperrtBis };
}

export function istGesperrt(stand: Fehlversuche, jetztMs: number): boolean {
  return stand.gesperrtBis > jetztMs;
}
