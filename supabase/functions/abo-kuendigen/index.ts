// Web-Abo (Stripe) im Eltern-Bereich kuendigen (04.10.2026).
//
// Regeln (Nutzungsbedingungen 6.1/6.2, Entscheidung des Betreibers):
// Monatsabo und Jahresabo im ersten Jahr enden zum Ende des laufenden
// Zeitraums. Ein stillschweigend verlaengertes Jahresabo endet einen Monat
// nach der Kuendigung; der im Voraus bezahlte Rest wird anteilig erstattet.
// Berechnung: _shared/abo-kuendigung.ts.
//
// Das Stripe-Kundenportal bietet deshalb keine Kuendigung mehr an (es
// koennte nur "zum Ende des Zeitraums"), siehe customer-portal.
//
// Body: { aktion: "vorschau" | "kuendigen" }. Nur angemeldet (Konto-E-Mail
// = Stripe-Kunde). Jede Kuendigung landet in vertragserklaerungen
// (bearbeitet) und als Eingangsbestaetigung beim Kunden (§ 312k Abs. 4 BGB).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { kuendigungsplan, type Kuendigungsplan } from "../_shared/abo-kuendigung.ts";
import { esc, FUSS_HTML, FUSS_TEXT, POSTFACH, postfachSenden } from "../_shared/postfach-senden.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false },
});

const datum = (sek: number) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(sek * 1000));
const euro = (cent: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);

type Abo = Stripe.Subscription;

async function bezahltFuerZeitraum(stripe: Stripe, abo: Abo): Promise<{ cent: number; paymentIntent: string | null }> {
  const rechnungId = typeof abo.latest_invoice === "string" ? abo.latest_invoice : abo.latest_invoice?.id;
  if (!rechnungId) return { cent: 0, paymentIntent: null };
  const rechnung = await stripe.invoices.retrieve(rechnungId);
  let paymentIntent: string | null = null;
  try {
    // Seit API 2025-03-31.basil haengen Zahlungen an invoice_payments.
    const zahlungen = await (stripe as unknown as {
      invoicePayments: { list: (p: Record<string, unknown>) => Promise<{ data: Array<{ status?: string; payment?: { payment_intent?: string | { id: string } } }> }> };
    }).invoicePayments.list({ invoice: rechnungId, limit: 5 });
    const bezahlt = zahlungen.data.find((z) => z.status === "paid") ?? zahlungen.data[0];
    const pi = bezahlt?.payment?.payment_intent;
    paymentIntent = typeof pi === "string" ? pi : pi?.id ?? null;
  } catch (e) {
    console.warn("invoicePayments nicht lesbar", String(e).slice(0, 200));
  }
  return { cent: rechnung.amount_paid ?? 0, paymentIntent };
}

function planFuer(abo: Abo, bezahltCent: number): Kuendigungsplan {
  const posten = abo.items.data[0];
  const legacy = abo as unknown as { current_period_start?: number; current_period_end?: number };
  return kuendigungsplan(
    {
      intervall: posten?.price?.recurring?.interval ?? "month",
      start: abo.start_date,
      periodeStart: posten?.current_period_start ?? legacy.current_period_start ?? abo.start_date,
      periodeEnde: posten?.current_period_end ?? legacy.current_period_end ?? abo.start_date,
      bezahltCent,
    },
    Math.floor(Date.now() / 1000),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: nutzer } = await supabase.auth.getUser(token);
    const user = nutzer.user;
    if (!user?.email) return json({ error: "Bitte melde dich an." }, 401);

    let aktion = "vorschau";
    try { aktion = (await req.json())?.aktion === "kuendigen" ? "kuendigen" : "vorschau"; } catch { /* vorschau */ }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
    const kunden = await stripe.customers.list({ email: user.email, limit: 3 });
    let abo: Abo | undefined;
    for (const k of kunden.data) {
      const liste = await stripe.subscriptions.list({ customer: k.id, status: "all", limit: 10 });
      abo = liste.data.find((a) => ["active", "trialing", "past_due"].includes(a.status));
      if (abo) break;
    }
    if (!abo) return json({ error: "Wir finden kein laufendes Abo zu deinem Konto. Abos aus dem App Store oder von Google Play kündigst du dort." }, 404);

    const posten = abo.items.data[0];
    const jaehrlich = posten?.price?.recurring?.interval === "year";
    const bereitsZum = abo.cancel_at ?? (abo.cancel_at_period_end ? posten?.current_period_end : null);
    if (bereitsZum) {
      return json({ bereits_gekuendigt: true, ende: bereitsZum, ende_text: datum(bereitsZum), erstattung_cent: 0, tarif: jaehrlich ? "jährlich" : "monatlich" });
    }

    const bezahlt = jaehrlich ? await bezahltFuerZeitraum(stripe, abo) : { cent: 0, paymentIntent: null };
    const plan = planFuer(abo, bezahlt.cent);
    const antwort = {
      ende: plan.ende,
      ende_text: datum(plan.ende),
      erstattung_cent: plan.erstattungCent,
      erstattung_text: plan.erstattungCent > 0 ? euro(plan.erstattungCent) : null,
      regel: plan.regel,
      tarif: jaehrlich ? "jährlich" : "monatlich",
    };
    if (aktion === "vorschau") return json(antwort);

    // Kuendigen
    if (plan.zumPeriodenende) {
      await stripe.subscriptions.update(abo.id, { cancel_at_period_end: true });
    } else {
      await stripe.subscriptions.update(abo.id, { cancel_at: plan.ende, proration_behavior: "none" });
    }

    let erstattet = 0;
    let erstattungFehler: string | null = null;
    if (plan.erstattungCent > 0) {
      try {
        if (!bezahlt.paymentIntent) throw new Error("Zahlung zur Rechnung nicht gefunden");
        await stripe.refunds.create({
          payment_intent: bezahlt.paymentIntent,
          amount: plan.erstattungCent,
          metadata: { grund: "Kuendigung Jahresabo Folgejahr, anteilig", abo: abo.id },
        });
        erstattet = plan.erstattungCent;
      } catch (e) {
        erstattungFehler = String(e).slice(0, 300);
        console.error("Erstattung fehlgeschlagen", erstattungFehler);
      }
    }

    const eingang = new Date();
    const wann = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(eingang);
    const name = (user.user_metadata?.name as string | undefined) || user.email;
    await supabase.from("vertragserklaerungen").insert({
      erklaerung: "kuendigung",
      name,
      email: user.email,
      vertrag: jaehrlich ? "web_jahr" : "web_monat",
      kuendigungsart: "ordentlich",
      zum: "naechstmoeglich",
      nutzer_id: user.id,
      eingegangen_am: eingang.toISOString(),
      bearbeitet_am: erstattungFehler ? null : eingang.toISOString(),
      notiz: `Automatisch im Eltern-Bereich: Ende ${datum(plan.ende)}, Regel ${plan.regel}` +
        (plan.erstattungCent ? `, Erstattung ${euro(plan.erstattungCent)} ${erstattungFehler ? `FEHLGESCHLAGEN: ${erstattungFehler}` : "angewiesen"}` : ""),
    });

    const zeilen: [string, string][] = [
      ["Erklärung", "Ordentliche Kündigung"],
      ["Vertrag", `LernZeit Premium, ${antwort.tarif} (Website)`],
      ["Premium endet am", datum(plan.ende)],
      ...(plan.erstattungCent > 0 ? [["Erstattung", `${euro(plan.erstattungCent)} für die Zeit nach dem Ende`] as [string, string]] : []),
      ["Eingegangen am", `${wann} Uhr (deutsche Zeit)`],
    ];
    const erstattungSatz = plan.erstattungCent > 0
      ? erstattungFehler
        ? `Die Erstattung von ${euro(plan.erstattungCent)} veranlassen wir in den nächsten Tagen von Hand.`
        : `Die ${euro(plan.erstattungCent)} gehen in den nächsten Tagen auf dasselbe Zahlungsmittel zurück.`
      : "";
    const text = [
      `Hallo,`, "", "wir haben deine Kündigung erhalten:", "",
      ...zeilen.map(([k, v]) => `${k}: ${v}`), "",
      `Bis zum ${datum(plan.ende)} kannst du Premium weiter nutzen; dein kostenloses Konto bleibt bestehen. ${erstattungSatz}`.trim(),
      "", "Viele Grüße", "Dein LernZeit-Team", "", FUSS_TEXT,
    ].join("\n");
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;">
<p style="margin:0 0 14px;">Hallo,</p><p style="margin:0 0 14px;">wir haben deine Kündigung erhalten:</p>
<table style="border-collapse:collapse;margin:0 0 16px;font-size:14px;">${zeilen.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;">${esc(k)}</td><td style="padding:4px 0;color:#1a2b6d;font-weight:bold;">${esc(v)}</td></tr>`).join("")}</table>
<p style="margin:0 0 14px;">Bis zum ${esc(datum(plan.ende))} kannst du Premium weiter nutzen; dein kostenloses Konto bleibt bestehen. ${esc(erstattungSatz)}</p>
<p style="margin:18px 0 0;">Viele Grüße<br>Dein LernZeit-Team</p>${FUSS_HTML}</div>`;
    let gesendet = false;
    try { await postfachSenden(user.email, "Eingangsbestätigung: Kündigung deines LernZeit-Abos", text, html); gesendet = true; }
    catch (e) { console.error("Bestaetigung nicht gesendet", String(e).slice(0, 200)); }
    try {
      await postfachSenden(POSTFACH, `[Kündigung, automatisch] ${antwort.tarif} – ${user.email}`,
        `${text}\n\nBestätigung an Kunden: ${gesendet ? "gesendet" : "FEHLGESCHLAGEN"}${erstattungFehler ? `\nERSTATTUNG VON HAND: ${euro(plan.erstattungCent)} (${erstattungFehler})` : ""}`, html, user.email);
    } catch { /* Kopie ist nur Information */ }

    return json({ ...antwort, gekuendigt: true, erstattet_cent: erstattet, bestaetigung_gesendet: gesendet });
  } catch (e) {
    console.error("abo-kuendigen", String(e).slice(0, 300));
    return json({ error: `Das hat nicht geklappt. Bitte nutze „Verträge hier kündigen“ auf der Support-Seite oder schreib an ${POSTFACH}.` }, 500);
  }
});
