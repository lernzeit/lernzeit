/**
 * Shared AI client with configurable provider chain.
 *
 * Behaviour:
 *   - Per-use-case config (model, provider order, temperature, thinking level,
 *     max output tokens, provider routing) is loaded from `ai_model_config`
 *     (60s in-memory cache).
 *   - Provider chain: gemini_direct → openrouter.
 *   - Each call is logged to `ai_model_metrics` incl. ttft_ms / total_latency_ms /
 *     resolved_provider / cache_hit / aborted (fire-and-forget).
 *   - Provider is skipped for 5 min after a 402 (credits exhausted) and
 *     2 min after other non-429 errors.
 */

import { resolveProviderModel, isModelAvailableOn, estimateCost, isGemini3, type ProviderId } from './model-catalog.ts';
import { loadModelConfig, logMetric, type ThinkingLevel } from './model-config.ts';

const GEMINI_GATEWAY = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const OPENROUTER_GATEWAY = 'https://openrouter.ai/api/v1/chat/completions';

// Hard per-attempt timeout. After this we abort and try the next model.
const PER_ATTEMPT_TIMEOUT_MS = 12_000;

const EXHAUSTED_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for non-auth errors
const exhaustedUntil: Record<ProviderId, number> = {
  gemini_direct: 0,
  openrouter: 0,
};

export interface AiRequestOptions {
  model: string;
  messages: Array<Record<string, unknown>>;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
  /** Thought signatures returned by a previous Gemini turn (thinking_level="minimal"). */
  thoughtSignatures?: string[];
  /** Marks the response as served from cache for metrics purposes. */
  cacheHit?: boolean;
}

export interface AiCallResult {
  response: Response;
  provider: ProviderId;
  model: string;
  /** Provider actually serving the request (e.g. OpenRouter upstream like "Groq"). */
  resolvedProvider: string;
}

function providerEnvKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'gemini_direct': return Deno.env.get('GEMINI_API_KEY');
    case 'openrouter':    return Deno.env.get('OPENROUTER_API_KEY');
  }
}

function providerGateway(provider: ProviderId): string {
  switch (provider) {
    case 'gemini_direct': return GEMINI_GATEWAY;
    case 'openrouter':    return OPENROUTER_GATEWAY;
  }
}

function providerLabel(provider: ProviderId): string {
  return { gemini_direct: '🟢 Gemini', openrouter: '🔵 OpenRouter' }[provider];
}

function providerAuthHeader(provider: ProviderId, apiKey: string): Record<string, string> {
  return { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

/** OpenRouter reasoning effort mapping (it has no "minimal" level). */
function openRouterEffort(level: ThinkingLevel): 'low' | 'medium' | 'high' {
  return level === 'minimal' ? 'low' : level;
}

/**
 * Extract Gemini thought signatures from a non-streaming chat completion payload.
 * Pass them back via `options.thoughtSignatures` on the follow-up request when
 * running with thinking_level = "minimal".
 */
export function extractThoughtSignatures(json: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if ((key === 'thought_signature' || key === 'thoughtSignature') && typeof value === 'string') {
        out.push(value);
      } else {
        walk(value);
      }
    }
  };
  walk(json);
  return out;
}

interface AttemptContext {
  useCase: string;
  thinkingLevel: ThinkingLevel | null;
  maxOutputTokens: number | null;
  providerRouting: Record<string, unknown> | null;
}

interface ProviderAttempt {
  ok: boolean;
  response?: Response;
  status?: number;
  shouldStop?: boolean; // true on 429 — return immediately, no further fallback
  resolvedProvider?: string;
}

function buildBody(
  provider: ProviderId,
  canonicalModel: string,
  options: AiRequestOptions,
  ctx: AttemptContext,
  thinkingOverride?: ThinkingLevel | null,
): Record<string, unknown> {
  const nativeModel = resolveProviderModel(canonicalModel, provider);
  const body: Record<string, unknown> = {
    model: nativeModel,
    messages: options.messages,
  };

  // Gemini 3 models must run at the default temperature (1.0).
  if (options.temperature !== undefined && !isGemini3(canonicalModel)) {
    body.temperature = options.temperature;
  }
  if (options.stream !== undefined) body.stream = options.stream;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const level = thinkingOverride !== undefined ? thinkingOverride : ctx.thinkingLevel;

  if (provider === 'gemini_direct') {
    // OpenAI-compatible Gemini endpoint: Google-specific fields go into extra_body.
    if (level || options.thoughtSignatures?.length) {
      const google: Record<string, unknown> = {};
      if (level) google.thinking_config = { thinking_level: level };
      if (options.thoughtSignatures?.length) google.thought_signatures = options.thoughtSignatures;
      body.extra_body = { google };
    }
    if (ctx.maxOutputTokens) body.max_tokens = ctx.maxOutputTokens;
  } else {
    if (level) body.reasoning = { effort: openRouterEffort(level) };
    if (ctx.maxOutputTokens) body.max_tokens = ctx.maxOutputTokens;
    // Provider pinning only applies to models actually served by that provider
    // (e.g. Groq serves gpt-oss, not Gemini) — otherwise OpenRouter returns 404.
    if (ctx.providerRouting && !canonicalModel.startsWith('google/')) {
      body.provider = ctx.providerRouting;
    }
  }

  return body;
}

async function tryProvider(
  provider: ProviderId,
  canonicalModel: string,
  options: AiRequestOptions,
  ctx: AttemptContext,
  signal?: AbortSignal,
): Promise<ProviderAttempt> {
  const apiKey = providerEnvKey(provider);
  if (!apiKey) return { ok: false };
  if (Date.now() < exhaustedUntil[provider]) return { ok: false };
  if (!isModelAvailableOn(canonicalModel, provider)) return { ok: false };

  const nativeModel = resolveProviderModel(canonicalModel, provider);
  const useCase = ctx.useCase;

  const doFetch = async (thinkingOverride?: ThinkingLevel | null): Promise<ProviderAttempt> => {
    const body = buildBody(provider, canonicalModel, options, ctx, thinkingOverride);
    const start = Date.now();
    console.log(`${providerLabel(provider)} trying model: ${nativeModel} (use_case=${useCase}, thinking=${thinkingOverride !== undefined ? thinkingOverride : ctx.thinkingLevel ?? 'default'})`);

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
      const ttft = Date.now() - start;
      const resolvedProvider = response.headers.get('x-openrouter-provider')
        ?? response.headers.get('x-provider')
        ?? provider;

      const baseMetric = {
        use_case: useCase, provider, model: canonicalModel,
        thinking_level: (thinkingOverride !== undefined ? thinkingOverride : ctx.thinkingLevel) ?? null,
        resolved_provider: resolvedProvider,
        cache_hit: options.cacheHit ?? false,
      };

      // Streaming: measure TTFT at the first body chunk, log when the stream ends.
      if (options.stream && response.ok && response.body) {
        let firstChunkAt: number | null = null;
        const instrumented = response.body.pipeThrough(new TransformStream({
          transform(chunk, controller) {
            if (firstChunkAt === null) firstChunkAt = Date.now();
            controller.enqueue(chunk);
          },
          flush() {
            const total = Date.now() - start;
            logMetric({
              ...baseMetric,
              status_code: response.status, success: true,
              latency_ms: total, total_latency_ms: total,
              ttft_ms: firstChunkAt ? firstChunkAt - start : ttft,
              aborted: signal?.aborted ?? false,
            });
          },
        }));
        console.log(`✅ ${providerLabel(provider)} stream open (${nativeModel}, ttft≈${ttft}ms)`);
        return {
          ok: true,
          response: new Response(instrumented, { status: response.status, headers: response.headers }),
          resolvedProvider,
        };
      }

      // Non-streaming success: clone for usage extraction without consuming the body
      if (response.ok) {
        const clone = response.clone();
        clone.json().then((json) => {
          const usage = json?.usage ?? {};
          const promptTokens = usage.prompt_tokens ?? null;
          const completionTokens = usage.completion_tokens ?? null;
          const total = Date.now() - start;
          logMetric({
            ...baseMetric,
            status_code: response.status, success: true,
            latency_ms: total, total_latency_ms: total, ttft_ms: ttft,
            aborted: signal?.aborted ?? false,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: usage.total_tokens ?? null,
            estimated_cost_usd: estimateCost(canonicalModel, promptTokens, completionTokens),
          });
        }).catch(() => {
          const total = Date.now() - start;
          logMetric({ ...baseMetric, status_code: response.status, success: true, latency_ms: total, total_latency_ms: total, ttft_ms: ttft });
        });
        console.log(`✅ ${providerLabel(provider)} success (${nativeModel}, ${ttft}ms)`);
        return { ok: true, response, resolvedProvider };
      }

      // Error path
      const errText = await response.clone().text().catch(() => '');
      logMetric({
        ...baseMetric,
        status_code: response.status, success: false,
        latency_ms: ttft, total_latency_ms: Date.now() - start, ttft_ms: ttft,
        error_type: `http_${response.status}`,
      });

      // Missing / invalid thought signature → retry once with thinking_level "low"
      if (
        response.status === 400 &&
        thinkingOverride === undefined &&
        /thought[_ ]?signature/i.test(errText)
      ) {
        console.warn(`⚠️ ${providerLabel(provider)} thought-signature error — retry with thinking_level="low"`);
        return await doFetch('low');
      }

      if (response.status === 429) {
        console.warn(`⚠️ ${providerLabel(provider)} rate-limited (429) — abort chain`);
        return { ok: false, response, status: 429, shouldStop: true, resolvedProvider };
      }
      if (response.status === 402) {
        exhaustedUntil[provider] = Date.now() + EXHAUSTED_COOLDOWN_MS;
        console.warn(`⚠️ ${providerLabel(provider)} credits exhausted (402): ${errText.slice(0, 200)}`);
      } else {
        exhaustedUntil[provider] = Date.now() + ERROR_COOLDOWN_MS;
        console.warn(`⚠️ ${providerLabel(provider)} error (${response.status}): ${errText.slice(0, 400)}`);
      }
      return { ok: false, response, status: response.status, resolvedProvider };
    } catch (err) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onOuterAbort);
      const total = Date.now() - start;
      const isTimeout = (err as Error).name === 'AbortError';
      const outerAborted = isTimeout && (signal?.aborted ?? false);
      logMetric({
        use_case: useCase, provider, model: canonicalModel,
        thinking_level: ctx.thinkingLevel ?? null,
        resolved_provider: provider,
        cache_hit: options.cacheHit ?? false,
        status_code: null, success: false,
        latency_ms: total, total_latency_ms: total,
        aborted: outerAborted,
        error_type: outerAborted ? 'client_abort' : isTimeout ? 'timeout' : 'network',
      });
      // If the caller's outer signal aborted, propagate up.
      if (outerAborted) throw err;
      console.warn(`⚠️ ${providerLabel(provider)} ${isTimeout ? `timeout after ${PER_ATTEMPT_TIMEOUT_MS}ms` : 'unreachable'} (${nativeModel})`);
      return { ok: false };
    }
  };

  return await doFetch();
}

/**
 * Call AI with a configurable model + provider chain.
 *
 *   1. Build chain = [primary_model, ...fallback_models]
 *   2. For each model, walk provider_order (gemini_direct → openrouter)
 *   3. Per-attempt hard timeout (12s) — on timeout, move to next model/provider
 *   4. 429 from any attempt aborts the chain (rate-limit surfaced to caller)
 */
export async function callAI(
  options: AiRequestOptions,
  signal?: AbortSignal,
  useCase?: string,
): Promise<AiCallResult> {
  let primaryModel = options.model;
  let fallbackModels: string[] = [];
  let providerOrder: ProviderId[] = ['gemini_direct', 'openrouter'];
  let temperature = options.temperature;
  let thinkingLevel: ThinkingLevel | null = null;
  let maxOutputTokens: number | null = null;
  let providerRouting: Record<string, unknown> | null = null;

  if (useCase) {
    const cfg = await loadModelConfig(useCase);
    if (cfg && cfg.is_active) {
      primaryModel = cfg.primary_model;
      providerOrder = cfg.provider_order.length > 0 ? cfg.provider_order : ['gemini_direct', 'openrouter'];
      // fallback_models can be: string[] OR Array<{provider, model}> OR Array<{model}>
      fallbackModels = (cfg.fallback_models as unknown[]).map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'model' in entry) {
          return String((entry as { model: unknown }).model);
        }
        return '';
      }).filter((m) => m.length > 0);
      if (cfg.temperature !== null && temperature === undefined) temperature = cfg.temperature;
      thinkingLevel = cfg.thinking_level;
      maxOutputTokens = cfg.max_output_tokens;
      providerRouting = cfg.provider_routing;

      if (cfg.deprecation_date && new Date(cfg.deprecation_date).getTime() < Date.now() + 30 * 24 * 3600 * 1000) {
        console.warn(`⚠️ Model ${primaryModel} (use_case=${useCase}) deprecates on ${cfg.deprecation_date}`);
      }
    }
  }

  const effectiveOptions: AiRequestOptions = { ...options, temperature };
  const ctx: AttemptContext = { useCase: useCase ?? 'unknown', thinkingLevel, maxOutputTokens, providerRouting };
  const modelChain = [primaryModel, ...fallbackModels];

  console.log(`🤖 callAI use_case=${useCase ?? 'none'} chain=[${modelChain.join(', ')}] providers=[${providerOrder.join(', ')}]`);

  let lastResponse: Response | undefined;
  let lastStatus: number | undefined;
  let lastProvider: ProviderId = providerOrder[0];

  for (const model of modelChain) {
    for (const provider of providerOrder) {
      const attempt = await tryProvider(provider, model, effectiveOptions, ctx, signal);
      if ((attempt.ok || attempt.shouldStop) && attempt.response) {
        return { response: attempt.response, provider, model, resolvedProvider: attempt.resolvedProvider ?? provider };
      }
      if (attempt.response) {
        lastResponse = attempt.response;
        lastStatus = attempt.status;
        lastProvider = provider;
      }
    }
  }

  if (lastResponse) {
    return { response: lastResponse, provider: lastProvider, model: primaryModel, resolvedProvider: lastProvider };
  }
  throw new Error(`All AI models/providers failed for use_case="${useCase ?? 'unknown'}" chain=[${modelChain.join(', ')}] (last status: ${lastStatus ?? 'n/a'}).`);
}
