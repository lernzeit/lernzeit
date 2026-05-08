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

interface Candidate {
  model: string;
  provider: ProviderId;
}

interface RunResult {
  model: string;
  provider: ProviderId;
  native_model: string;
  ok: boolean;
  status: number | null;
  latency_ms: number;
  output?: string;
  error?: string;
  judge_score?: number;
  judge_reason?: string;
}

async function runOne(c: Candidate, prompt: string, system?: string): Promise<RunResult> {
  const native = resolveProviderModel(c.model, c.provider);
  const start = Date.now();
  const key = apiKey(c.provider);
  if (!key) return { ...c, native_model: native, ok: false, status: null, latency_ms: 0, error: 'API-Key fehlt' };
  if (!isModelAvailableOn(c.model, c.provider)) {
    return { ...c, native_model: native, ok: false, status: null, latency_ms: 0, error: 'Modell nicht auf Provider verfügbar' };
  }
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(GATEWAYS[c.provider], {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: native, messages, temperature: 0.3 }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    const text = await res.text();
    if (!res.ok) return { ...c, native_model: native, ok: false, status: res.status, latency_ms: latency, error: text.slice(0, 300) };
    let content = '';
    try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ''; } catch { content = text.slice(0, 500); }
    return { ...c, native_model: native, ok: true, status: res.status, latency_ms: latency, output: String(content).slice(0, 2000) };
  } catch (err) {
    return { ...c, native_model: native, ok: false, status: null, latency_ms: Date.now() - start, error: (err as Error).message };
  }
}

async function judge(useCase: string, prompt: string, candidates: RunResult[]): Promise<RunResult[]> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return candidates;
  const successful = candidates.filter((c) => c.ok && c.output);
  if (successful.length === 0) return candidates;

  const judgePrompt = `Du bist Qualitäts-Juror für deutschsprachige Lern-KI-Outputs (Use-Case: "${useCase}").
Bewerte jeden Output auf einer Skala 1–10 nach: Korrektheit, pädagogische Eignung, Format-Konformität, Klarheit, Sprache (Deutsch).

ORIGINAL-PROMPT:
${prompt.slice(0, 1500)}

OUTPUTS:
${successful.map((c, i) => `--- #${i + 1} (${c.model} via ${c.provider}) ---\n${(c.output ?? '').slice(0, 1500)}`).join('\n\n')}

Antworte AUSSCHLIESSLICH mit gültigem JSON in dieser Form:
{"scores":[{"index":1,"score":8,"reason":"kurz, max 15 Wörter"}, ...]}`;

  try {
    const res = await fetch(GATEWAYS.gemini_direct, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        messages: [{ role: 'user', content: judgePrompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return candidates;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const scores: Array<{ index: number; score: number; reason: string }> = parsed.scores ?? [];
    for (const s of scores) {
      const target = successful[s.index - 1];
      if (target) {
        target.judge_score = s.score;
        target.judge_reason = s.reason;
      }
    }
  } catch (err) {
    console.error('Judge failed:', err);
  }
  return candidates;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const useCase: string = body.use_case || 'custom';
    const prompt: string = body.prompt;
    const system: string | undefined = body.system;
    const candidates: Candidate[] = Array.isArray(body.candidates) ? body.candidates : [];
    const enableJudge: boolean = body.judge !== false;

    if (!prompt || candidates.length === 0) {
      return new Response(JSON.stringify({ error: 'prompt und candidates erforderlich' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (candidates.length > 8) {
      return new Response(JSON.stringify({ error: 'Max 8 Kandidaten' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Run all candidates in parallel
    const results = await Promise.all(candidates.map((c) => runOne(c, prompt, system)));

    const judged = enableJudge ? await judge(useCase, prompt, results) : results;
    const ranked = [...judged].sort((a, b) => (b.judge_score ?? -1) - (a.judge_score ?? -1));

    return new Response(JSON.stringify({
      success: true,
      use_case: useCase,
      results: ranked,
      winner: ranked.find((r) => r.ok) ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});