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

// Hard per-attempt timeout. After this we abort and try the next model.
const PER_ATTEMPT_TIMEOUT_MS = 12_000;

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

function providerAuthHeader(provider: ProviderId, apiKey: string): Record<string, string> {
  // Lovable AI Gateway expects `Authorization: Bearer ...` (OpenAI-compatible).
  // Same for Gemini-direct OpenAI-compat endpoint and OpenRouter.
  return { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
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

  // Combine caller's signal with a per-attempt timeout
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), PER_ATTEMPT_TIMEOUT_MS);
  const onOuterAbort = () => timeoutCtrl.abort();
  if (signal) signal.addEventListener('abort', onOuterAbort, { once: true });

  try {
    const response = await fetch(providerGateway(provider), {
      method: 'POST',
      headers: providerAuthHeader(provider, apiKey),
      body: JSON.stringify(body),
      signal: timeoutCtrl.signal,
    });
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
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
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
    const latency = Date.now() - start;
    const isTimeout = (err as Error).name === 'AbortError';
    // If the caller's outer signal aborted, propagate up. Otherwise treat as
    // our own per-attempt timeout and move to the next model.
    if (isTimeout && signal?.aborted) throw err;
    logMetric({
      use_case: useCase, provider, model: canonicalModel,
      status_code: null, success: false, latency_ms: latency,
      error_type: isTimeout ? 'timeout' : 'network',
    });
    console.warn(`⚠️ ${providerLabel(provider)} ${isTimeout ? `timeout after ${PER_ATTEMPT_TIMEOUT_MS}ms` : 'unreachable'} (${nativeModel})`);
    return { ok: false };
  }
}

/**
 * Call AI with a configurable model + provider chain.
 *
 * For each (model, provider) combination:
 *   1. Build chain = [primary_model, ...fallback_models]
 *   2. For each model, walk provider_order and try the first available one
 *   3. Per-attempt hard timeout (12s) — on timeout, move to next model/provider
 *   4. 429 from any attempt aborts the chain (rate-limit surface to caller)
 *
 * Default chain when no useCase/config: lovable-only with options.model.
 */
export async function callAI(
  options: AiRequestOptions,
  signal?: AbortSignal,
  useCase?: string,
): Promise<AiCallResult> {
  let primaryModel = options.model;
  let fallbackModels: string[] = [];
  let providerOrder: ProviderId[] = ['lovable'];
  let temperature = options.temperature;

  if (useCase) {
    const cfg = await loadModelConfig(useCase);
    if (cfg && cfg.is_active) {
      primaryModel = cfg.primary_model;
      providerOrder = cfg.provider_order && cfg.provider_order.length > 0
        ? cfg.provider_order
        : ['lovable'];
      // fallback_models can be: string[] OR Array<{provider, model}> OR Array<{model}>
      fallbackModels = (cfg.fallback_models as unknown[]).map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'model' in entry) {
          return String((entry as { model: unknown }).model);
        }
        return '';
      }).filter((m) => m.length > 0);
      if (cfg.temperature !== null && temperature === undefined) {
        temperature = cfg.temperature;
      }
    }
  }

  const effectiveOptions: AiRequestOptions = { ...options, temperature };
  const modelChain = [primaryModel, ...fallbackModels];

  console.log(`🤖 callAI use_case=${useCase ?? 'none'} chain=[${modelChain.join(', ')}] providers=[${providerOrder.join(', ')}]`);

  let lastResponse: Response | undefined;
  let lastStatus: number | undefined;
  let lastProvider: ProviderId = providerOrder[0];

  for (const model of modelChain) {
    for (const provider of providerOrder) {
      const attempt = await tryProvider(provider, model, effectiveOptions, useCase ?? 'unknown', signal);
      if (attempt.ok && attempt.response) {
        return { response: attempt.response, provider, model };
      }
      if (attempt.shouldStop && attempt.response) {
        return { response: attempt.response, provider, model };
      }
      if (attempt.response) {
        lastResponse = attempt.response;
        lastStatus = attempt.status;
        lastProvider = provider;
      }
    }
  }

  if (lastResponse) {
    return { response: lastResponse, provider: lastProvider, model: primaryModel };
  }
  throw new Error(`All AI models/providers failed for use_case="${useCase ?? 'unknown'}" chain=[${modelChain.join(', ')}] (last status: ${lastStatus ?? 'n/a'}).`);
}
