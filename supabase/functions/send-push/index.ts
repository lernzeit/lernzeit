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

function toGermanSubject(subject: unknown): string {
  const key = String(subject ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    math: "Mathematik",
    german: "Deutsch",
    english: "Englisch",
    science: "Sachkunde",
    geography: "Geographie",
    history: "Geschichte",
    physics: "Physik",
    biology: "Biologie",
    chemistry: "Chemie",
    latin: "Latein",
  };
  return map[key] || (subject ? String(subject) : "");
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
    case "learning_plan_created": {
      const subject = toGermanSubject(body.subject) || "deinem Fach";
      const topic = (body.topic as string) || "";
      const message = topic
        ? `Deine Eltern haben einen Lernplan für ${subject} (${topic}) erstellt.`
        : `Deine Eltern haben einen Lernplan für ${subject} erstellt.`;
      return sendOneSignalPush({
        userIds: [body.child_id as string],
        title: "📚 Neuer Lernplan für dich!",
        message,
        data: {
          type: "learning_plan_created",
          plan_id: body.plan_id,
          subject: body.subject,
        },
      });
    }
    case "subject_priority_set": {
      const subject = toGermanSubject(body.subject) || "ein Fach";
      return sendOneSignalPush({
        userIds: [body.child_id as string],
        title: "⭐ Neues Schwerpunkt-Fach",
        message: `Deine Eltern haben ${subject} als Schwerpunkt-Fach festgelegt.`,
        data: {
          type: "subject_priority_set",
          subject: body.subject,
        },
      });
    }
    case "hourly_dispatch": {
      // Cron runs hourly. Each user picks their own preferred hour
      // (Europe/Berlin local time) for the daily summary / reminder.
      const berlinHour = getBerlinHour();
      const [parents, children] = await Promise.all([
        sendDailyParentSummaries(berlinHour),
        sendChildLearningReminders(berlinHour),
      ]);
      return { berlinHour, parents, children };
    }
    case "parent_daily_summary": {
      // Manual trigger: send to all parents whose preferred hour matches now (or all if forced)
      return sendDailyParentSummaries(getBerlinHour(), true);
    }
    case "child_learning_reminder": {
      return sendChildLearningReminders(getBerlinHour(), true);
    }
    case "streak_milestone": {
      const streak = Number(body.streak) || 0;
      const childId = body.child_id as string;
      if (!childId || !streak) {
        return { skipped: true, reason: "missing_streak_or_child" };
      }
      const titles: Record<number, string> = {
        3: "🔥 3 Tage in Folge!",
        7: "🌟 Eine Woche Streak!",
        14: "💪 2 Wochen am Stück!",
        30: "🏆 30-Tage-Streak!",
        60: "🚀 60 Tage Lern-Power!",
        100: "💎 100 Tage – Legende!",
        200: "👑 200 Tage – Wahnsinn!",
        300: "🌈 300 Tage – Unfassbar!",
        365: "🎊 1 Jahr Streak – Champion!",
      };
      const messages: Record<number, string> = {
        3: "Du hast 3 Tage in Folge gelernt. Super gemacht – weiter so!",
        7: "Eine ganze Woche jeden Tag gelernt! Du bist auf einem tollen Weg.",
        14: "14 Tage am Stück – das ist echte Disziplin. Stark!",
        30: "30 Tage durchgehalten! Du bist ein wahres Lern-Vorbild.",
        60: "60 Tage in Folge – deine Ausdauer ist beeindruckend!",
        100: "100 Tage Streak! Das schaffen nur die Allerbesten.",
        200: "200 Tage – du bist unaufhaltsam!",
        300: "300 Tage am Stück lernen. Wow, einfach nur wow!",
        365: "Ein ganzes Jahr jeden Tag gelernt! Du bist ein absoluter Champion! 🏅",
      };
      return sendOneSignalPush({
        userIds: [childId],
        title: titles[streak] || `🔥 ${streak}-Tage-Streak!`,
        message: messages[streak] || `Du lernst seit ${streak} Tagen in Folge. Mach weiter so!`,
        data: { type: "streak_milestone", streak },
      });
    }
    default:
      throw new Error(`Unknown event: ${event}`);
  }
}

function getBerlinHour(): number {
  // Returns the current hour (0-23) in Europe/Berlin, respecting DST.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

async function sendDailyParentSummaries(berlinHour: number, force = false) {
  const today = new Date().toISOString().slice(0, 10);

  // Find parents whose preferred hour matches now
  const { data: matchingParents } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "parent")
    .eq("daily_summary_hour", berlinHour);

  const parentIds = new Set((matchingParents ?? []).map((p) => p.id));
  if (!force && parentIds.size === 0) {
    return { skipped: true, reason: "no_parents_at_this_hour", berlinHour };
  }

  const { data: relations } = await supabase
    .from("parent_child_relationships")
    .select("parent_id, child_id");

  const results: unknown[] = [];
  for (const rel of relations ?? []) {
    if (!rel.parent_id || !rel.child_id) continue;
    if (!force && !parentIds.has(rel.parent_id)) continue;

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
        respectDailyToggle: true,
      }).catch((e) => ({ error: String(e) })),
    );
  }
  return { sent: results.length };
}

async function sendChildLearningReminders(berlinHour: number, force = false) {
  const today = new Date().toISOString().slice(0, 10);

  // All children whose preferred reminder hour matches now
  let query = supabase
    .from("profiles")
    .select("id, name, learning_reminder_hour")
    .eq("role", "child");
  if (!force) query = query.eq("learning_reminder_hour", berlinHour);
  const { data: children } = await query;

  const results: unknown[] = [];
  for (const child of children ?? []) {
    // Check both learning_sessions AND game_sessions for today
    const [lsRes, gsRes] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", child.id)
        .gte("session_date", `${today}T00:00:00.000Z`),
      supabase
        .from("game_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", child.id)
        .gte("session_date", `${today}T00:00:00.000Z`),
    ]);

    if ((lsRes.count ?? 0) > 0 || (gsRes.count ?? 0) > 0) continue; // already learned/played today

    const streakInfo = await computeStreakInfo(child.id);
    const streak = streakInfo.streak;

    // Determine which streak push (if any) is appropriate today.
    // Plan-defined exact titles/texts for dim and frozen states.
    let title = "🎯 Zeit zum Lernen!";
    let message = "Du hast heute noch nicht gelernt. Sammel jetzt Bildschirmzeit!";
    let type = "child_learning_reminder";
    let isStreakPush = false;
    if (streakInfo.inactiveDays === 1 && streak > 0) {
      title = "🔥 Deine Flamme wird kleiner";
      message = "Löse heute ein paar Aufgaben, damit dein Streak weiter brennt!";
      type = "streak_dim";
      isStreakPush = true;
    } else if (streakInfo.inactiveDays === 2 && streak > 0) {
      title = "🪵 Dein Lernfeuer ist aus";
      message = "Entfache es wieder: Löse 3 Aufgaben richtig und rette deinen Streak!";
      type = "streak_frozen";
      isStreakPush = true;
    } else if (streak >= 2) {
      title = `🔥 ${streak}-Tage-Streak in Gefahr!`;
      message = `Du lernst seit ${streak} Tagen in Folge. Lerne heute, um deinen Streak zu halten! 💪`;
    } else if (streak === 1) {
      title = "🔥 Halte deinen Streak!";
      message = "Du hast gestern gelernt. Mach heute weiter und starte einen Streak! 🚀";
    }

    // Hard dedupe: dim/frozen pushes are sent at most once per calendar day,
    // regardless of how often this function is invoked.
    if (isStreakPush && streakInfo.lastPushSentDate === today) continue;

    results.push(
      await sendOneSignalPush({
        userIds: [child.id],
        title,
        message,
        data: { type, streak, inactiveDays: streakInfo.inactiveDays },
        respectDailyToggle: true,
      }).then(async (result) => {
        if (isStreakPush) {
          // Only stamp the dedupe date + status; do NOT clobber streak_value or
          // last_activity_date that the client maintains as source of truth.
          await supabase.from("user_streak_states").upsert({
            user_id: child.id,
            streak_value: streak,
            status: type === "streak_dim" ? "dim" : "frozen",
            last_activity_date: streakInfo.lastActivityDate,
            last_push_sent_date: today,
          }, { onConflict: "user_id" });
        }
        return result;
      }).catch((e) => ({ error: String(e) })),
    );
  }
  return { sent: results.length };
}

async function computeStreakInfo(userId: string): Promise<{ streak: number; inactiveDays: number; lastActivityDate: string | null; lastPushSentDate: string | null }> {
  const [ls, gs, state] = await Promise.all([
    supabase.from("learning_sessions").select("session_date").eq("user_id", userId).order("session_date", { ascending: false }).limit(200),
    supabase.from("game_sessions").select("session_date").eq("user_id", userId).order("session_date", { ascending: false }).limit(200),
    supabase.from("user_streak_states").select("streak_value, last_activity_date, last_push_sent_date").eq("user_id", userId).maybeSingle(),
  ]);
  const dates = new Set<string>();
  for (const row of [...(ls.data ?? []), ...(gs.data ?? [])]) {
    if (row.session_date) dates.add(new Date(row.session_date).toISOString().slice(0, 10));
  }
  if (!dates.size) return { streak: 0, inactiveDays: 0, lastActivityDate: null, lastPushSentDate: state.data?.last_push_sent_date ?? null };
  const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a));
  const lastActivityDate = sorted[0];
  const today = new Date().toISOString().slice(0, 10);
  const inactiveDays = Math.max(0, Math.floor((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${lastActivityDate}T00:00:00Z`).getTime()) / 86400000));
  if (inactiveDays >= 3) return { streak: 0, inactiveDays, lastActivityDate, lastPushSentDate: state.data?.last_push_sent_date ?? null };
  let streak = 0;
  let cursor = new Date(`${lastActivityDate}T00:00:00Z`);
  for (const d of sorted) {
    const expected = cursor.toISOString().slice(0, 10);
    if (d === expected) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else break;
  }
  return { streak: Math.max(streak, Number(state.data?.streak_value) || 0), inactiveDays, lastActivityDate, lastPushSentDate: state.data?.last_push_sent_date ?? null };
}

async function computeStreak(userId: string): Promise<number> {
  const [ls, gs] = await Promise.all([
    supabase.from("learning_sessions").select("session_date").eq("user_id", userId).order("session_date", { ascending: false }).limit(200),
    supabase.from("game_sessions").select("session_date").eq("user_id", userId).order("session_date", { ascending: false }).limit(200),
  ]);
  const dates = new Set<string>();
  for (const row of [...(ls.data ?? []), ...(gs.data ?? [])]) {
    if (row.session_date) dates.add(new Date(row.session_date).toISOString().slice(0, 10));
  }
  if (!dates.size) return 0;
  const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = new Date(sorted[0]);
  for (const d of sorted) {
    const expected = cursor.toISOString().slice(0, 10);
    if (d === expected) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
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
