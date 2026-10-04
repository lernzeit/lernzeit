import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI } from "../_shared/ai-client.ts";
import { fotosPruefen, lernstoffAlsText, lernstoffAuswerten } from "../_shared/lernstoff-fotos.ts";
import { FAECHER_KLASSEN, fachAusText, fachPasst, heuteInDeutschland, planTage } from "../_shared/lernplan-regeln.ts";

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
    // KI ueber callAI: Gemini direkt, sonst OpenRouter (kein Lovable mehr).
    if (!Deno.env.get("GEMINI_API_KEY") && !Deno.env.get("OPENROUTER_API_KEY")) throw new Error("No AI API key configured");

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Pruefzugang fuer die Bildauswertung (nur Service-Rolle, z. B. per
    // pg_net aus der Datenbank): wertet Fotos aus, speichert nichts.
    if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const b = await req.json().catch(() => ({}));
      // Testbilder aus dem oeffentlichen Repo (docs/testdaten) duerfen per URL kommen.
      if (Array.isArray(b.fotoUrls)) {
        b.fotos = [];
        for (const url of b.fotoUrls.slice(0, 10)) {
          if (typeof url !== "string" || !url.startsWith("https://raw.githubusercontent.com/lernzeit/lernzeit/")) continue;
          const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          b.fotos.push(`data:image/jpeg;base64,${btoa(bin)}`);
        }
      }
      const fotos = fotosPruefen(b.fotos);
      if (typeof fotos === "string" || fotos.length === 0) {
        return new Response(JSON.stringify({ error: typeof fotos === "string" ? fotos : "Keine Fotos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const start = Date.now();
      const l = await lernstoffAuswerten(fotos, { fach: String(b.fach ?? "Mathematik"), klasse: Number(b.klasse ?? 5), thema: b.thema });
      return new Response(JSON.stringify({ lernstoff: l, text: lernstoffAlsText(l), ms: Date.now() - start }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const { childId, childName, grade, subject, topic, testDate, additionalInfo, fotos: fotosRoh } = await req.json();
    const fotos = fotosPruefen(fotosRoh);
    if (typeof fotos === "string") {
      return new Response(JSON.stringify({ error: fotos }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Thema ist Pflicht – ausser es gibt Fotos, dann liest die KI es aus.
    // Das Fach ist freiwillig (04.10.2026): Es wird erkannt, s. unten.
    if (!childId || !grade || (!topic && fotos.length === 0)) {
      return new Response(JSON.stringify({ error: "Fehlende Pflichtfelder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: cap user-supplied strings to prevent abuse / prompt injection cost
    const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');
    const safeChildName = clip(childName, 50);
    const safeTopic = clip(topic, 200);
    const safeAdditionalInfo = clip(additionalInfo, 1000);
    const safeSubject = clip(subject, 50);
    const safeGrade = Number.isFinite(grade) ? Math.min(Math.max(Number(grade), 1), 13) : 1;
    const safeTestDate = typeof testDate === 'string' ? testDate.slice(0, 30) : null;

    // SECURITY: Verify caller is parent of this child
    const { data: rel } = await supabase
      .from("parent_child_relationships")
      .select("id")
      .eq("parent_id", userData.user.id)
      .eq("child_id", childId)
      .maybeSingle();
    if (!rel) {
      return new Response(JSON.stringify({ error: "Kind ist nicht mit Ihrem Konto verknüpft" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Laenge: so viele Tage wie bis zum Test, hoechstens 5 (Wunsch 04.10.2026).
    const tage = planTage(safeTestDate, heuteInDeutschland());
    if (tage === null) return json({ error: "Das Testdatum liegt in der Vergangenheit." }, 400);

    // Fach: gewaehlt, sonst aus Fotos, Stichworten oder einer kurzen KI-Einordnung.
    const gewaehlt = safeSubject && safeSubject !== "auto" && FAECHER_KLASSEN[safeSubject] ? safeSubject : null;
    let fach: string | null = gewaehlt;

    // Fotos von Heft, Buch oder Arbeitsblatt: erst den Stoff auslesen. Die
    // Fotos werden danach verworfen, nur der Text bleibt.
    let lernstoff: string | null = null;
    let fotoThema = "";
    if (fotos.length > 0) {
      try {
        const l = await lernstoffAuswerten(fotos, {
          fach: fach ? FAECHER_KLASSEN[fach].name : "noch unbekannt",
          klasse: safeGrade,
          thema: safeTopic || undefined,
        });
        if (!l.lesbar) {
          return json({ error: "Auf den Fotos war kein Unterrichtsstoff zu erkennen. Bitte fotografiere die Seiten gerade und gut beleuchtet." }, 422);
        }
        lernstoff = lernstoffAlsText(l);
        fotoThema = l.thema;
        if (!fach && l.fach && fachPasst(l.fach, safeGrade)) fach = l.fach;
      } catch (e) {
        console.error("Bildauswertung:", e);
        return json({ error: "Die Fotos konnten gerade nicht ausgewertet werden. Bitte versuch es noch einmal." }, 502);
      }
    }
    if (!fach) fach = fachAusText(`${safeTopic} ${safeAdditionalInfo} ${fotoThema}`, safeGrade);
    if (!fach) fach = await fachPerKi(`${safeTopic}\n${safeAdditionalInfo}\n${lernstoff ?? ""}`, safeGrade);
    if (!fach) {
      return json({ error: "Aus dem Thema geht das Fach nicht hervor. Bitte wähle es aus.", fachFehlt: true }, 422);
    }
    const subjectDE = FAECHER_KLASSEN[fach].name;

    const themaFuerPlan = safeTopic || fotoThema || "Stoff von den Fotos";
    const testDateStr = safeTestDate
      ? `Der Test findet am ${safeTestDate} statt; bis dahin bleiben ${tage} Lerntag${tage === 1 ? "" : "e"}.`
      : "Kein konkretes Testdatum angegeben.";
    const extraInfo = safeAdditionalInfo ? `Zusätzliche Infos vom Elternteil: "${safeAdditionalInfo}"` : "";
    const ablauf = tage === 1
      ? "Der Plan hat genau 1 Tag: eine kompakte Wiederholung der wichtigsten Inhalte mit gemischten Aufgaben wie in der Prüfung."
      : `Die Schwierigkeit steigert sich von Tag 1 (Grundlagen wiederholen) bis Tag ${tage}. Tag ${tage} ist IMMER ein Wiederholungs-/Testtag mit gemischten Aufgaben.`;

    const systemPrompt = `Du bist ein erfahrener Nachhilfelehrer und Lernplan-Experte für deutsche Schulen.
Du erstellst strukturierte Lernpläne mit ${tage} Tag${tage === 1 ? "" : "en"} für Schüler.

WICHTIGE REGELN:
1. Der Lernplan muss EXAKT zum deutschen Lehrplan der angegebenen Klassenstufe passen.
2. Jeder Tag hat ein klares Thema, konkrete Lernziele und empfohlene Übungen.
3. ${ablauf}
4. Jeder Tag gehört zum Fach ${subjectDE}; "appCategory" ist immer "${fach}".
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

    const userPrompt = `Erstelle einen Lernplan mit ${tage} Tag${tage === 1 ? "" : "en"} für folgende Situation:

Kind: ${safeChildName || "Schüler/in"}
Klassenstufe: ${safeGrade}
Fach: ${subjectDE}
Thema/Prüfung: ${themaFuerPlan}
${testDateStr}
${extraInfo}
${lernstoff ? `\nUNTERRICHTSSTOFF (aus Fotos von Heft/Buch/Arbeitsblatt ausgelesen):\n${lernstoff}\n\nRichte den Plan genau an diesem Stoff aus: gleiche Begriffe, gleiche Aufgabentypen, gleiche Schwierigkeit. Übungen sollen sich auf diese Inhalte beziehen.\n` : ""}
Erstelle den Plan als JSON-Array mit genau ${tage} Element${tage === 1 ? "" : "en"}.`;

    const { response: aiResponse } = await callAI({
      model: "google/gemini-3.8-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }, undefined, 'learning_plan');

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

    // Hoechstens so viele Tage wie geplant, Fach einheitlich.
    if (Array.isArray(planData)) {
      planData = planData.slice(0, tage).map((t: Record<string, unknown>, i: number) => ({ ...t, day: i + 1, appCategory: fach }));
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
        child_name: safeChildName || "Kind",
        grade: safeGrade,
        subject: fach,
        topic: themaFuerPlan.slice(0, 200),
        test_date: safeTestDate || null,
        plan_data: planData,
        lernstoff,
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
      JSON.stringify({ error: "Lernplan konnte nicht erstellt werden." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Kurze Einordnung des Fachs, wenn weder gewaehlt noch eindeutig erkennbar
 * (Gemini 3.1 Flash Lite, wenige Tokens). "unklar" → die App fragt nach.
 */
async function fachPerKi(text: string, klasse: number): Promise<string | null> {
  const erlaubt = Object.entries(FAECHER_KLASSEN)
    .filter(([k]) => fachPasst(k, klasse))
    .map(([k, f]) => `${k} (${f.name})`)
    .join(", ");
  try {
    const { response } = await callAI({
      model: "google/gemini-3.1-flash-lite",
      messages: [
        { role: "system", content: `Ordne eine Prüfungsbeschreibung einem Schulfach zu. Erlaubt: ${erlaubt}. Antworte nur mit dem Schlüssel (z. B. math) oder mit "unklar", wenn das Fach nicht sicher hervorgeht.` },
        { role: "user", content: `Klasse ${klasse}. Beschreibung:\n${text.slice(0, 1500)}` },
      ],
      timeoutMs: 15000,
    }, undefined, "lernplan_fach");
    if (!response.ok) return null;
    const antwort = String((await response.json()).choices?.[0]?.message?.content ?? "").trim().toLowerCase();
    const schluessel = antwort.match(/[a-z]+/)?.[0] ?? "";
    return fachPasst(schluessel, klasse) ? schluessel : null;
  } catch {
    return null;
  }
}
