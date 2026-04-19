// Sends OneSignal push notifications based on database trigger events
// or scheduled cron jobs. Uses ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushPayload {
  userIds: string[];
  title: string;
  message: string;
  data?: Record<string, unknown>;
  /** When true, only send to users with profiles.daily_push_enabled = true */
  respectDailyToggle?: boolean;
}

async function sendOneSignalPush(payload: PushPayload): Promise<unknown> {
  if (!payload.userIds.length) {
    console.log("No recipients, skipping push");
    return { skipped: true };
  }

  let recipientIds = payload.userIds;

  // For daily/optional pushes, filter out users who disabled them
  if (payload.respectDailyToggle) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, daily_push_enabled")
      .in("id", recipientIds);
    const allowed = new Set(
      (profs ?? []).filter((p) => p.daily_push_enabled !== false).map((p) => p.id),
    );
    recipientIds = recipientIds.filter((id) => allowed.has(id));
    if (!recipientIds.length) {
      console.log("All recipients have daily push disabled, skipping");
      return { skipped: true, reason: "daily_push_disabled" };
    }
  }

  // Look up player_ids for the given user_ids
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("player_id")
    .in("user_id", recipientIds);

  if (error) {
    console.error("Error fetching push tokens:", error);
    throw error;
  }

  const playerIds = (tokens ?? []).map((t) => t.player_id).filter(Boolean);

  if (!playerIds.length) {
    console.log("No registered devices for users:", payload.userIds);
    return { skipped: true, reason: "no_devices" };
  }

  const body = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: payload.title, de: payload.title },
    contents: { en: payload.message, de: payload.message },
    data: payload.data ?? {},
    android_channel_id: undefined,
    priority: 10,
  };

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("OneSignal response:", res.status, text);

  if (!res.ok) {
    throw new Error(`OneSignal error ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function getChildName(childId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", childId)
    .maybeSingle();
  return data?.name?.trim() || "Dein Kind";
}

async function handleEvent(event: string, body: Record<string, unknown>) {
  switch (event) {
    case "screen_time_request_new": {
      const childName = await getChildName(body.child_id as string);
      return sendOneSignalPush({
        userIds: [body.parent_id as string],
        title: "📱 Neue Bildschirmzeit-Anfrage",
        message: `${childName} möchte ${body.requested_minutes} Minuten Bildschirmzeit.`,
        data: { type: "screen_time_request_new", request_id: body.request_id },
      });
    }
    case "screen_time_approved": {
      return sendOneSignalPush({
        userIds: [body.child_id as string],
        title: "🎉 Bildschirmzeit genehmigt!",
        message: `Deine Eltern haben ${body.requested_minutes} Minuten freigegeben!`,
        data: { type: "screen_time_approved", request_id: body.request_id },
      });
    }
    case "screen_time_denied": {
      return sendOneSignalPush({
        userIds: [body.child_id as string],
        title: "Bildschirmzeit abgelehnt",
        message:
          (body.parent_response as string) ||
          "Deine Anfrage wurde leider abgelehnt.",
        data: { type: "screen_time_denied", request_id: body.request_id },
      });
    }
    case "parent_daily_summary": {
      // Cron job: 18:00 send summary to all parents about each linked child's day
      return sendDailyParentSummaries();
    }
    case "child_learning_reminder": {
      // Cron job: 16:00 remind children who haven't learned today
      return sendChildLearningReminders();
    }
    default:
      throw new Error(`Unknown event: ${event}`);
  }
}

async function sendDailyParentSummaries() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: relations } = await supabase
    .from("parent_child_relationships")
    .select("parent_id, child_id");

  const results: unknown[] = [];
  for (const rel of relations ?? []) {
    if (!rel.parent_id || !rel.child_id) continue;

    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("correct_answers, total_questions, time_earned")
      .eq("user_id", rel.child_id)
      .gte("session_date", `${today}T00:00:00.000Z`)
      .lte("session_date", `${today}T23:59:59.999Z`);

    const totalQuestions = (sessions ?? []).reduce(
      (sum, s) => sum + (s.total_questions || 0),
      0,
    );
    const correctAnswers = (sessions ?? []).reduce(
      (sum, s) => sum + (s.correct_answers || 0),
      0,
    );
    const timeEarned = (sessions ?? []).reduce(
      (sum, s) => sum + (s.time_earned || 0),
      0,
    );

    if (totalQuestions === 0) continue;

    const childName = await getChildName(rel.child_id);
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    results.push(
      await sendOneSignalPush({
        userIds: [rel.parent_id],
        title: `📊 Tagesbericht: ${childName}`,
        message: `${totalQuestions} Aufgaben gelöst (${accuracy}% richtig), ${timeEarned} Min. verdient.`,
        data: { type: "parent_daily_summary", child_id: rel.child_id },
      }).catch((e) => ({ error: String(e) })),
    );
  }
  return { sent: results.length };
}

async function sendChildLearningReminders() {
  const today = new Date().toISOString().slice(0, 10);

  // All children
  const { data: children } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "child");

  const results: unknown[] = [];
  for (const child of children ?? []) {
    const { count } = await supabase
      .from("learning_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", child.id)
      .gte("session_date", `${today}T00:00:00.000Z`);

    if ((count ?? 0) > 0) continue; // already learned today

    results.push(
      await sendOneSignalPush({
        userIds: [child.id],
        title: "🎯 Zeit zum Lernen!",
        message: "Du hast heute noch nicht gelernt. Sammel jetzt Bildschirmzeit!",
        data: { type: "child_learning_reminder" },
      }).catch((e) => ({ error: String(e) })),
    );
  }
  return { sent: results.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const event = body.event as string;

    if (!event) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await handleEvent(event, body);
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
