import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-client.ts";

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const { response } = await callAI({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }, controller.signal);

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
