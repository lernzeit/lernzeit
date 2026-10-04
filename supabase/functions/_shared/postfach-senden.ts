// Mail aus dem Postfach info@lernzeit.app (IONOS-SMTP) verschicken.
// Gemeinsam fuer vertragserklaerung und abo-kuendigen (04.10.2026).
// Secret: IONOS_POSTFACH_PASSWORT.
import MailComposer from "npm:nodemailer@6.9.15/lib/mail-composer/index.js";
import { smtpSenden } from "./mailverbindung.ts";

export const POSTFACH = "info@lernzeit.app";
const SMTP_HOST = "smtp.ionos.de";

export async function postfachSenden(
  an: string,
  betreff: string,
  text: string,
  html: string,
  antwortAn?: string,
): Promise<string> {
  const roh: Uint8Array = await new MailComposer({
    from: { name: "LernZeit", address: POSTFACH },
    to: an,
    replyTo: antwortAn,
    subject: betreff,
    text,
    html,
  }).compile().build();
  return await smtpSenden(
    await Deno.connectTls({ hostname: SMTP_HOST, port: 465 }),
    { benutzer: POSTFACH, passwort: Deno.env.get("IONOS_POSTFACH_PASSWORT") ?? "" },
    POSTFACH,
    an,
    roh,
  );
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const FUSS_TEXT = [
  "--",
  "LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland",
  "Amtsgericht Jena, HRB 524759 · info@lernzeit.app · https://lernzeit.app",
].join("\n");

export const FUSS_HTML = `<p style="margin:16px 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland<br>
Amtsgericht Jena, HRB 524759 · <a href="mailto:info@lernzeit.app" style="color:#6b7280;">info@lernzeit.app</a> · <a href="https://lernzeit.app/impressum" style="color:#6b7280;">Impressum</a></p>`;
