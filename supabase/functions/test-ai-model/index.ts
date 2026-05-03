import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Admin-only check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { use_case, model, prompt } = await req.json();
    const testPrompt = prompt || 'Antworte mit genau einem Wort: "OK".';

    const start = Date.now();
    const { response, provider, model: usedModel } = await callAI(
      {
        model: model || 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: testPrompt }],
        temperature: 0,
      },
      undefined,
      use_case,
    );
    const latency = Date.now() - start;

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({
        success: false, status: response.status, provider, model: usedModel, latency_ms: latency, error: errText.slice(0, 500),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({
      success: true, provider, model: usedModel, latency_ms: latency,
      response: String(content).slice(0, 500),
      usage: json?.usage ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});