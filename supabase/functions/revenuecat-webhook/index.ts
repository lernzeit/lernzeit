/**
 * Nimmt RevenueCat-Ereignisse entgegen und trägt Store-Käufe in
 * `subscriptions` ein. Warum: siehe `_shared/revenuecat.ts`.
 *
 * Einrichtung (einmalig, beim Betreiber):
 *   1. Supabase → Edge Functions → Secrets: REVENUECAT_WEBHOOK_AUTH = ein
 *      langer Zufallswert
 *   2. RevenueCat → Integrations → Webhooks: URL dieser Funktion,
 *      Authorization-Header = derselbe Wert
 *
 * Ohne Secret lehnt die Funktion alles ab. Das ist Absicht: Wer diese
 * Adresse kennt, könnte sonst jedem Konto Premium eintragen.
 *
 * Antwortet mit 2xx, sobald ein Ereignis verarbeitet oder bewusst übergangen
 * ist; mit 5xx nur bei echten Fehlern — dann wiederholt RevenueCat.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { aenderungAus, nutzerId, type RcEreignis } from "../_shared/revenuecat.ts";

/** Muss mit PREMIUM_ENTITLEMENT_ID in src/services/revenueCat.ts übereinstimmen. */
const PREMIUM_RECHT = "premium";

const antwort = (status: number, inhalt: Record<string, unknown>) =>
  new Response(JSON.stringify(inhalt), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Vergleich in konstanter Zeit, damit die Laufzeit den Wert nicht verrät. */
function gleich(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return antwort(405, { fehler: "nur POST" });

  const geheim = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!geheim) {
    console.error("[REVENUECAT-WEBHOOK] REVENUECAT_WEBHOOK_AUTH ist nicht gesetzt — alles abgelehnt");
    return antwort(503, { fehler: "nicht eingerichtet" });
  }
  const kopf = req.headers.get("Authorization") ?? "";
  // RevenueCat schickt den eingetragenen Wert unverändert. Ob dort
  // „Bearer …" davorsteht, hängt davon ab, was eingetragen wurde.
  if (!gleich(kopf, geheim) && !gleich(kopf, `Bearer ${geheim}`)) {
    return antwort(401, { fehler: "nicht berechtigt" });
  }

  let e: RcEreignis;
  try {
    const body = await req.json();
    e = body?.event;
    if (!e?.id || !e?.type) throw new Error("event.id oder event.type fehlt");
  } catch (err) {
    return antwort(400, { fehler: String(err) });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const userId = nutzerId(e);

  // Protokoll zuerst, und zwar nur einmal je Ereignis: RevenueCat liefert
  // mindestens einmal, bei Zeitüberschreitung auch doppelt.
  const { data: neu, error: protokollFehler } = await db
    .from("revenuecat_events")
    .upsert({
      id: e.id,
      typ: e.type,
      user_id: userId,
      umgebung: e.environment ?? null,
      store: e.store ?? null,
      produkt: e.product_id ?? null,
      periode: e.period_type ?? null,
      gekauft_am: typeof e.purchased_at_ms === "number" ? new Date(e.purchased_at_ms).toISOString() : null,
      ablauf_am: typeof e.expiration_at_ms === "number" ? new Date(e.expiration_at_ms).toISOString() : null,
      kuendigungsgrund: e.cancel_reason ?? null,
    }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (protokollFehler) {
    console.error("[REVENUECAT-WEBHOOK] Protokoll", protokollFehler.message);
    return antwort(500, { fehler: "Protokoll fehlgeschlagen" });
  }
  if (!neu || neu.length === 0) {
    return antwort(200, { ergebnis: "schon verarbeitet" });
  }

  const vermerke = async (ergebnis: string) => {
    await db.from("revenuecat_events").update({ ergebnis }).eq("id", e.id);
  };

  if (!userId) {
    await vermerke("kein LernZeit-Nutzer im Ereignis");
    return antwort(200, { ergebnis: "kein Nutzer" });
  }

  const [{ data: stand }, { data: geschenke }] = await Promise.all([
    db.from("subscriptions").select("bezahlt_seit").eq("user_id", userId).maybeSingle(),
    db.from("premium_grants").select("months").eq("user_id", userId),
  ]);
  const monate = (geschenke ?? []).reduce((s, g) => s + (Number(g.months) || 0), 0);

  const aenderung = aenderungAus(e, stand ?? null, monate, PREMIUM_RECHT);
  if (aenderung.art === "ignorieren") {
    await vermerke(`übergangen: ${aenderung.grund}`);
    return antwort(200, { ergebnis: "übergangen", grund: aenderung.grund });
  }

  const { error: schreibFehler } = await db
    .from("subscriptions")
    .upsert({
      user_id: userId,
      // Ohne bestehende Zeile (sollte es nicht geben — sie entsteht bei der
      // Registrierung) braucht ein Kündigungs- oder Ablaufereignis trotzdem
      // Plan und Status. Ist das Ende schon erreicht, stuft
      // check-subscription beim nächsten Abgleich herab.
      ...(stand ? {} : { plan: "premium", status: "active" }),
      ...aenderung.felder,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (schreibFehler) {
    console.error("[REVENUECAT-WEBHOOK] subscriptions", schreibFehler.message);
    // Protokollzeile wieder freigeben, damit RevenueCats Wiederholung greift.
    await db.from("revenuecat_events").delete().eq("id", e.id);
    return antwort(500, { fehler: "Schreiben fehlgeschlagen" });
  }

  const ergebnis = `gesetzt: ${aenderung.felder.status ?? "Ende"} bis ${aenderung.felder.trial_end}`
    + (monate ? ` (inkl. ${monate} geschenkte Monate)` : "");
  await vermerke(ergebnis);
  console.log(`[REVENUECAT-WEBHOOK] ${e.type} ${userId}: ${ergebnis}`);
  return antwort(200, { ergebnis });
});
