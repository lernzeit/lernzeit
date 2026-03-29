import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "google/gemma-3-4b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-27b-it:free",
];

const PROMPT = `Du bist ein Lehrer für Klasse 3 im Fach Mathematik in Deutschland.
Erstelle eine Aufgabe zum Thema "Schriftliche Addition im ZR 1000".
Schwierigkeit: medium.

Antworte NUR mit JSON:
{
  "question_text": "Die Frage",
  "question_type": "MULTIPLE_CHOICE",
  "correct_answer": "Die richtige Antwort",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "hint": "Ein hilfreicher Hinweis"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Record<string, unknown>[] = [];

  for (const model of MODELS) {
    try {
      const start = Date.now();
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: PROMPT }],
          temperature: 0.7,
        }),
      });

      const elapsed = Date.now() - start;
      const data = await response.json();

      if (!response.ok) {
        results.push({ model, status: response.status, error: data, elapsed_ms: elapsed });
        continue;
      }

      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      let parsed = null;
      let parseError = null;

      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { parseError = (e as Error).message; }
      }

      results.push({
        model,
        status: response.status,
        elapsed_ms: elapsed,
        tokens_in: data.usage?.prompt_tokens,
        tokens_out: data.usage?.completion_tokens,
        parsed_ok: !!parsed,
        question: parsed,
        parse_error: parseError,
        raw_snippet: !parsed ? content.slice(0, 300) : undefined,
      });
    } catch (err) {
      results.push({ model, error: (err as Error).message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
