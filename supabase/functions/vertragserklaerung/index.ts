// Kuendigung (§ 312k BGB) und Widerruf (§ 356a BGB) ueber die Website,
// ohne Anmeldung (04.10.2026). Seiten: /kuendigen und /widerruf.
//
// Ablauf: Erklaerung pruefen, in public.vertragserklaerungen speichern, dem
// Verbraucher sofort eine Eingangsbestaetigung per E-Mail schicken (Inhalt,
// Datum und Uhrzeit des Eingangs, gewuenschter Zeitpunkt) und eine Kopie an
// info@lernzeit.app. Die Kuendigung bzw. Erstattung selbst erledigt der
// Betreiber von Hand in Stripe (siehe docs/support/leitfaden.md) – eine
// automatische Kuendigung allein anhand einer eingetippten E-Mail-Adresse
// waere fuer Fremde zu leicht ausloesbar.
//
// Body: { erklaerung, name, email, vertrag, kuendigungsart?, grund?, zum?, firma? }
// `firma` ist ein unsichtbares Feld gegen Formular-Roboter und muss leer sein.
// Secrets: IONOS_POSTFACH_PASSWORT (Absender info@lernzeit.app).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { esc, POSTFACH, postfachSenden } from "../_shared/postfach-senden.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HOECHSTENS_JE_ADRESSE = 3; // in 24 Stunden
const HOECHSTENS_INSGESAMT = 100; // in 24 Stunden

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const VERTRAEGE: Record<string, string> = {
  web_monat: "LernZeit Premium, monatlich (Website)",
  web_jahr: "LernZeit Premium, jährlich (Website)",
  app_store: "LernZeit Premium über den Apple App Store",
  google_play: "LernZeit Premium über Google Play",
  unbekannt: "LernZeit Premium (Tarif nicht angegeben)",
};

type Erklaerung = {
  erklaerung: "kuendigung" | "widerruf";
  name: string;
  email: string;
  vertrag: keyof typeof VERTRAEGE;
  kuendigungsart?: "ordentlich" | "ausserordentlich";
  grund?: string;
  zum?: string;
};

function pruefen(b: Record<string, unknown>): Erklaerung | string {
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const erklaerung = b.erklaerung;
  if (erklaerung !== "kuendigung" && erklaerung !== "widerruf") return "Unbekannte Erklärung.";
  const name = text(b.name, 120);
  if (name.length < 2) return "Bitte gib deinen Namen an.";
  const email = text(b.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Bitte gib eine gültige E-Mail-Adresse an.";
  const vertrag = typeof b.vertrag === "string" && b.vertrag in VERTRAEGE ? (b.vertrag as Erklaerung["vertrag"]) : "unbekannt";
  const e: Erklaerung = { erklaerung, name, email, vertrag };
  if (erklaerung === "kuendigung") {
    e.kuendigungsart = b.kuendigungsart === "ausserordentlich" ? "ausserordentlich" : "ordentlich";
    e.grund = text(b.grund, 2000);
    if (e.kuendigungsart === "ausserordentlich" && e.grund.length < 3) return "Bitte nenne den Grund für die außerordentliche Kündigung.";
    const zum = text(b.zum, 10);
    e.zum = /^\d{4}-\d{2}-\d{2}$/.test(zum) ? zum : "naechstmoeglich";
  }
  return e;
}

function zeitpunktText(e: Erklaerung): string {
  if (e.erklaerung === "widerruf") return "sofort (Widerruf)";
  if (e.kuendigungsart === "ausserordentlich") return "fristlos (außerordentliche Kündigung)";
  if (!e.zum || e.zum === "naechstmoeglich") return "zum nächstmöglichen Zeitpunkt";
  const [j, m, t] = e.zum.split("-");
  return `zum ${t}.${m}.${j} (frühestens zum nächstmöglichen Zeitpunkt)`;
}

function nachricht(e: Erklaerung, eingang: Date, id: string) {
  const wann = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(eingang);
  const was = e.erklaerung === "kuendigung" ? "Kündigung" : "Widerruf";
  const zeilen: [string, string][] = [
    ["Erklärung", e.erklaerung === "kuendigung" ? `${e.kuendigungsart === "ausserordentlich" ? "Außerordentliche" : "Ordentliche"} Kündigung` : "Widerruf des Vertrags"],
    ["Vertrag", VERTRAEGE[e.vertrag]],
    ["Name", e.name],
    ["E-Mail-Adresse", e.email],
    ["Beenden", zeitpunktText(e)],
    ...(e.grund ? [["Grund / Hinweis", e.grund] as [string, string]] : []),
    ["Eingegangen am", `${wann} Uhr (deutsche Zeit)`],
    ["Vorgangsnummer", id.slice(0, 8).toUpperCase()],
  ];
  const einleitung = e.erklaerung === "kuendigung"
    ? "wir haben deine Kündigung erhalten. Hier ist der Inhalt, so wie er bei uns eingegangen ist:"
    : "wir haben deinen Widerruf erhalten. Hier ist der Inhalt, so wie er bei uns eingegangen ist:";
  const weiter = e.vertrag === "app_store" || e.vertrag === "google_play"
    ? "Wichtig: Ein Abo aus dem App Store oder von Google Play verlängert der jeweilige Store. Bitte beende es zusätzlich in den Abo-Einstellungen deiner Apple-ID bzw. in Google Play unter „Zahlungen und Abos“, sonst kann der Store weiter abbuchen."
    : e.erklaerung === "kuendigung"
      ? "Wir bearbeiten deine Kündigung und schreiben dir, zu welchem Datum dein Abo endet. Premium bleibt bis dahin nutzbar; dein kostenloses Konto bleibt bestehen."
      : "Wir erstatten dir alle Zahlungen für diesen Vertrag spätestens binnen 14 Tagen über dasselbe Zahlungsmittel und melden uns, sobald das erledigt ist. Dein kostenloses Konto bleibt bestehen.";
  const text = [
    `Hallo ${e.name},`,
    "",
    einleitung,
    "",
    ...zeilen.map(([k, v]) => `${k}: ${v}`),
    "",
    weiter,
    "",
    "Wenn du das nicht warst, antworte bitte kurz auf diese E-Mail.",
    "",
    "Viele Grüße",
    "Dein LernZeit-Team",
    "",
    "--",
    "LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland",
    "Amtsgericht Jena, HRB 524759 · info@lernzeit.app · https://lernzeit.app",
  ].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;">
<p style="margin:0 0 14px;">Hallo ${esc(e.name)},</p>
<p style="margin:0 0 14px;">${esc(einleitung)}</p>
<table style="border-collapse:collapse;margin:0 0 16px;font-size:14px;">${zeilen
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;vertical-align:top;">${esc(k)}</td><td style="padding:4px 0;color:#1a2b6d;font-weight:bold;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>
<p style="margin:0 0 14px;">${esc(weiter)}</p>
<p style="margin:0 0 14px;">Wenn du das nicht warst, antworte bitte kurz auf diese E-Mail.</p>
<p style="margin:18px 0 0;">Viele Grüße<br>Dein LernZeit-Team</p>
<p style="margin:16px 0 0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
LernZeit UG (haftungsbeschränkt) · Drachengasse 10 · 99084 Erfurt · Deutschland<br>
Amtsgericht Jena, HRB 524759 · <a href="mailto:info@lernzeit.app" style="color:#6b7280;">info@lernzeit.app</a> · <a href="https://lernzeit.app/impressum" style="color:#6b7280;">Impressum</a></p>
</div>`;
  return { betreff: `Eingangsbestätigung: ${was} deines LernZeit-Abos`, text, html, wann };
}

const senden = postfachSenden;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  // Formular-Roboter fuellen das unsichtbare Feld aus: so tun, als sei alles gut.
  if (typeof body.firma === "string" && body.firma.trim() !== "") return json({ ok: true });

  const e = pruefen(body);
  if (typeof e === "string") return json({ error: e }, 400);

  const seit = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: jeAdresse }, { count: insgesamt }] = await Promise.all([
    supabase.from("vertragserklaerungen").select("id", { count: "exact", head: true }).eq("email", e.email).gte("eingegangen_am", seit),
    supabase.from("vertragserklaerungen").select("id", { count: "exact", head: true }).gte("eingegangen_am", seit),
  ]);
  if ((jeAdresse ?? 0) >= HOECHSTENS_JE_ADRESSE || (insgesamt ?? 0) >= HOECHSTENS_INSGESAMT) {
    return json({ error: `Zu viele Erklärungen in kurzer Zeit. Bitte schreib uns an ${POSTFACH}.` }, 429);
  }

  // Angemeldet? Dann die Nutzer-ID mit ablegen (hilft beim Zuordnen, Pflicht ist es nicht).
  let nutzerId: string | null = null;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token) {
    try {
      const { data } = await supabase.auth.getUser(token);
      nutzerId = data.user?.id ?? null;
    } catch { /* anonym */ }
  }

  const { data: zeile, error } = await supabase
    .from("vertragserklaerungen")
    .insert({
      erklaerung: e.erklaerung,
      name: e.name,
      email: e.email,
      vertrag: e.vertrag,
      kuendigungsart: e.kuendigungsart ?? null,
      grund: e.grund || null,
      zum: e.zum ?? null,
      nutzer_id: nutzerId,
    })
    .select("id, eingegangen_am")
    .single();
  if (error || !zeile) {
    console.error("Speichern fehlgeschlagen", error);
    return json({ error: `Die Erklärung konnte nicht gespeichert werden. Bitte schreib uns an ${POSTFACH}.` }, 500);
  }

  const eingang = new Date(zeile.eingegangen_am);
  const m = nachricht(e, eingang, zeile.id);
  let gesendet = false;
  let fehler: string | null = null;
  try {
    await senden(e.email, m.betreff, m.text, m.html);
    gesendet = true;
  } catch (err) {
    fehler = String(err).slice(0, 300);
    console.error("Bestaetigung nicht gesendet", fehler);
  }
  try {
    await senden(POSTFACH, `[${e.erklaerung === "kuendigung" ? "Kündigung" : "Widerruf"}] ${VERTRAEGE[e.vertrag]} – ${e.email}`,
      `${m.text}\n\nBestätigung an den Kunden: ${gesendet ? "gesendet" : `FEHLGESCHLAGEN (${fehler})`}\nNutzer-ID: ${nutzerId ?? "nicht angemeldet"}`,
      m.html, e.email);
  } catch (err) {
    console.error("Kopie an das Postfach nicht gesendet", String(err).slice(0, 300));
  }
  await supabase.from("vertragserklaerungen")
    .update(gesendet ? { bestaetigung_gesendet_am: new Date().toISOString() } : { bestaetigung_fehler: fehler })
    .eq("id", zeile.id);

  return json({
    ok: true,
    vorgang: zeile.id.slice(0, 8).toUpperCase(),
    eingegangen_am: zeile.eingegangen_am,
    eingegangen_text: m.wann,
    zeitpunkt: zeitpunktText(e),
    bestaetigung_gesendet: gesendet,
  });
});
