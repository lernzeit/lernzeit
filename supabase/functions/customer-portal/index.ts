import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

const ALLOWED_ORIGINS = [
  "https://lernzeit.app",
  "https://www.lernzeit.app",
  "https://lernzeit.lovable.app",
];
const DEFAULT_ORIGIN = "https://lernzeit.app";

// Portal ohne Kuendigung (04.10.2026): Das Portal kann nur "zum Ende des
// Zeitraums" kuendigen. Ein verlaengertes Jahresabo muss aber mit einem Monat
// Frist enden (Nutzungsbedingungen 6.2) – das macht abo-kuendigen. Die
// Konfiguration wird beim ersten Aufruf angelegt und danach wiederverwendet.
let portalKonfiguration: string | null = null;
async function konfigurationOhneKuendigung(stripe: Stripe): Promise<string> {
  if (portalKonfiguration) return portalKonfiguration;
  const liste = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const vorhanden = liste.data.find((k) => k.metadata?.lernzeit === "ohne_kuendigung");
  if (vorhanden) return (portalKonfiguration = vorhanden.id);
  const neu = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "LernZeit Premium – Zahlungsdaten und Rechnungen",
      privacy_policy_url: "https://lernzeit.app/datenschutz",
      terms_of_service_url: "https://lernzeit.app/nutzungsbedingungen",
    },
    default_return_url: "https://lernzeit.app/",
    features: {
      customer_update: { enabled: true, allowed_updates: ["name", "email", "address"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    metadata: { lernzeit: "ohne_kuendigung" },
  });
  return (portalKonfiguration = neu.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const rawOrigin = req.headers.get("origin") ?? "";
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : DEFAULT_ORIGIN;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
      ...(await (async () => {
        // Darf der Schluessel keine Portal-Konfiguration anlegen, bleibt es beim
        // Standard-Portal (dort ist Kuendigen zum Periodenende weiter moeglich).
        try {
          return { configuration: await konfigurationOhneKuendigung(stripe) };
        } catch (e) {
          logStep("Portal-Konfiguration ohne Kuendigung nicht verfuegbar", { message: String(e).slice(0, 200) });
          return {};
        }
      })()),
    });
    logStep("Portal session created", { url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Kunden-Portal konnte nicht geöffnet werden." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
