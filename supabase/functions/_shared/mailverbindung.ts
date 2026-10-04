// Schlanker IMAP- und SMTP-Client ueber Deno.connectTls.
// Die npm-Bibliotheken (imapflow, nodemailer-Transport) laufen in der
// Supabase-Laufzeit nicht: Die Verbindung bricht direkt nach dem TLS-Aufbau ab
// ("ClosedAfterConnectTLS", 04.10.2026). Hier nur, was support-postfach braucht.

export interface Leitung {
  read(p: Uint8Array): Promise<number | null>;
  write(p: Uint8Array): Promise<number>;
  close(): void;
}

const enc = new TextEncoder();

/** Bytes 1:1 als Zeichen 0-255 (kein windows-1252 wie TextDecoder("latin1")). */
function bytesZuText(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
}

export function base64Utf8(s: string): string {
  let bin = "";
  for (const b of enc.encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function verbinde(a: Uint8Array, b: Uint8Array): Uint8Array {
  const r = new Uint8Array(a.length + b.length);
  r.set(a);
  r.set(b, a.length);
  return r;
}

async function schreibeAlles(l: Leitung, daten: Uint8Array) {
  let n = 0;
  while (n < daten.length) n += await l.write(daten.subarray(n));
}

/** Liest zeilen- und byteweise aus einer Leitung. */
class Leser {
  private puffer: Uint8Array = new Uint8Array(0);
  constructor(private l: Leitung, private frist = 30_000) {}

  private async mehr() {
    const stueck = new Uint8Array(65536);
    let zeit: ReturnType<typeof setTimeout> | undefined;
    const n = await Promise.race([
      this.l.read(stueck),
      new Promise<never>((_, nein) => { zeit = setTimeout(() => nein(new Error("Zeitueberschreitung beim Lesen")), this.frist); }),
    ]).finally(() => clearTimeout(zeit));
    if (n === null) throw new Error("Verbindung vom Server geschlossen");
    this.puffer = verbinde(this.puffer, stueck.subarray(0, n));
  }

  /** Eine Zeile ohne CRLF. */
  async zeile(): Promise<string> {
    for (;;) {
      const i = this.puffer.indexOf(10);
      if (i >= 0) {
        const z = this.puffer.subarray(0, i);
        this.puffer = this.puffer.subarray(i + 1);
        return bytesZuText(z).replace(/\r$/, "");
      }
      await this.mehr();
    }
  }

  async bytes(n: number): Promise<Uint8Array> {
    while (this.puffer.length < n) await this.mehr();
    const r = this.puffer.slice(0, n);
    this.puffer = this.puffer.subarray(n);
    return r;
  }
}

// ---------------------------------------------------------------- IMAP

/** Eine IMAP-Antwortzeile samt eingebetteter Literale ({n}-Bloecke). */
export interface Antwort {
  text: string;
  literale: Uint8Array[];
}

export class Imap {
  private leser: Leser;
  private nr = 0;

  private constructor(private l: Leitung) {
    this.leser = new Leser(l);
  }

  static async oeffnen(l: Leitung): Promise<Imap> {
    const c = new Imap(l);
    const gruss = await c.leser.zeile();
    if (!gruss.startsWith("* OK")) throw new Error(`IMAP-Begruessung: ${gruss.slice(0, 80)}`);
    return c;
  }

  private async antwort(): Promise<Antwort> {
    let text = "";
    const literale: Uint8Array[] = [];
    for (;;) {
      const z = await this.leser.zeile();
      const m = z.match(/\{(\d+)\}$/);
      if (!m) return { text: text + z, literale };
      text += z.slice(0, -m[0].length) + `{#${literale.length}}`;
      literale.push(await this.leser.bytes(Number(m[1])));
    }
  }

  /** Fuehrt einen Befehl aus; optional mit einem Literal am Ende (APPEND). */
  async befehl(cmd: string, literal?: Uint8Array): Promise<Antwort[]> {
    const tag = `L${++this.nr}`;
    const untagged: Antwort[] = [];
    if (literal) {
      await schreibeAlles(this.l, enc.encode(`${tag} ${cmd} {${literal.length}}\r\n`));
      const weiter = await this.antwort();
      if (!weiter.text.startsWith("+")) throw new Error(`IMAP ${cmd.split(" ")[0]}: ${weiter.text.slice(0, 120)}`);
      await schreibeAlles(this.l, verbinde(literal, enc.encode("\r\n")));
    } else {
      await schreibeAlles(this.l, enc.encode(`${tag} ${cmd}\r\n`));
    }
    for (;;) {
      const a = await this.antwort();
      if (a.text.startsWith(`${tag} `)) {
        if (!a.text.startsWith(`${tag} OK`)) {
          throw new Error(`IMAP ${cmd.split(" ")[0]}: ${a.text.slice(tag.length + 1, tag.length + 121)}`);
        }
        return untagged;
      }
      untagged.push(a);
    }
  }

  async anmelden(benutzer: string, passwort: string) {
    await this.befehl(`AUTHENTICATE PLAIN ${base64Utf8(`\u0000${benutzer}\u0000${passwort}`)}`);
  }

  async auswaehlen(ordner: string) {
    await this.befehl(`SELECT ${zitat(ordner)}`);
  }

  async suchenSeit(datum: Date): Promise<number[]> {
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][datum.getUTCMonth()];
    const res = await this.befehl(`UID SEARCH SINCE ${datum.getUTCDate()}-${mon}-${datum.getUTCFullYear()}`);
    const uids: number[] = [];
    for (const a of res) {
      const m = a.text.match(/^\* SEARCH\s*(.*)$/);
      if (m) uids.push(...m[1].trim().split(/\s+/).filter(Boolean).map(Number));
    }
    return uids;
  }

  /** Rohquelle einer Mail, ohne sie als gelesen zu markieren (hoechstens 300 KB; Anhaenge werden abgeschnitten). */
  async quelle(uid: number): Promise<Uint8Array | null> {
    const res = await this.befehl(`UID FETCH ${uid} (UID BODY.PEEK[]<0.300000>)`);
    for (const a of res) {
      if (/^\* \d+ FETCH /.test(a.text) && a.literale.length) return a.literale[0];
    }
    return null;
  }

  /** Ausgewaehlte Kopfzeilen mehrerer Mails in einem Befehl (wenig Rechenzeit). */
  async koepfe(uids: number[], felder: string[]): Promise<Map<number, Record<string, string>>> {
    const ergebnis = new Map<number, Record<string, string>>();
    if (!uids.length) return ergebnis;
    const res = await this.befehl(`UID FETCH ${uids.join(",")} (UID BODY.PEEK[HEADER.FIELDS (${felder.join(" ")})])`);
    for (const a of res) {
      const uid = a.text.match(/UID (\d+)/)?.[1];
      if (!/^\* \d+ FETCH /.test(a.text) || !uid || !a.literale.length) continue;
      ergebnis.set(Number(uid), kopfzeilenLesen(a.literale[0]));
    }
    return ergebnis;
  }

  async ordnerListe(): Promise<{ name: string; attribute: string[] }[]> {
    const res = await this.befehl(`LIST "" "*"`);
    const liste: { name: string; attribute: string[] }[] = [];
    for (const a of res) {
      const m = a.text.match(/^\* LIST \(([^)]*)\) (?:"(?:[^"\\]|\\.)*"|NIL) (.+)$/i);
      if (!m) continue;
      let name = m[2].trim();
      if (name.startsWith('"')) name = name.slice(1, -1).replace(/\\(.)/g, "$1");
      liste.push({ name, attribute: m[1].split(/\s+/).filter(Boolean) });
    }
    return liste;
  }

  async anhaengen(ordner: string, roh: Uint8Array, flags: string[]) {
    await this.befehl(`APPEND ${zitat(ordner)} (${flags.join(" ")})`, roh);
  }

  async flagsSetzen(uid: number, flags: string[]) {
    await this.befehl(`UID STORE ${uid} +FLAGS (${flags.join(" ")})`);
  }

  async abmelden() {
    try { await this.befehl("LOGOUT"); } catch { /* egal */ }
    try { this.l.close(); } catch { /* egal */ }
  }
}

function zitat(s: string): string {
  return `"${s.replace(/(["\\])/g, "\\$1")}"`;
}

// ---------------------------------------------------------------- SMTP

async function smtpAntwort(leser: Leser): Promise<{ code: number; text: string }> {
  let text = "";
  for (;;) {
    const z = await leser.zeile();
    text += z + "\n";
    if (/^\d{3} /.test(z) || /^\d{3}$/.test(z)) return { code: Number(z.slice(0, 3)), text: text.trim() };
    if (!/^\d{3}-/.test(z)) throw new Error(`SMTP: unerwartete Zeile ${z.slice(0, 80)}`);
  }
}

/** Sendet eine fertige Nachricht (CRLF-Zeilenenden) ueber SMTPS (Port 465). */
export async function smtpSenden(
  l: Leitung,
  zugang: { benutzer: string; passwort: string },
  von: string,
  an: string,
  roh: Uint8Array,
): Promise<string> {
  const leser = new Leser(l, 60_000);
  const schritt = async (zeile: string | null, erwartet: number[]) => {
    if (zeile !== null) await schreibeAlles(l, enc.encode(zeile + "\r\n"));
    const a = await smtpAntwort(leser);
    if (!erwartet.includes(a.code)) {
      const sicher = zeile?.startsWith("AUTH") ? "AUTH PLAIN ***" : zeile;
      throw new Error(`SMTP ${sicher ?? "Begruessung"}: ${a.text.slice(0, 160)}`);
    }
    return a.text;
  };
  try {
    await schritt(null, [220]);
    await schritt("EHLO lernzeit.app", [250]);
    await schritt(`AUTH PLAIN ${base64Utf8(`\u0000${zugang.benutzer}\u0000${zugang.passwort}`)}`, [235]);
    await schritt(`MAIL FROM:<${von}>`, [250]);
    await schritt(`RCPT TO:<${an}>`, [250, 251]);
    await schritt("DATA", [354]);
    let text = bytesZuText(roh).replace(/\r?\n/g, "\r\n");
    text = text.replace(/^\./, "..").replace(/\r\n\./g, "\r\n..");
    if (!text.endsWith("\r\n")) text += "\r\n";
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    await schreibeAlles(l, bytes);
    const ok = await schritt(".", [250]);
    try { await schritt("QUIT", [221]); } catch { /* egal */ }
    return ok;
  } finally {
    try { l.close(); } catch { /* egal */ }
  }
}

// ---------------------------------------------------------------- Kopfzeilen

/** Kopfzeilen (entfaltet, Namen klein, RFC-2047-Woerter dekodiert). */
export function kopfzeilenLesen(roh: Uint8Array): Record<string, string> {
  const text = bytesZuText(roh).replace(/\r\n[ \t]+/g, " ");
  const k: Record<string, string> = {};
  for (const z of text.split(/\r?\n/)) {
    const i = z.indexOf(":");
    if (i <= 0) continue;
    const name = z.slice(0, i).trim().toLowerCase();
    if (!(name in k)) k[name] = woerterDekodieren(z.slice(i + 1).trim());
  }
  return k;
}

function woerterDekodieren(s: string): string {
  return s
    .replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?)/g, "$1")
    .replace(/=\?([^?*]+)(?:\*[^?]*)?\?([bBqQ])\?([^?]*)\?=/g, (_, zs: string, art: string, inhalt: string) => {
      let bytes: Uint8Array;
      if (art.toUpperCase() === "B") {
        const bin = atob(inhalt);
        bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      } else {
        const t = inhalt.replace(/_/g, " ");
        const out: number[] = [];
        for (let i = 0; i < t.length; i++) {
          if (t[i] === "=" && /^[0-9a-fA-F]{2}$/.test(t.slice(i + 1, i + 3))) { out.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
          else out.push(t.charCodeAt(i) & 0xff);
        }
        bytes = Uint8Array.from(out);
      }
      try { return new TextDecoder(zs.trim().toLowerCase()).decode(bytes); } catch { return bytesZuText(bytes); }
    });
}

/** "Name <adresse>" -> { name, adresse } (erste Adresse). */
export function adresseLesen(s: string | undefined): { name: string; adresse: string } {
  if (!s) return { name: "", adresse: "" };
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), adresse: m[2].trim().toLowerCase() };
  const a = s.match(/[^\s<>,;"]+@[^\s<>,;"]+/);
  return { name: "", adresse: (a?.[0] ?? "").toLowerCase() };
}
