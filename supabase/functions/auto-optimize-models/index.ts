import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  RECOMMENDED_MODELS,
  resolveProviderModel,
  isModelAvailableOn,
  estimateCost,
  type ProviderId,
} from "../_shared/model-catalog.ts";

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

/** Standardized test prompts per use-case, in German. */
const USE_CASE_TESTS: Record<string, { system?: string; prompt: string }> = {
  question_generator: {
    system: 'Du bist ein Lehrer für deutsche Grundschüler. Antworte nur in deutschem JSON.',
    prompt: 'Erstelle eine Mathe-Aufgabe für Klasse 3, Thema "Schriftliche Addition im ZR 1000". Format: {"frage":"...","antwort":"..."}.',
  },
  validate_answer: {
    prompt: 'Frage: "Was ist 7 × 8?" Antwort des Kindes: "fünfundsechzig". Ist das richtig? Antworte mit JSON {"correct":bool,"feedback":"max 12 Wörter, kindgerecht"}.',
  },
  validate_question: {
    prompt: 'Prüfe diese Frage auf Korrektheit: "Wie viele Tage hat ein Schaltjahr? Antwort: 365". Antworte JSON {"valid":bool,"issue":"..."}.',
  },
  ai_explain: {
    prompt: 'Erkläre einem 8-jährigen Kind in maximal 3 kurzen Sätzen, warum 6 × 4 dasselbe ist wie 4 × 6. Keine Markdown, kein Englisch.',
  },
  ai_tutor: {
    prompt: 'Ein Kind hat bei "12 - 7" "4" geantwortet. Gib einen freundlichen, kurzen Hinweis (max. 2 Sätze, deutsch, kein Markdown), wie es zur richtigen Antwort kommt.',
  },
  analyze_feedback: {
    prompt: 'Analysiere folgendes Schüler-Feedback und gib eine Verbesserungsregel als JSON {"rule":"...","subject":"math"} zurück: "Die Frage zur Bruchrechnung war zu schwer und der Text unklar."',
  },
  learning_plan: {
    prompt: 'Erstelle einen 3-Tage-Lernplan für eine Mathearbeit Klasse 4 zum Thema "Schriftliche Division". Format JSON {"days":[{"day":1,"topic":"...","exercises":["..."]}]}.',
  },
};

interface RunResult {
  model: string;
  provider: ProviderId;
  ok: boolean;
  status: number | null;
  latency_ms: number;
  output?: string;
  error?: string;
  judge_score?: number;
  judge_reason?: string;
  is_free: boolean;
  estimated_cost_per_1k_calls_usd: number;
}

/** Assume an average call: 500 prompt + 300 completion tokens. */
const AVG_PROMPT_TOKENS = 500;
const AVG_COMPLETION_TOKENS = 300;

async function runOne(model: string, provider: ProviderId, system: string | undefined, prompt: string): Promise<RunResult> {
  const native = resolveProviderModel(model, provider);
  const start = Date.now();
  const key = apiKey(provider);
  const cost = estimateCost(model, AVG_PROMPT_TOKENS, AVG_COMPLETION_TOKENS) ?? 0;
  const cost_per_1k = cost * 1000;
  const base = { model, provider, is_free: cost === 0, estimated_cost_per_1k_calls_usd: cost_per_1k };

  if (!key) return { ...base, ok: false, status: null, latency_ms: 0, error: 'API-Key fehlt' };
  if (!isModelAvailableOn(model, provider)) {
    return { ...base, ok: false, status: null, latency_ms: 0, error: 'Modell nicht auf Provider' };
  }
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(GATEWAYS[provider], {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: native, messages, temperature: 0.3 }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    const text = await res.text();
    if (!res.ok) return { ...base, ok: false, status: res.status, latency_ms: latency, error: text.slice(0, 200) };
    let content = '';
    try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ''; } catch { content = text.slice(0, 500); }
    return { ...base, ok: true, status: res.status, latency_ms: latency, output: String(content).slice(0, 1500) };
  } catch (err) {
    return { ...base, ok: false, status: null, latency_ms: Date.now() - start, error: (err as Error).message };
  }
}

async function judge(useCase: string, prompt: string, candidates: RunResult[]): Promise<void> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return;
  const successful = candidates.filter((c) => c.ok && c.output);
  if (successful.length === 0) return;
  const judgePrompt = `Du bist Juror für deutsche Lern-KI (Use-Case: "${useCase}").
Bewerte jeden Output 1–10 (Korrektheit, pädagogische Eignung, Format, Sprache).

ORIGINAL-PROMPT:
${prompt.slice(0, 1200)}

OUTPUTS:
${successful.map((c, i) => `--- #${i + 1} (${c.model}/${c.provider}) ---\n${(c.output ?? '').slice(0, 1200)}`).join('\n\n')}

Antworte NUR mit JSON: {"scores":[{"index":1,"score":8,"reason":"max 12 Wörter"}]}`;
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
    if (!res.ok) return;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const scores: Array<{ index: number; score: number; reason: string }> = parsed.scores ?? [];
    for (const s of scores) {
      const target = successful[s.index - 1];
      if (target) { target.judge_score = s.score; target.judge_reason = s.reason; }
    }
  } catch (_err) { /* noop */ }
}

/** Decide winner: prefer free model if its score is within 1 point of the best AND >= 7.5. */
function pickWinner(results: RunResult[]): { winner: RunResult | null; reason: string } {
  const scored = results.filter((r) => r.ok && typeof r.judge_score === 'number');
  if (scored.length === 0) return { winner: null, reason: 'Kein erfolgreicher Kandidat' };
  const sorted = [...scored].sort((a, b) => (b.judge_score ?? 0) - (a.judge_score ?? 0));
  const best = sorted[0];
  const free = sorted.filter((r) => r.is_free);
  const topFree = free[0];
  if (topFree && (topFree.judge_score ?? 0) >= 7.5 && (best.judge_score! - topFree.judge_score!) <= 1.0) {
    return {
      winner: topFree,
      reason: `Kostenlos gewählt: Score ${topFree.judge_score} (Best: ${best.judge_score}, ${best.model}). Δ ≤ 1.`,
    };
  }
  return {
    winner: best,
    reason: `Bestes Score/Kosten-Verhältnis: Score ${best.judge_score}, Kosten/1k ${best.estimated_cost_per_1k_calls_usd.toFixed(3)} USD.`,
  };
}

function candidatesForUseCase(useCase: string): Array<{ model: string; provider: ProviderId }> {
  const list: Array<{ model: string; provider: ProviderId }> = [];
  const seen = new Set<string>();
  const push = (model: string, provider: ProviderId) => {
    const key = `${model}@${provider}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ model, provider });
  };
  const pickProvider = (m: typeof RECOMMENDED_MODELS[number]): ProviderId | null => {
    // Prefer OpenRouter (user's primary credit pool), then Gemini direct, then Lovable.
    if (m.openrouter_id) return 'openrouter';
    if (m.gemini_id) return 'gemini_direct';
    if (m.lovable_id) return 'lovable';
    return null;
  };

  // 1) Always include free OpenRouter (zero cost baseline).
  push('openrouter/free', 'openrouter');

  // 2) Models explicitly recommended for this use case.
  for (const m of RECOMMENDED_MODELS) {
    if (m.id === 'openrouter/free') continue;
    if (!m.recommended_for.includes(useCase)) continue;
    const p = pickProvider(m);
    if (p) push(m.id, p);
  }

  // 3) Fill with the cheapest remaining models (avg of in/out price), regardless of provider.
  const remaining = RECOMMENDED_MODELS
    .filter((m) => m.id !== 'openrouter/free' && !list.some((c) => c.model === m.id))
    .map((m) => ({ m, avg: (m.input_price_per_1m + m.output_price_per_1m) / 2 }))
    .sort((a, b) => a.avg - b.avg);
  for (const { m } of remaining) {
    if (list.length >= 6) break;
    const p = pickProvider(m);
    if (p) push(m.id, p);
  }

  // Cap at 6 to keep latency/quota in check.
  return list.slice(0, 6);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Auth: allow either admin user OR service-role-style cron (no auth header).
  const authHeader = req.headers.get('Authorization');
  let triggeredBy = 'cron';
  if (authHeader) {
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userData?.user) {
      const { data: roleData } = await supabase.from('user_roles')
        .select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      triggeredBy = `admin:${userData.user.id}`;
    }
  }

  let body: { use_cases?: string[]; apply?: boolean } = {};
  try { body = await req.json(); } catch { /* GET/cron */ }
  const targetUseCases = body.use_cases ?? Object.keys(USE_CASE_TESTS);
  const apply = body.apply !== false; // default true

  const summary: Array<Record<string, unknown>> = [];

  for (const useCase of targetUseCases) {
    const test = USE_CASE_TESTS[useCase];
    if (!test) continue;

    const candidates = candidatesForUseCase(useCase);
    const results = await Promise.all(candidates.map((c) => runOne(c.model, c.provider, test.system, test.prompt)));
    await judge(useCase, test.prompt, results);
    const { winner, reason } = pickWinner(results);

    // Load current config
    const { data: cfg } = await supabase.from('ai_model_config')
      .select('id, primary_model, provider_order').eq('use_case', useCase).maybeSingle();
    const previousModel = cfg?.primary_model ?? null;

    let applied = false;
    if (apply && winner && cfg) {
      // OpenRouter is always present as a fallback because the user maintains credit there.
      const newOrder: ProviderId[] = winner.provider === 'openrouter'
        ? ['openrouter', 'gemini_direct', 'lovable']
        : winner.provider === 'gemini_direct'
          ? ['gemini_direct', 'openrouter', 'lovable']
          : ['lovable', 'openrouter', 'gemini_direct'];
      const { error: upErr } = await supabase.from('ai_model_config').update({
        primary_model: winner.model,
        provider_order: newOrder,
        updated_at: new Date().toISOString(),
      }).eq('id', cfg.id);
      if (!upErr) applied = true;
    }

    await supabase.from('ai_model_optimization_runs').insert({
      use_case: useCase,
      previous_model: previousModel,
      new_model: winner?.model ?? null,
      applied,
      winner_provider: winner?.provider ?? null,
      winner_score: winner?.judge_score ?? null,
      winner_cost_usd: winner?.estimated_cost_per_1k_calls_usd ?? null,
      reason,
      results,
      triggered_by: triggeredBy,
    });

    summary.push({ use_case: useCase, previous_model: previousModel, new_model: winner?.model, applied, reason });
  }

  return new Response(JSON.stringify({ success: true, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});