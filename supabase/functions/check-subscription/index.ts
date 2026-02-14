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

// Default values matching the DB column defaults
const DEFAULT_CHILD_SETTINGS = {
  weekday_max_minutes: 30,
  weekend_max_minutes: 60,
  math_seconds_per_task: 30,
  german_seconds_per_task: 30,
  english_seconds_per_task: 30,
  geography_seconds_per_task: 30,
  history_seconds_per_task: 30,
  latin_seconds_per_task: 30,
  chemistry_seconds_per_task: 30,
  biology_seconds_per_task: 30,
  physics_seconds_per_task: 30,
};

/**
 * Resets premium settings for all children of a parent when subscription lapses.
 * - child_settings → default values
 * - child_subject_visibility → deleted (all subjects become visible by default)
 */
async function resetPremiumSettings(supabaseClient: any, parentId: string) {
  logStep("Resetting premium settings for parent", { parentId });

  // Reset child_settings to defaults
  const { data: settingsData, error: settingsError } = await supabaseClient
    .from('child_settings')
    .update(DEFAULT_CHILD_SETTINGS)
    .eq('parent_id', parentId);

  if (settingsError) {
    logStep("Error resetting child_settings", { error: settingsError.message });
  } else {
    logStep("child_settings reset to defaults");
  }

  // Delete all custom subject visibility entries (defaults = all visible)
  const { error: visibilityError } = await supabaseClient
    .from('child_subject_visibility')
    .delete()
    .eq('parent_id', parentId);

  if (visibilityError) {
    logStep("Error deleting child_subject_visibility", { error: visibilityError.message });
  } else {
    logStep("child_subject_visibility entries deleted");
  }
}

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

    const parentOrUserId = relationship?.parent_id || user.id;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      // Check if there was a previous premium subscription that needs resetting
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', parentOrUserId)
        .maybeSingle();

      if (existingSub && existingSub.plan === 'premium' && existingSub.status !== 'canceled') {
        logStep("Previous premium subscription detected, resetting settings");
        await resetPremiumSettings(supabaseClient, parentOrUserId);
        await supabaseClient
          .from('subscriptions')
          .update({ plan: 'free', status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', parentOrUserId);
      }

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

      // Premium lapsed – check if we need to reset settings
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', parentOrUserId)
        .maybeSingle();

      if (existingSub && existingSub.plan === 'premium' &&
          existingSub.status !== 'canceled' && existingSub.status !== 'expired') {
        logStep("Subscription lapsed, resetting premium settings");
        await resetPremiumSettings(supabaseClient, parentOrUserId);

        await supabaseClient
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', parentOrUserId);
      }

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
        user_id: parentOrUserId,
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
