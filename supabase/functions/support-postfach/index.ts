// Support-Postfach info@lernzeit.app (IONOS) lesen und beantworten.
// Wunsch des Betreibers (04.10.2026): Claude sieht zweimal am Tag nach,
// beantwortet einfache Anleitungsfragen selbst und legt fuer alles andere
// einen Entwurf in den IONOS-Ordner "Entwuerfe". Leitfaden:
// docs/support/leitfaden.md.
//
// Aufruf nur mit dem Service-Role-Schluessel. Body { aktion, ... }:
//   ping                          TLS-Verbindung zu IMAP und SMTP, ohne Anmeldung
//   neu       { tage?: 14 }       Mails der letzten Tage, die noch nicht im
//                                 Protokoll stehen (Lesestatus bleibt unveraendert)
//   entwurf   { uid, text, form } Antwort als Entwurf in "Entwuerfe"
//   antworten { uid, text, form } Antwort senden (nur an den Absender, einmal je Mail)
//   erledigt  { uids, notiz }     ohne Antwort abhaken (Spam, Automatisches, Dank ohne Frage)
//
// Sicherungen: Empfaenger ist immer der Absender der Originalmail, wie ihn der
// Server liefert, nie ein Wert aus dem Aufruf. Keine Antwort an automatische
// Absender oder die eigene Domain. Hoechstens 10 gesendete Antworten am Tag.
// Secrets: IONOS_POSTFACH_PASSWORT (Benutzer ist info@lernzeit.app).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Buffer } from "node:buffer";
import { simpleParser } from "npm:mailparser@3.7.1";
import MailComposer from "npm:nodemailer@6.9.15/lib/mail-composer/index.js";
import { adresseLesen, Imap, smtpSenden } from "../_shared/mailverbindung.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BENUTZER = "info@lernzeit.app";
const PASSWORT = Deno.env.get("IONOS_POSTFACH_PASSWORT") ?? "";
const IMAP_HOST = "imap.ionos.de";
const SMTP_HOST = "smtp.ionos.de";
const ABSENDER = { name: "LernZeit Kunden-Support", address: BENUTZER };
const HOECHSTENS_PRO_TAG = 10;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Form = "du" | "sie";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Absender, denen nie geantwortet wird. */
function automatisch(adresse: string): boolean {
  const a = adresse.toLowerCase();
  return a.endsWith("@lernzeit.app") || a.endsWith(".lernzeit.app") ||
    /(^|[._-])(no[-_]?reply|do[-_]?not[-_]?reply|mailer-daemon|postmaster|bounces?|notifications?)([._@-]|$)/.test(a);
}

// ---------------------------------------------------------------- Signatur

function gruss(form: Form) {
  return form === "du" ? "Dein Kunden-Support von LernZeit" : "Ihr Kunden-Support von LernZeit";
}

const FUSS_TEXT = [
  "LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland",
  "Sitz der Gesellschaft: Erfurt · Amtsgericht Jena, HRB 524759",
  "info@lernzeit.app · https://lernzeit.app",
].join("\n");

function fussHtml() {
  return `<p style="margin:16px 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland<br>
Sitz der Gesellschaft: Erfurt · Amtsgericht Jena, HRB 524759<br>
<a href="mailto:info@lernzeit.app" style="color:#6b7280;">info@lernzeit.app</a> · <a href="https://lernzeit.app" style="color:#6b7280;">lernzeit.app</a> ·
<a href="https://lernzeit.app/impressum" style="color:#6b7280;">Impressum</a> · <a href="https://lernzeit.app/datenschutz" style="color:#6b7280;">Datenschutz</a></p>`;
}

// ---------------------------------------------------------------- IMAP

/** Angemeldete Verbindung, INBOX ausgewaehlt. */
async function imap<T>(arbeit: (c: Imap) => Promise<T>): Promise<T> {
  const c = await Imap.oeffnen(await Deno.connectTls({ hostname: IMAP_HOST, port: 993 }));
  try {
    await c.anmelden(BENUTZER, PASSWORT);
    await c.auswaehlen("INBOX");
    return await arbeit(c);
  } finally {
    await c.abmelden();
  }
}

/** Ordner per Sonderkennzeichen (\\Drafts, \\Sent) oder ueblichem Namen. */
async function ordner(c: Imap, art: "\\Drafts" | "\\Sent", namen: string[]): Promise<string> {
  const liste = await c.ordnerListe();
  const treffer = liste.find((o) => o.attribute.some((a) => a.toLowerCase() === art.toLowerCase())) ??
    liste.find((o) => namen.some((n) => o.name.toLowerCase() === n.toLowerCase()));
  if (!treffer) throw new Error(`Ordner fuer ${art} nicht gefunden: ${liste.map((o) => o.name).join(", ")}`);
  return treffer.name;
}

interface Mail {
  uid: number;
  message_id: string;
  von: string;
  von_name: string;
  betreff: string;
  datum: string;
  text: string;
  anhaenge: string[];
  referenzen: string[];
  automatisch: boolean;
}

async function mailLesen(c: Imap, uid: number): Promise<Mail | null> {
  const quelle = await c.quelle(uid);
  return quelle ? await zerlegen(uid, quelle) : null;
}

async function zerlegen(uid: number, quelle: Uint8Array): Promise<Mail> {
  // mailparser braucht einen Buffer; ein Uint8Array haelt es fuer einen Stream.
  const p = await simpleParser(Buffer.from(quelle));
  const von = p.from?.value?.[0];
  const refs = Array.isArray(p.references) ? p.references : p.references ? [p.references] : [];
  const adresse = (p.replyTo?.value?.[0]?.address ?? von?.address ?? "").toLowerCase();
  return {
    uid,
    message_id: p.messageId ?? `uid-${uid}`,
    von: adresse,
    von_name: von?.name ?? "",
    betreff: p.subject ?? "",
    datum: (p.date ?? new Date()).toISOString(),
    text: (p.text ?? "").slice(0, 8000),
    anhaenge: (p.attachments ?? []).map((a: { filename?: string; contentType: string }) => a.filename ?? a.contentType),
    referenzen: refs,
    automatisch: automatisch(adresse) || Boolean(p.headers.get("auto-submitted") && p.headers.get("auto-submitted") !== "no"),
  };
}

// ---------------------------------------------------------------- Antwort bauen

function antwortNachricht(orig: Mail, text: string, form: Form) {
  const betreff = /^(aw|re|antw):/i.test(orig.betreff) ? orig.betreff : `AW: ${orig.betreff}`;
  const datum = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" })
    .format(new Date(orig.datum));
  const zitatText = orig.text.split("\n").map((z) => `> ${z}`).join("\n");
  const absaetze = text.trim().split(/\n{2,}/).map((a) => `<p style="margin:0 0 14px;">${esc(a).replace(/\n/g, "<br>")}</p>`).join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;">
${absaetze}
<p style="margin:18px 0 0;">Viele Grüße<br>${gruss(form)}</p>
${fussHtml()}
<p style="margin:20px 0 6px;font-size:13px;color:#6b7280;">Am ${esc(datum)} schrieb ${esc(orig.von_name || orig.von)}:</p>
<blockquote style="margin:0;padding-left:12px;border-left:3px solid #e5e7eb;color:#6b7280;font-size:13px;">${esc(orig.text).replace(/\n/g, "<br>")}</blockquote>
</div>`;
  const klartext = `${text.trim()}\n\nViele Grüße\n${gruss(form)}\n\n--\n${FUSS_TEXT}\n\nAm ${datum} schrieb ${orig.von_name || orig.von}:\n${zitatText}`;
  return {
    from: ABSENDER,
    to: orig.von_name ? { name: orig.von_name, address: orig.von } : orig.von,
    subject: betreff,
    text: klartext,
    html,
    inReplyTo: orig.message_id,
    references: [...orig.referenzen, orig.message_id],
  };
}

async function protokoll(eintrag: Record<string, unknown>) {
  const { error } = await supabase.from("support_postfach_protokoll").insert(eintrag);
  if (error) throw new Error(`Protokoll: ${error.message}`);
}

// ---------------------------------------------------------------- Ping

async function tlsGruss(host: string, port: number): Promise<string> {
  const conn = await Deno.connectTls({ hostname: host, port });
  try {
    const puffer = new Uint8Array(512);
    const n = await Promise.race([
      conn.read(puffer),
      new Promise<null>((_, nein) => setTimeout(() => nein(new Error("Zeitueberschreitung")), 8000)),
    ]);
    return new TextDecoder().decode(puffer.subarray(0, n ?? 0)).trim().slice(0, 120);
  } finally {
    conn.close();
  }
}

// ---------------------------------------------------------------- Server

Deno.serve(async (req) => {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!SUPABASE_SERVICE_ROLE_KEY || bearer !== SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Nicht berechtigt" }, 401);
  }
  let body: { aktion?: string; tage?: number; uid?: number; uids?: number[]; text?: string; form?: Form; notiz?: string } = {};
  try { body = await req.json(); } catch { /* leer */ }

  try {
    if (body.aktion === "ping") {
      const [imapGruss, smtpGruss] = await Promise.allSettled([tlsGruss(IMAP_HOST, 993), tlsGruss(SMTP_HOST, 465)]);
      return json({
        imap: imapGruss.status === "fulfilled" ? imapGruss.value : String(imapGruss.reason),
        smtp: smtpGruss.status === "fulfilled" ? smtpGruss.value : String(smtpGruss.reason),
        passwort_gesetzt: PASSWORT.length > 0,
      });
    }

    if (!PASSWORT) return json({ error: "Secret IONOS_POSTFACH_PASSWORT fehlt" }, 500);

    if (body.aktion === "neu") {
      // Zuerst nur Kopfzeilen (billig), dann hoechstens PRO_AUFRUF Mails ganz
      // lesen: Edge Functions haben nur wenig CPU-Zeit je Aufruf.
      const PRO_AUFRUF = 5;
      const tage = Math.min(Math.max(body.tage ?? 14, 1), 60);
      const seit = new Date(Date.now() - tage * 86_400_000);
      const ergebnis = await imap(async (c) => {
        const uids = (await c.suchenSeit(seit)).slice(-200);
        const koepfe = await c.koepfe(uids, ["MESSAGE-ID", "FROM", "REPLY-TO", "SUBJECT", "DATE", "AUTO-SUBMITTED"]);
        const liste = uids.map((uid) => {
          const k = koepfe.get(uid)?.kopf ?? {};
          const von = adresseLesen(k["reply-to"] || k["from"]);
          return {
            uid,
            message_id: (k["message-id"] ?? "").trim() || `uid-${uid}`,
            von: von.adresse,
            von_name: adresseLesen(k["from"]).name,
            betreff: k["subject"] ?? "",
            datum: k["date"] ?? "",
            automatisch: automatisch(von.adresse) || Boolean(k["auto-submitted"] && k["auto-submitted"] !== "no"),
            // Vom Betreiber schon selbst beantwortet (Kennzeichen im Postfach)
            beantwortet: (koepfe.get(uid)?.flags ?? []).includes("\\Answered"),
          };
        });
        const ids = liste.map((m) => m.message_id);
        const { data: erledigt } = await supabase.from("support_postfach_protokoll")
          .select("message_id").in("message_id", ids.length ? ids : ["-"]);
        const bekannt = new Set((erledigt ?? []).map((e) => e.message_id));
        const offen = liste.filter((m) => !bekannt.has(m.message_id) && !m.beantwortet);
        // Automatische Mails nur mit Kopfzeilen melden, Kundenmails ganz lesen.
        const automatische = offen.filter((m) => m.automatisch);
        const kunden = offen.filter((m) => !m.automatisch);
        const gelesen: Mail[] = [];
        for (const m of kunden.slice(0, PRO_AUFRUF)) {
          const voll = await mailLesen(c, m.uid);
          if (voll) gelesen.push(voll);
        }
        const schonBeantwortet = liste.filter((m) => m.beantwortet && !bekannt.has(m.message_id)).length;
        return { mails: gelesen, automatische, weitere: Math.max(0, kunden.length - PRO_AUFRUF), schon_beantwortet: schonBeantwortet };
      });
      return json({ anzahl: ergebnis.mails.length, ...ergebnis });
    }

    if (body.aktion === "erledigt") {
      // Ohne Antwort abhaken; auch mehrere auf einmal (uids). Liest nur Kopfzeilen.
      const uids = (body.uids ?? (body.uid ? [body.uid] : [])).filter((u) => Number.isInteger(u)).slice(0, 200);
      if (!uids.length) return json({ error: "uid oder uids fehlt" }, 400);
      const koepfe = await imap((c) => c.koepfe(uids, ["MESSAGE-ID", "FROM", "REPLY-TO", "SUBJECT"]));
      const zeilen = uids.flatMap((uid) => {
        const k = koepfe.get(uid)?.kopf;
        if (!k) return [];
        return [{
          message_id: (k["message-id"] ?? "").trim() || `uid-${uid}`,
          uid,
          aktion: "erledigt",
          an: adresseLesen(k["reply-to"] || k["from"]).adresse,
          betreff: k["subject"] ?? "",
          text: body.notiz ?? null,
        }];
      });
      if (zeilen.length) {
        const { error } = await supabase.from("support_postfach_protokoll").insert(zeilen);
        if (error) throw new Error(`Protokoll: ${error.message}`);
      }
      return json({ ok: true, erledigt: zeilen.length, nicht_gefunden: uids.length - zeilen.length });
    }

    if (body.aktion === "entwurf" || body.aktion === "antworten") {
      if (!body.uid || !body.text?.trim()) return json({ error: "uid und text noetig" }, 400);
      const form: Form = body.form === "du" ? "du" : "sie";

      if (body.aktion === "antworten") {
        const { count } = await supabase.from("support_postfach_protokoll")
          .select("id", { count: "exact", head: true })
          .eq("aktion", "antwort").gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
        if ((count ?? 0) >= HOECHSTENS_PRO_TAG) return json({ error: "Tageshoechstzahl erreicht – bitte als Entwurf" }, 429);
      }

      const ergebnis = await imap(async (c) => {
        const orig = await mailLesen(c, body.uid!);
        if (!orig) return { fehler: "Mail nicht gefunden", status: 404 };
        if (orig.automatisch || !orig.von) return { fehler: "Automatischer Absender – keine Antwort", status: 400 };
        const { data: schon } = await supabase.from("support_postfach_protokoll")
          .select("aktion").eq("message_id", orig.message_id).in("aktion", ["antwort", "entwurf"]);
        if (schon?.length) return { fehler: `Zu dieser Mail gibt es schon: ${schon.map((s) => s.aktion).join(", ")}`, status: 409 };

        const nachricht = antwortNachricht(orig, body.text!, form);
        const roh: Uint8Array = await new MailComposer(nachricht).compile().build();

        if (body.aktion === "entwurf") {
          const pfad = await ordner(c, "\\Drafts", ["Entwürfe", "Entw&APw-rfe", "Drafts"]);
          await c.anhaengen(pfad, roh, ["\\Draft", "\\Seen"]);
          await protokoll({ message_id: orig.message_id, uid: orig.uid, aktion: "entwurf", an: orig.von, betreff: nachricht.subject, text: body.text });
          return { ok: true, aktion: "entwurf", ordner: pfad, an: orig.von };
        }

        const smtp = await smtpSenden(
          await Deno.connectTls({ hostname: SMTP_HOST, port: 465 }),
          { benutzer: BENUTZER, passwort: PASSWORT }, BENUTZER, orig.von, roh,
        );
        await protokoll({ message_id: orig.message_id, uid: orig.uid, aktion: "antwort", an: orig.von, betreff: nachricht.subject, text: body.text, gesendet_id: smtp.slice(0, 200) });

        // Kopie in "Gesendet", Original als beantwortet markieren.
        try {
          const gesendet = await ordner(c, "\\Sent", ["Gesendete Objekte", "Gesendet", "Sent"]);
          await c.anhaengen(gesendet, roh, ["\\Seen"]);
        } catch (e) { console.warn("Kopie in Gesendet fehlgeschlagen", e); }
        await c.flagsSetzen(orig.uid, ["\\Answered", "\\Seen"]);
        return { ok: true, aktion: "antwort", an: orig.von };
      });
      if ("fehler" in ergebnis) return json({ error: ergebnis.fehler }, ergebnis.status);
      return json(ergebnis);
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("support-postfach", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
