import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, correctAnswer, userAnswer, grade, subject } = await req.json();

    if (!question || !correctAnswer || !userAnswer) {
      return new Response(JSON.stringify({ accepted: false, reason: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ accepted: false, reason: 'Config error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Du bist ein Lehrer, der die Antwort eines Schülers (Klasse ${grade}, Fach: ${subject}) prüft.

Frage: "${question}"
Korrekte Antwort: "${correctAnswer}"
Antwort des Schülers: "${userAnswer}"

Prüfe, ob die Antwort des Schülers inhaltlich korrekt ist. Berücksichtige:
- Tippfehler (z.B. "Altlantik" statt "Atlantik")
- Synonyme (z.B. "Atlantik" statt "Atlantischer Ozean")
- Abkürzungen (z.B. "BRD" statt "Bundesrepublik Deutschland")
- Umgangssprachliche Varianten (z.B. "Mathe" statt "Mathematik")
- Groß-/Kleinschreibung ignorieren

WICHTIG: Sei großzügig bei kleinen Tippfehlern, aber die Antwort muss inhaltlich stimmen.
Antworte NUR mit gültigem JSON:
{"accepted": true/false, "reason": "kurze Begründung"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-lite-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`AI error: ${response.status}`);
        return new Response(JSON.stringify({ accepted: false, reason: 'AI unavailable' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(JSON.stringify({ accepted: false, reason: 'Parse error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`✅ validate-answer: "${userAnswer}" vs "${correctAnswer}" → ${parsed.accepted ? 'ACCEPTED' : 'REJECTED'} (${parsed.reason})`);

      return new Response(JSON.stringify({
        accepted: !!parsed.accepted,
        reason: parsed.reason || '',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchErr) {
      clearTimeout(timeout);
      if ((fetchErr as Error).name === 'AbortError') {
        console.warn('validate-answer timed out');
      }
      return new Response(JSON.stringify({ accepted: false, reason: 'Timeout' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('validate-answer error:', error);
    return new Response(JSON.stringify({ accepted: false, reason: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
