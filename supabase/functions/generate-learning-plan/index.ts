import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check premium
    const { data: isPremium } = await supabase.rpc("is_premium", { user_id: userData.user.id });
    // Also check trial
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("status, trial_end")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const isTrialing = subData?.status === "trialing" && subData?.trial_end && new Date(subData.trial_end) > new Date();

    if (!isPremium && !isTrialing) {
      return new Response(JSON.stringify({ error: "Premium erforderlich" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { childId, childName, grade, subject, topic, testDate, additionalInfo } = await req.json();

    if (!childId || !grade || !subject || !topic) {
      return new Response(JSON.stringify({ error: "Fehlende Pflichtfelder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subjectNames: Record<string, string> = {
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

    const subjectDE = subjectNames[subject] || subject;
    const testDateStr = testDate ? `Der Test findet am ${testDate} statt.` : "Kein konkretes Testdatum angegeben.";
    const extraInfo = additionalInfo ? `Zusätzliche Infos vom Elternteil: "${additionalInfo}"` : "";

    const systemPrompt = `Du bist ein erfahrener Nachhilfelehrer und Lernplan-Experte für deutsche Schulen.
Du erstellst strukturierte 5-Tage-Lernpläne für Schüler.

WICHTIGE REGELN:
1. Der Lernplan muss EXAKT zum deutschen Lehrplan der angegebenen Klassenstufe passen.
2. Jeder Tag hat ein klares Thema, konkrete Lernziele und empfohlene Übungen.
3. Die Schwierigkeit steigert sich von Tag 1 (Grundlagen wiederholen) bis Tag 5 (Prüfungssimulation).
4. Tag 5 ist IMMER ein Wiederholungs-/Testtag mit gemischten Aufgaben.
5. Gib für jeden Tag eine geschätzte Lernzeit in Minuten an (15-30 Min pro Tag).
6. Formuliere altersgerecht für die Klassenstufe.
7. Nutze die App "Lernzeit" als Übungsplattform – verweise auf passende Fächer/Kategorien in der App.

Antworte AUSSCHLIESSLICH mit einem JSON-Array (keine Markdown-Formatierung, kein umschließender Text).
Jedes Element hat diese Struktur:
{
  "day": 1,
  "title": "Tag-Titel",
  "focus": "Schwerpunktthema",
  "goals": ["Lernziel 1", "Lernziel 2"],
  "exercises": ["Übung 1", "Übung 2", "Übung 3"],
  "appCategory": "math",
  "estimatedMinutes": 20,
  "tip": "Motivations-/Lerntipp für Eltern"
}`;

    const userPrompt = `Erstelle einen 5-Tage-Lernplan für folgende Situation:

Kind: ${childName || "Schüler/in"}
Klassenstufe: ${grade}
Fach: ${subjectDE}
Thema/Prüfung: ${topic}
${testDateStr}
${extraInfo}

Erstelle den Plan als JSON-Array mit 5 Tagen.`;

    const { response: aiResponse } = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte versuche es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI-Anfrage fehlgeschlagen");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "[]";

    // Parse – strip potential markdown fences
    let planData;
    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      planData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse plan:", rawContent);
      throw new Error("KI-Antwort konnte nicht verarbeitet werden");
    }

    // Save to DB
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: savedPlan, error: saveError } = await serviceClient
      .from("learning_plans")
      .insert({
        parent_id: userData.user.id,
        child_id: childId,
        child_name: childName || "Kind",
        grade,
        subject,
        topic,
        test_date: testDate || null,
        plan_data: planData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Plan konnte nicht gespeichert werden");
    }

    return new Response(JSON.stringify({ plan: savedPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-learning-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
