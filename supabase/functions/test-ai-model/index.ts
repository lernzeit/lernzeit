import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveProviderModel, isModelAvailableOn, type ProviderId } from "../_shared/model-catalog.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAYS: Record<ProviderId, string> = {
  gemini_direct: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
};

function apiKey(p: ProviderId): string | undefined {
  if (p === 'gemini_direct') return Deno.env.get('GEMINI_API_KEY');
  if (p === 'openrouter') return Deno.env.get('OPENROUTER_API_KEY');
  return Deno.env.get('LOVABLE_API_KEY');
}

interface Attempt {
  provider: ProviderId;
  native_model: string;
  status: number | null;
  ok: boolean;
  latency_ms: number;
  error?: string;
  response?: string;
  skipped_reason?: string;
}

async function tryOne(provider: ProviderId, canonicalModel: string, prompt: string): Promise<Attempt> {
  const native = resolveProviderModel(canonicalModel, provider);
  const start = Date.now();
  const key = apiKey(provider);
  if (!key) {
    return { provider, native_model: native, status: null, ok: false, latency_ms: 0, skipped_reason: 'API-Key fehlt' };
  }
  if (!isModelAvailableOn(canonicalModel, provider)) {
    return { provider, native_model: native, status: null, ok: false, latency_ms: 0, skipped_reason: 'Modell nicht auf Provider verfügbar' };
  }
  try {
    const res = await fetch(GATEWAYS[provider], {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: native, messages: [{ role: 'user', content: prompt }], temperature: 0 }),
    });
    const latency = Date.now() - start;
    const text = await res.text();
    if (!res.ok) {
      return { provider, native_model: native, status: res.status, ok: false, latency_ms: latency, error: text.slice(0, 300) };
    }
    let content = '';
    try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ''; } catch { content = text.slice(0, 200); }
    return { provider, native_model: native, status: res.status, ok: true, latency_ms: latency, response: String(content).slice(0, 300) };
  } catch (err) {
    return { provider, native_model: native, status: null, ok: false, latency_ms: Date.now() - start, error: (err as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const model: string = body.model || 'google/gemini-2.5-flash';
    const prompt: string = body.prompt || 'Antworte mit genau einem Wort: "OK".';
    const onlyProvider: ProviderId | undefined = body.provider;
    const providerOrder: ProviderId[] = Array.isArray(body.provider_order) && body.provider_order.length > 0
      ? body.provider_order
      : ['gemini_direct', 'openrouter', 'lovable'];

    const targets: ProviderId[] = onlyProvider ? [onlyProvider] : providerOrder;
    const attempts: Attempt[] = [];
    let firstSuccess: Attempt | null = null;
    for (const p of targets) {
      const a = await tryOne(p, model, prompt);
      attempts.push(a);
      if (a.ok && !firstSuccess) {
        firstSuccess = a;
        if (!onlyProvider) break; // chain mode: stop at first success
      }
    }

    return new Response(JSON.stringify({
      success: !!firstSuccess,
      mode: onlyProvider ? 'single' : 'chain',
      attempts,
      winner: firstSuccess,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
