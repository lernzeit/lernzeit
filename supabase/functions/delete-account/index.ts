import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DELETE-ACCOUNT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User verified", { userId, email: userEmail });

    // Check for active Stripe subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && userEmail) {
      const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const subs = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            logStep("Active Stripe subscription found, blocking deletion");
            return new Response(
              JSON.stringify({
                error: "active_subscription",
                message: "Bitte kündige zuerst dein Premium-Abo über die Abo-Verwaltung, bevor du deinen Account löschst.",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      } catch (stripeErr) {
        logStep("Stripe check failed (proceeding)", { error: String(stripeErr) });
      }
    }

    // Delete user data from all tables (order matters for FK constraints)
    const deletions = [
      { table: "screen_time_requests", conditions: [{ col: "child_id", val: userId }, { col: "parent_id", val: userId }] },
      { table: "child_settings", conditions: [{ col: "child_id", val: userId }, { col: "parent_id", val: userId }] },
      { table: "child_subject_visibility", conditions: [{ col: "child_id", val: userId }, { col: "parent_id", val: userId }] },
      { table: "invitation_codes", conditions: [{ col: "parent_id", val: userId }] },
      { table: "learning_plans", conditions: [{ col: "parent_id", val: userId }, { col: "child_id", val: userId }] },
      { table: "daily_request_summary", conditions: [{ col: "user_id", val: userId }] },
      { table: "game_sessions", conditions: [{ col: "user_id", val: userId }] },
      { table: "learning_sessions", conditions: [{ col: "user_id", val: userId }] },
      { table: "user_achievements", conditions: [{ col: "user_id", val: userId }] },
      { table: "user_difficulty_profiles", conditions: [{ col: "user_id", val: userId }] },
      { table: "user_earned_minutes", conditions: [{ col: "user_id", val: userId }] },
      { table: "daily_challenges", conditions: [{ col: "user_id", val: userId }] },
      { table: "review_queue", conditions: [{ col: "user_id", val: userId }] },
      { table: "parent_child_relationships", conditions: [{ col: "parent_id", val: userId }, { col: "child_id", val: userId }] },
      { table: "subscriptions", conditions: [{ col: "user_id", val: userId }] },
      { table: "user_roles", conditions: [{ col: "user_id", val: userId }] },
      { table: "profiles", conditions: [{ col: "id", val: userId }] },
    ];

    for (const del of deletions) {
      for (const cond of del.conditions) {
        const { error } = await supabaseAdmin
          .from(del.table)
          .delete()
          .eq(cond.col, cond.val);
        if (error) {
          logStep(`Warning: delete from ${del.table}.${cond.col} failed`, { error: error.message });
        }
      }
    }
    logStep("All user data deleted");

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      logStep("Error deleting auth user", { error: deleteError.message });
      return new Response(
        JSON.stringify({ error: "Fehler beim Löschen des Auth-Accounts: " + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Auth user deleted successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("Unexpected error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
