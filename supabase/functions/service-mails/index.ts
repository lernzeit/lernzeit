// Service-Mails an Eltern ueber OneSignal: Hilfe beim Einrichten und Hinweis
// auf das Ende der Testphase. Auswahl und Protokoll in der Datenbank
// (Migration 20261003230000_service_mails.sql), Texte in
// _shared/service-mail-vorlagen.ts.
//
// Aufruf nur mit dem Service-Role-Schluessel (Cron). Body:
//   {}                        Probelauf: zeigt, wer heute eine Mail bekaeme
//   { "senden": true }        verschickt sie und protokolliert jede Mail
//   { "test_an": "x@lernzeit.app", "art": "einrichtung" }
//                             Beispielmail an eine eigene Adresse
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type Art, GESCHAEFTSFUEHRUNG, vorlage } from "../_shared/service-mail-vorlagen.ts";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Obergrenze je Lauf, falls die Auswahl einmal falsch greift. */
const HOECHSTENS = 50;

interface Kandidat {
  user_id: string;
  email: string;
  name: string | null;
  art: Art;
  bezug: string;
  testphase_ende: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function onesignalSenden(
  an: string,
  art: Art,
  daten: { name: string | null; testphaseEnde?: string | null },
  optionen: { idempotenz?: string; trotzAbmeldung?: boolean },
): Promise<{ ok: boolean; id: string | null; antwort: string }> {
  const mail = vorlage(art, daten);
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      name: `service-mail ${art}`,
      email_to: [an],
      email_subject: mail.betreff,
      email_preheader: mail.vorschau,
      email_body: mail.html,
      email_from_name: "LernZeit",
      email_from_address: "hallo@post.lernzeit.app",
      email_reply_to_address: "info@lernzeit.app",
      email_sender_domain: "post.lernzeit.app",
      disable_email_click_tracking: true,
      // Abmeldungen gelten; nur Beispielmails an eigene Adressen gehen trotzdem raus.
      include_unsubscribed: optionen.trotzAbmeldung === true,
      ...(optionen.idempotenz ? { idempotency_key: optionen.idempotenz } : {}),
    }),
  });
  const antwort = await res.text();
  let id: string | null = null;
  try {
    const j = JSON.parse(antwort);
    id = typeof j.id === "string" && j.id ? j.id : null;
    // OneSignal meldet abgemeldete oder ungueltige Adressen mit 200 und Fehlern.
    if (j.errors) return { ok: false, id, antwort };
  } catch { /* Antwort bleibt als Text im Protokoll */ }
  return { ok: res.ok && id !== null, id, antwort };
}

Deno.serve(async (req) => {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!SUPABASE_SERVICE_ROLE_KEY || bearer !== SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Nicht berechtigt" }, 401);
  }
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return json({ error: "OneSignal ist nicht eingerichtet" }, 500);
  }

  let body: { senden?: boolean; test_an?: string; art?: Art } = {};
  try { body = await req.json(); } catch { /* leerer Body = Probelauf */ }

  // Beispielmail an eine eigene Adresse, ohne Protokoll.
  if (body.test_an) {
    const an = body.test_an.trim().toLowerCase();
    if (!an.endsWith("@lernzeit.app")) {
      return json({ error: "Beispielmails nur an Adressen unter lernzeit.app" }, 400);
    }
    const arten: Art[] = body.art ? [body.art] : ["einrichtung", "testphase_endet"];
    const ende = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const ergebnisse = [];
    for (const art of arten) {
      ergebnisse.push({ art, ...(await onesignalSenden(an, art, { name: "Alex", testphaseEnde: ende }, { trotzAbmeldung: true })) });
    }
    return json({ test: true, ergebnisse });
  }

  const { data, error } = await supabase.rpc("service_mail_kandidaten");
  if (error) return json({ error: error.message }, 500);
  const kandidaten = (data ?? []) as Kandidat[];

  if (!body.senden) {
    return json({
      probelauf: true,
      anzahl: kandidaten.length,
      kandidaten: kandidaten.map((k) => ({ art: k.art, name: k.name, email: k.email, bezug: k.bezug })),
    });
  }

  if (!GESCHAEFTSFUEHRUNG) {
    return json({ error: "Geschäftsführung fehlt in der Signatur (_shared/service-mail-vorlagen.ts)" }, 409);
  }

  const ergebnis = { gesendet: 0, fehler: 0, uebersprungen: 0, ausgelassen: Math.max(0, kandidaten.length - HOECHSTENS) };
  for (const k of kandidaten.slice(0, HOECHSTENS)) {
    // Erst protokollieren, dann senden: der eindeutige Schluessel verhindert,
    // dass parallele oder wiederholte Laeufe doppelt verschicken.
    const { data: zeile, error: insErr } = await supabase
      .from("service_mail_versand")
      .insert({ user_id: k.user_id, art: k.art, bezug: k.bezug })
      .select("id")
      .single();
    if (insErr || !zeile) {
      ergebnis.uebersprungen++;
      continue;
    }
    try {
      const r = await onesignalSenden(k.email, k.art, { name: k.name, testphaseEnde: k.testphase_ende }, { idempotenz: zeile.id });
      await supabase.from("service_mail_versand").update({
        status: r.ok ? "gesendet" : "fehler",
        onesignal_id: r.id,
        fehler: r.ok ? null : r.antwort.slice(0, 1000),
      }).eq("id", zeile.id);
      if (r.ok) ergebnis.gesendet++; else ergebnis.fehler++;
    } catch (e) {
      await supabase.from("service_mail_versand").update({
        status: "fehler",
        fehler: String(e).slice(0, 1000),
      }).eq("id", zeile.id);
      ergebnis.fehler++;
    }
  }
  console.log("service-mails", JSON.stringify(ergebnis));
  return json(ergebnis);
});
