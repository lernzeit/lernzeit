import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) => console.log(`[CHECK-REFERRAL] ${s}`, d ?? "");

async function processReferee(supabase: any, refereeId: string) {
  const { data: refs } = await supabase
    .from("referrals")
    .select("id, referrer_id, referee_id, status, created_at")
    .eq("referee_id", refereeId)
    .eq("status", "invited");

  if (!refs || refs.length === 0) return;

  for (const ref of refs) {
    // Activation criteria: 7+ days since signup with >=1 session OR >=20 correct answers
    const ageDays =
      (Date.now() - new Date(ref.created_at).getTime()) / 86400000;

    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("correct_answers")
      .eq("user_id", refereeId);
    const totalCorrect = (sessions ?? []).reduce(
      (s: number, r: any) => s + (r.correct_answers || 0),
      0,
    );
    const sessionCount = sessions?.length ?? 0;

    const activated =
      (ageDays >= 7 && sessionCount >= 1) || totalCorrect >= 20;

    if (!activated) continue;

    // Grant +1 month to referrer (capped)
    const { data: cappedMonths } = await supabase.rpc("cap_referral_grant", {
      p_user_id: ref.referrer_id,
      p_requested: 1,
    });
    const months = Number(cappedMonths) || 0;
    if (months > 0) {
      await supabase.rpc("apply_premium_grant", {
        p_user_id: ref.referrer_id,
        p_months: months,
        p_reason: "referral_active",
        p_source_ref: ref.id,
      });
    }
    await supabase
      .from("referrals")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", ref.id);
    log("Activated referral", { id: ref.id, months });

    // Milestone check
    const { count: activeCount } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", ref.referrer_id)
      .in("status", ["active", "paying"]);

    const totalActive = activeCount ?? 0;
    for (const ms of [3, 5]) {
      if (totalActive >= ms) {
        const { data: existing } = await supabase
          .from("referral_milestones")
          .select("user_id")
          .eq("user_id", ref.referrer_id)
          .eq("milestone", ms)
          .maybeSingle();
        if (!existing) {
          const { data: cap } = await supabase.rpc("cap_referral_grant", {
            p_user_id: ref.referrer_id,
            p_requested: 1,
          });
          const m = Number(cap) || 0;
          if (m > 0) {
            await supabase.rpc("apply_premium_grant", {
              p_user_id: ref.referrer_id,
              p_months: m,
              p_reason: `milestone_${ms}`,
              p_source_ref: ref.id,
            });
          }
          await supabase
            .from("referral_milestones")
            .insert({ user_id: ref.referrer_id, milestone: ms });
          log("Milestone reached", { user: ref.referrer_id, milestone: ms });
        }
      }
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (body?.user_id) {
      await processReferee(supabase, body.user_id);
    } else {
      // Process all open referrals (cron)
      const { data: openRefs } = await supabase
        .from("referrals")
        .select("referee_id")
        .eq("status", "invited");
      const unique = Array.from(new Set((openRefs ?? []).map((r: any) => r.referee_id)));
      for (const id of unique) {
        await processReferee(supabase, id);
      }
      log("Cron pass complete", { processed: unique.length });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    log("ERROR", String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});