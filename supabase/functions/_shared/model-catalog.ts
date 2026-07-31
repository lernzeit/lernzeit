/**
 * Curated catalogue of AI models available for selection in the admin dashboard.
 * Pricing is best-effort (USD per 1M tokens) and may need periodic updates.
 *
 * `id` is the canonical identifier used in `ai_model_config.primary_model`.
 * It maps to provider-specific names below.
 *
 * Providers: Google (direct) and OpenRouter. The Lovable Gateway has been removed.
 */

export type ProviderId = 'gemini_direct' | 'openrouter';

export interface ModelInfo {
  id: string;
  label: string;
  family: 'google' | 'openai' | 'anthropic' | 'meta' | 'mistral' | 'deepseek' | 'other';
  // Provider-native model IDs (null = not available on that provider)
  gemini_id: string | null;
  openrouter_id: string | null;
  input_price_per_1m: number;  // USD
  output_price_per_1m: number; // USD
  supports_tools: boolean;
  /** Gemini 3 models must run at temperature 1.0 (default). */
  requires_default_temperature: boolean;
  recommended_for: string[];
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  // ── Google Gemini 3 ────────────────────────────────────────
  {
    id: 'google/gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    family: 'google',
    gemini_id: 'gemini-3.1-flash-lite',
    openrouter_id: 'google/gemini-3.1-flash-lite',
    input_price_per_1m: 0.10,
    output_price_per_1m: 0.40,
    supports_tools: true,
    requires_default_temperature: true,
    recommended_for: ['question_generator_live', 'validate_answer', 'validate_question', 'ai_explain'],
  },
  {
    id: 'google/gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    family: 'google',
    gemini_id: 'gemini-3.5-flash',
    openrouter_id: 'google/gemini-3.5-flash',
    input_price_per_1m: 0.30,
    output_price_per_1m: 2.50,
    supports_tools: true,
    requires_default_temperature: true,
    recommended_for: ['question_generator_batch', 'ai_tutor', 'analyze_feedback', 'learning_plan'],
  },

  // ── OpenRouter fallback (pinned to Groq via provider_routing) ──
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B (Groq)',
    family: 'openai',
    gemini_id: null,
    openrouter_id: 'openai/gpt-oss-120b',
    input_price_per_1m: 0.15,
    output_price_per_1m: 0.60,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: [
      'question_generator_live', 'question_generator_batch', 'ai_explain', 'ai_tutor',
      'validate_answer', 'validate_question', 'analyze_feedback', 'learning_plan',
    ],
  },

  // ── Weitere OpenRouter-Modelle ────────────────────────────
  {
    id: 'anthropic/claude-haiku-4',
    label: 'Claude Haiku 4',
    family: 'anthropic',
    gemini_id: null,
    openrouter_id: 'anthropic/claude-haiku-4',
    input_price_per_1m: 1.00,
    output_price_per_1m: 5.00,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: ['ai_tutor', 'ai_explain'],
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    family: 'anthropic',
    gemini_id: null,
    openrouter_id: 'anthropic/claude-sonnet-4',
    input_price_per_1m: 3.00,
    output_price_per_1m: 15.00,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: ['analyze_feedback', 'learning_plan'],
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B',
    family: 'meta',
    gemini_id: null,
    openrouter_id: 'meta-llama/llama-3.3-70b-instruct',
    input_price_per_1m: 0.13,
    output_price_per_1m: 0.40,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: ['question_generator_batch', 'ai_explain'],
  },
  {
    id: 'deepseek/deepseek-chat-v3',
    label: 'DeepSeek V3',
    family: 'deepseek',
    gemini_id: null,
    openrouter_id: 'deepseek/deepseek-chat',
    input_price_per_1m: 0.27,
    output_price_per_1m: 1.10,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: ['question_generator_batch', 'analyze_feedback'],
  },
  {
    id: 'mistralai/mistral-large',
    label: 'Mistral Large',
    family: 'mistral',
    gemini_id: null,
    openrouter_id: 'mistralai/mistral-large-2411',
    input_price_per_1m: 2.00,
    output_price_per_1m: 6.00,
    supports_tools: true,
    requires_default_temperature: false,
    recommended_for: ['analyze_feedback'],
  },
];

export function getModelInfo(id: string): ModelInfo | null {
  return RECOMMENDED_MODELS.find((m) => m.id === id) ?? null;
}

/** True for the Gemini 3 family, which must run at the default temperature of 1.0. */
export function isGemini3(canonicalId: string): boolean {
  return /^google\/gemini-3/.test(canonicalId);
}

/**
 * Resolve canonical model id to provider-native id.
 * Falls back to the canonical id if no mapping is known (allows freetext model ids).
 */
export function resolveProviderModel(canonicalId: string, provider: ProviderId): string {
  const info = getModelInfo(canonicalId);
  if (!info) return canonicalId;
  switch (provider) {
    case 'gemini_direct': return info.gemini_id ?? canonicalId;
    case 'openrouter':    return info.openrouter_id ?? canonicalId;
  }
}

/** Returns true if the model is known to be available on the given provider. */
export function isModelAvailableOn(canonicalId: string, provider: ProviderId): boolean {
  const info = getModelInfo(canonicalId);
  if (!info) return true; // unknown freetext model — allow attempt
  switch (provider) {
    case 'gemini_direct': return info.gemini_id !== null;
    case 'openrouter':    return info.openrouter_id !== null;
  }
}

export function estimateCost(
  canonicalId: string,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined,
): number | null {
  const info = getModelInfo(canonicalId);
  if (!info) return null;
  const p = (promptTokens ?? 0) / 1_000_000 * info.input_price_per_1m;
  const c = (completionTokens ?? 0) / 1_000_000 * info.output_price_per_1m;
  return Math.round((p + c) * 1_000_000) / 1_000_000;
}
