/**
 * Shared AI client with configurable provider chain.
 *
 * Behaviour:
 *   - Per-use-case config (model, provider order, temperature) is loaded
 *     from `ai_model_config` (60s in-memory cache).
 *   - Falls back to `options.model` and the legacy chain Gemini→OpenRouter→Lovable
 *     if no config is found (backward compatible).
 *   - Each call is logged to `ai_model_metrics` (fire-and-forget).
 *   - Provider is skipped for 5 min after a 402 (credits exhausted) and
 *     2 min after other non-429 errors.
 */

import { resolveProviderModel, isModelAvailableOn, estimateCost, type ProviderId } from './model-catalog.ts';
import { loadModelConfig, logMetric } from './model-config.ts';

const GEMINI_GATEWAY = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const OPENROUTER_GATEWAY = 'https://openrouter.ai/api/v1/chat/completions';
const LOVABLE_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const EXHAUSTED_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for non-auth errors
const exhaustedUntil: Record<ProviderId, number> = {
  gemini_direct: 0,
  openrouter: 0,
  lovable: 0,
};

interface AiRequestOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
}

interface AiCallResult {
  response: Response;
  provider: ProviderId;
  model: string;
}

function providerEnvKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'gemini_direct': return Deno.env.get('GEMINI_API_KEY');
    case 'openrouter':    return Deno.env.get('OPENROUTER_API_KEY');
    case 'lovable':       return Deno.env.get('LOVABLE_API_KEY');
  }
}

function providerGateway(provider: ProviderId): string {
  switch (provider) {
    case 'gemini_direct': return GEMINI_GATEWAY;
    case 'openrouter':    return OPENROUTER_GATEWAY;
    case 'lovable':       return LOVABLE_GATEWAY;
  }
}

function providerLabel(provider: ProviderId): string {
  return { gemini_direct: '🟢 Gemini', openrouter: '🔵 OpenRouter', lovable: '🟣 Lovable' }[provider];
}

interface ProviderAttempt {
  ok: boolean;
  response?: Response;
  status?: number;
  shouldStop?: boolean; // true on 429 — return immediately, no further fallback
}

async function tryProvider(
  provider: ProviderId,
  canonicalModel: string,
  options: AiRequestOptions,
  useCase: string,
  signal?: AbortSignal,
): Promise<ProviderAttempt> {
  const apiKey = providerEnvKey(provider);
  if (!apiKey) return { ok: false };
  if (Date.now() < exhaustedUntil[provider]) return { ok: false };
  if (!isModelAvailableOn(canonicalModel, provider)) return { ok: false };

  const nativeModel = resolveProviderModel(canonicalModel, provider);
  const body: Record<string, unknown> = {
    model: nativeModel,
    messages: options.messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.stream !== undefined) body.stream = options.stream;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const start = Date.now();
  console.log(`${providerLabel(provider)} trying model: ${nativeModel} (use_case=${useCase})`);

  try {
    const response = await fetch(providerGateway(provider), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    const latency = Date.now() - start;

    // Streaming responses can't be tee'd here — log without token usage and return
    if (options.stream) {
      logMetric({
        use_case: useCase, provider, model: canonicalModel,
        status_code: response.status, success: response.ok, latency_ms: latency,
        error_type: response.ok ? null : `http_${response.status}`,
      });
      if (response.ok) return { ok: true, response };
      if (response.status === 429) return { ok: false, response, status: 429, shouldStop: true };
      if (response.status === 402) exhaustedUntil[provider] = Date.now() + EXHAUSTED_COOLDOWN_MS;
      else exhaustedUntil[provider] = Date.now() + ERROR_COOLDOWN_MS;
      return { ok: false, response, status: response.status };
    }

    // Non-streaming: clone for usage extraction without consuming the body
    if (response.ok) {
      const clone = response.clone();
      clone.json().then((json) => {
        const usage = json?.usage ?? {};
        const promptTokens = usage.prompt_tokens ?? null;
        const completionTokens = usage.completion_tokens ?? null;
        logMetric({
          use_case: useCase, provider, model: canonicalModel,
          status_code: response.status, success: true, latency_ms: latency,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: usage.total_tokens ?? null,
          estimated_cost_usd: estimateCost(canonicalModel, promptTokens, completionTokens),
        });
      }).catch(() => {
        logMetric({
          use_case: useCase, provider, model: canonicalModel,
          status_code: response.status, success: true, latency_ms: latency,
        });
      });
      console.log(`✅ ${providerLabel(provider)} success (${nativeModel}, ${latency}ms)`);
      return { ok: true, response };
    }

    // Error path
    logMetric({
      use_case: useCase, provider, model: canonicalModel,
      status_code: response.status, success: false, latency_ms: latency,
      error_type: `http_${response.status}`,
    });

    if (response.status === 429) {
      console.warn(`⚠️ ${providerLabel(provider)} rate-limited (429) — abort chain`);
      return { ok: false, response, status: 429, shouldStop: true };
    }
    if (response.status === 402) {
      exhaustedUntil[provider] = Date.now() + EXHAUSTED_COOLDOWN_MS;
      console.warn(`⚠️ ${providerLabel(provider)} credits exhausted (402)`);
    } else {
      exhaustedUntil[provider] = Date.now() + ERROR_COOLDOWN_MS;
      await response.text().catch(() => {});
      console.warn(`⚠️ ${providerLabel(provider)} error (${response.status})`);
    }
    return { ok: false, response, status: response.status };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    const latency = Date.now() - start;
    logMetric({
      use_case: useCase, provider, model: canonicalModel,
      status_code: null, success: false, latency_ms: latency,
      error_type: 'network',
    });
    console.warn(`⚠️ ${providerLabel(provider)} unreachable`, err);
    return { ok: false };
  }
}

/**
 * Call AI with per-use-case configurable provider chain.
 * - `useCase` triggers DB-backed config lookup (recommended).
 * - Without `useCase`, falls back to legacy chain: gemini_direct → openrouter → lovable
 *   using `options.model`.
 */
export async function callAI(
  options: AiRequestOptions,
  signal?: AbortSignal,
  useCase?: string,
): Promise<AiCallResult> {
  let canonicalModel = options.model;
  let providerOrder: ProviderId[] = ['gemini_direct', 'openrouter', 'lovable'];
  let temperature = options.temperature;

  if (useCase) {
    const cfg = await loadModelConfig(useCase);
    if (cfg && cfg.is_active) {
      canonicalModel = cfg.primary_model;
      providerOrder = cfg.provider_order;
      if (cfg.temperature !== null && temperature === undefined) {
        temperature = cfg.temperature;
      }
    }
  }

  const effectiveOptions: AiRequestOptions = { ...options, temperature };

  let lastResponse: Response | undefined;
  let lastStatus: number | undefined;

  for (const provider of providerOrder) {
    const attempt = await tryProvider(provider, canonicalModel, effectiveOptions, useCase ?? 'unknown', signal);
    if (attempt.ok && attempt.response) {
      return { response: attempt.response, provider, model: canonicalModel };
    }
    if (attempt.shouldStop && attempt.response) {
      // 429 — return immediately so caller can surface rate-limit to user
      return { response: attempt.response, provider, model: canonicalModel };
    }
    if (attempt.response) {
      lastResponse = attempt.response;
      lastStatus = attempt.status;
    }
  }

  if (lastResponse) {
    return { response: lastResponse, provider: providerOrder[providerOrder.length - 1], model: canonicalModel };
  }
  throw new Error(`All AI providers failed for use_case="${useCase ?? 'unknown'}" (last status: ${lastStatus ?? 'n/a'}). Check API keys, credits, and model availability.`);
}
