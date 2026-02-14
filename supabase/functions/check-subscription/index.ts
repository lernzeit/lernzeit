import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PREMIUM_PRODUCT_ID = "prod_TyldQAhtysrjzz";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a child – if so, look up parent's email
    let emailToCheck = user.email;
    const { data: relationship } = await supabaseClient
      .from('parent_child_relationships')
      .select('parent_id')
      .eq('child_id', user.id)
      .maybeSingle();

    if (relationship?.parent_id) {
      const { data: parentUser } = await supabaseClient.auth.admin.getUserById(relationship.parent_id);
      if (parentUser?.user?.email) {
        emailToCheck = parentUser.user.email;
        logStep("Child account, checking parent subscription", { parentEmail: emailToCheck });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing
    let activeSub = subscriptions.data.length > 0 ? subscriptions.data[0] : null;
    if (!activeSub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      activeSub = trialingSubs.data.length > 0 ? trialingSubs.data[0] : null;
    }

    if (!activeSub) {
      logStep("No active/trialing subscription found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
    const productId = activeSub.items.data[0].price.product;
    const isPremium = productId === PREMIUM_PRODUCT_ID;
    const trialEnd = activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null;

    logStep("Subscription found", {
      status: activeSub.status,
      productId,
      isPremium,
      subscriptionEnd,
      trialEnd,
    });

    // Sync to subscriptions table
    await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: relationship?.parent_id || user.id,
        plan: isPremium ? 'premium' : 'free',
        status: activeSub.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSub.id,
        current_period_start: new Date(activeSub.current_period_start * 1000).toISOString(),
        current_period_end: subscriptionEnd,
        trial_end: trialEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      subscribed: isPremium,
      product_id: productId,
      status: activeSub.status,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
