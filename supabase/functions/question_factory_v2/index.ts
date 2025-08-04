import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

// ----------- Hilfsfunktionen ----------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
  Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGemini(promptText: string): Promise<string> {
  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 300 }
  };
  const r = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --------------- 1. Eingaben aus HTTP‑Body ----------------
    const { grade, subject } = await req.json();

    // Sicherheits‑Check
    if (!grade || !subject) {
      return new Response(
        JSON.stringify({ error: "grade and subject required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting question factory workflow for grade ${grade}, subject ${subject}`);

    // --------------- 2. Variant wählen ------------------------
    const choosePrompt = await Deno.readTextFile(
      "prompts/choose_variant.prompt"
    );
    const chooseResponse = await callGemini(choosePrompt);
    console.log(`Choose variant response: ${chooseResponse}`);
    
    const chooseJson = JSON.parse(chooseResponse);

    // --------------- 3. Frage generieren ----------------------
    let questionJson: any, verifyOk = false, tries = 0;
    const genPromptTpl = await Deno.readTextFile(
      "prompts/generate-question.prompt"
    );
    const verifyPromptTpl = await Deno.readTextFile(
      "prompts/verify-question.prompt"
    );

    while (!verifyOk && tries < 3) {
      tries++;
      console.log(`Question generation attempt ${tries}`);

      const filledGenPrompt = genPromptTpl
        .replace("{{grade}}", grade.toString())
        .replace("{{subject}}", subject)
        .replace("{{variant}}", chooseJson.variant)
        .replace("{{need_image}}", chooseJson.need_image.toString());

      const questionResponse = await callGemini(filledGenPrompt);
      console.log(`Generated question: ${questionResponse}`);

      try {
        questionJson = JSON.parse(questionResponse);
      } catch (parseError) {
        console.error(`Failed to parse question JSON on attempt ${tries}:`, parseError);
        continue;
      }

      const filledVerifyPrompt = verifyPromptTpl + "\n" + questionResponse;
      const verifyResponse = await callGemini(filledVerifyPrompt);
      console.log(`Verification response: ${verifyResponse}`);

      try {
        const verifyRes = JSON.parse(verifyResponse);
        verifyOk = verifyRes.is_consistent === true && verifyRes.score >= 0.9;
        console.log(`Verification result: consistent=${verifyRes.is_consistent}, score=${verifyRes.score}`);
      } catch (verifyParseError) {
        console.error(`Failed to parse verification JSON on attempt ${tries}:`, verifyParseError);
        continue;
      }
    }

    if (!verifyOk) {
      console.error("Verification failed after 3 attempts");
      return new Response(
        JSON.stringify({ error: "verification failed after 3 tries" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------- 4. In Datenbank speichern ---------------
    console.log("Saving question to database...");
    const { data, error } = await supabase
      .from("questions")
      .insert([questionJson])
      .select("id")
      .single();

    if (error) {
      console.error("Database insertion error:", error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Question successfully created with ID: ${data.id}`);
    return new Response(
      JSON.stringify({ question_id: data.id, status: "created", attempts: tries }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error("Unexpected error in question factory:", e);
    return new Response(
      JSON.stringify({ error: e.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});