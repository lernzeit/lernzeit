import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(
    `[GRANT-TESTER-REWARD] ${step}${details ? " - " + JSON.stringify(details) : ""}`,
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Manual JWT extraction (matches project's edge auth pattern)
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      log("auth_failed", { error: userErr?.message });
      return new Response(
        JSON.stringify({ ok: false, error: "auth_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userRes.user.id;

    // 1) Verify the user is a founding family
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("is_founding_family")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile?.is_founding_family) {
      log("not_founding", { userId });
      return new Response(
        JSON.stringify({ ok: false, error: "not_founding_family" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Idempotency — has reward already been granted?
    const { data: existing } = await supabase
      .from("premium_grants")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "tester_feedback")
      .limit(1);
    if (existing && existing.length > 0) {
      log("already_granted", { userId });
      return new Response(
        JSON.stringify({ ok: true, already_granted: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Verify a tester feedback record exists
    const { data: feedback } = await supabase
      .from("parent_feedback")
      .select("id")
      .eq("user_id", userId)
      .eq("is_tester_feedback", true)
      .limit(1);
    if (!feedback || feedback.length === 0) {
      log("no_tester_feedback", { userId });
      return new Response(
        JSON.stringify({ ok: false, error: "no_tester_feedback_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Apply grant (3 months) via SQL helper
    const { error: rpcErr } = await supabase.rpc("apply_premium_grant", {
      p_user_id: userId,
      p_months: 3,
      p_reason: "tester_feedback",
      p_source_ref: feedback[0].id,
    });
    if (rpcErr) throw rpcErr;

    log("granted", { userId, months: 3 });
    return new Response(
      JSON.stringify({ ok: true, months: 3 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", { msg });
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});