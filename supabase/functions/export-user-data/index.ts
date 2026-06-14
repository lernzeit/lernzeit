import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) =>
  console.log(`[EXPORT-USER-DATA] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

/**
 * Tables that store data the requesting user owns directly via `user_id` (or `id` on profiles).
 * Each entry: tableName + filter column.
 */
const USER_OWNED_TABLES: Array<{ table: string; column: string }> = [
  { table: "profiles", column: "id" },
  { table: "subscriptions", column: "user_id" },
  { table: "user_roles", column: "user_id" },
  { table: "user_achievements", column: "user_id" },
  { table: "user_earned_minutes", column: "user_id" },
  { table: "user_streak_states", column: "user_id" },
  { table: "user_difficulty_profiles", column: "user_id" },
  { table: "game_sessions", column: "user_id" },
  { table: "learning_sessions", column: "user_id" },
  { table: "child_settings", column: "child_id" },
  { table: "child_subject_visibility", column: "child_id" },
  { table: "daily_request_summary", column: "user_id" },
  { table: "push_tokens", column: "user_id" },
  { table: "question_feedback", column: "user_id" },
  { table: "parent_feedback", column: "user_id" },
  { table: "referral_codes", column: "user_id" },
  { table: "premium_grants", column: "user_id" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;
    log("Export started", { userId });

    // 1. Direct user data
    const direct: Record<string, unknown> = {};
    for (const { table, column } of USER_OWNED_TABLES) {
      const { data, error } = await admin.from(table).select("*").eq(column, userId);
      if (error) {
        log(`Skip ${table}`, error.message);
        direct[table] = { error: error.message };
      } else {
        direct[table] = data ?? [];
      }
    }

    // 2. Parent-child relationships (where user is parent or child)
    const { data: relAsParent } = await admin
      .from("parent_child_relationships")
      .select("*")
      .eq("parent_id", userId);
    const { data: relAsChild } = await admin
      .from("parent_child_relationships")
      .select("*")
      .eq("child_id", userId);

    const relationships = [...(relAsParent ?? []), ...(relAsChild ?? [])];

    // 3. Referrals (as referrer or referee)
    const { data: refAsReferrer } = await admin
      .from("referrals")
      .select("*")
      .eq("referrer_id", userId);
    const { data: refAsReferee } = await admin
      .from("referrals")
      .select("*")
      .eq("referee_id", userId);

    // 4. Screen time requests (parent + child)
    const { data: strAsParent } = await admin
      .from("screen_time_requests")
      .select("*")
      .eq("parent_id", userId);
    const { data: strAsChild } = await admin
      .from("screen_time_requests")
      .select("*")
      .eq("child_id", userId);

    // 5. Learning plans (parent or child)
    const { data: plansAsParent } = await admin
      .from("learning_plans")
      .select("*")
      .eq("parent_id", userId);
    const { data: plansAsChild } = await admin
      .from("learning_plans")
      .select("*")
      .eq("child_id", userId);

    const payload = {
      meta: {
        export_format: "json",
        export_version: "1.0",
        generated_at: new Date().toISOString(),
        legal_basis: "DSGVO Art. 20 (Recht auf Datenübertragbarkeit)",
        user_id: userId,
        user_email: userEmail,
        notice:
          "Diese Datei enthält alle personenbezogenen Daten, die LernZeit zu diesem Konto gespeichert hat.",
      },
      account: direct,
      parent_child_relationships: relationships,
      referrals: [...(refAsReferrer ?? []), ...(refAsReferee ?? [])],
      screen_time_requests: [...(strAsParent ?? []), ...(strAsChild ?? [])],
      learning_plans: [...(plansAsParent ?? []), ...(plansAsChild ?? [])],
    };

    log("Export ready", {
      userId,
      tables: Object.keys(direct).length,
      relationships: relationships.length,
    });

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lernzeit-datenexport-${userId}.json"`,
      },
    });
  } catch (err) {
    log("Error", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: "Daten-Export konnte nicht erstellt werden." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});