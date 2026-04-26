/**
 * Curated catalogue of AI models available for selection in the admin dashboard.
 * Pricing is best-effort (USD per 1M tokens) and may need periodic updates.
 *
 * `id` is the canonical identifier used in `ai_model_config.primary_model`.
 * It maps to provider-specific names below.
 */

export type ProviderId = 'gemini_direct' | 'openrouter' | 'lovable';

export interface ModelInfo {
  id: string;
  label: string;
  family: 'google' | 'openai' | 'anthropic' | 'meta' | 'mistral' | 'deepseek' | 'other';
  // Provider-native model IDs (null = not available on that provider)
  gemini_id: string | null;
  openrouter_id: string | null;
  lovable_id: string | null;
  input_price_per_1m: number;  // USD
  output_price_per_1m: number; // USD
  supports_tools: boolean;
  recommended_for: string[];
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  // ── Google Gemini ──────────────────────────────────────────
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    family: 'google',
    gemini_id: 'gemini-2.5-flash-lite-preview-06-17',
    openrouter_id: 'google/gemini-2.5-flash-lite-preview-06-17',
    lovable_id: 'google/gemini-2.5-flash-lite',
    input_price_per_1m: 0.10,
    output_price_per_1m: 0.40,
    supports_tools: true,
    recommended_for: ['validate_answer', 'classification'],
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    family: 'google',
    gemini_id: 'gemini-2.5-flash',
    openrouter_id: 'google/gemini-2.5-flash',
    lovable_id: 'google/gemini-2.5-flash',
    input_price_per_1m: 0.30,
    output_price_per_1m: 2.50,
    supports_tools: true,
    recommended_for: ['question_generator', 'ai_explain', 'analyze_feedback'],
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    family: 'google',
    gemini_id: 'gemini-2.5-flash',
    openrouter_id: 'google/gemini-2.5-flash',
    lovable_id: 'google/gemini-3-flash-preview',
    input_price_per_1m: 0.30,
    output_price_per_1m: 2.50,
    supports_tools: true,
    recommended_for: ['question_generator', 'ai_tutor', 'ai_explain'],
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    family: 'google',
    gemini_id: 'gemini-2.5-pro',
    openrouter_id: 'google/gemini-2.5-pro',
    lovable_id: 'google/gemini-2.5-pro',
    input_price_per_1m: 1.25,
    output_price_per_1m: 10.00,
    supports_tools: true,
    recommended_for: ['analyze_feedback', 'learning_plan'],
  },

  // ── OpenAI ────────────────────────────────────────────────
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    family: 'openai',
    gemini_id: null,
    openrouter_id: 'openai/gpt-4o-mini',
    lovable_id: null,
    input_price_per_1m: 0.15,
    output_price_per_1m: 0.60,
    supports_tools: true,
    recommended_for: ['question_generator', 'validate_answer'],
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    family: 'openai',
    gemini_id: null,
    openrouter_id: 'openai/gpt-4o',
    lovable_id: null,
    input_price_per_1m: 2.50,
    output_price_per_1m: 10.00,
    supports_tools: true,
    recommended_for: ['analyze_feedback', 'learning_plan'],
  },

  // ── Anthropic ─────────────────────────────────────────────
  {
    id: 'anthropic/claude-haiku-4',
    label: 'Claude Haiku 4',
    family: 'anthropic',
    gemini_id: null,
    openrouter_id: 'anthropic/claude-haiku-4',
    lovable_id: null,
    input_price_per_1m: 1.00,
    output_price_per_1m: 5.00,
    supports_tools: true,
    recommended_for: ['ai_tutor', 'ai_explain'],
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    family: 'anthropic',
    gemini_id: null,
    openrouter_id: 'anthropic/claude-sonnet-4',
    lovable_id: null,
    input_price_per_1m: 3.00,
    output_price_per_1m: 15.00,
    supports_tools: true,
    recommended_for: ['analyze_feedback', 'learning_plan'],
  },

  // ── Open / Cheap ─────────────────────────────────────────
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B',
    family: 'meta',
    gemini_id: null,
    openrouter_id: 'meta-llama/llama-3.3-70b-instruct',
    lovable_id: null,
    input_price_per_1m: 0.13,
    output_price_per_1m: 0.40,
    supports_tools: true,
    recommended_for: ['question_generator', 'ai_explain'],
  },
  {
    id: 'google/gemma-3-12b-it',
    label: 'Gemma 3 12B',
    family: 'google',
    gemini_id: null,
    openrouter_id: 'google/gemma-3-12b-it',
    lovable_id: null,
    input_price_per_1m: 0.05,
    output_price_per_1m: 0.10,
    supports_tools: false,
    recommended_for: ['validate_answer'],
  },
  {
    id: 'deepseek/deepseek-chat-v3',
    label: 'DeepSeek V3',
    family: 'deepseek',
    gemini_id: null,
    openrouter_id: 'deepseek/deepseek-chat',
    lovable_id: null,
    input_price_per_1m: 0.27,
    output_price_per_1m: 1.10,
    supports_tools: true,
    recommended_for: ['question_generator', 'analyze_feedback'],
  },
  {
    id: 'mistralai/mistral-large',
    label: 'Mistral Large',
    family: 'mistral',
    gemini_id: null,
    openrouter_id: 'mistralai/mistral-large-2411',
    lovable_id: null,
    input_price_per_1m: 2.00,
    output_price_per_1m: 6.00,
    supports_tools: true,
    recommended_for: ['analyze_feedback'],
  },
];

export function getModelInfo(id: string): ModelInfo | null {
  return RECOMMENDED_MODELS.find((m) => m.id === id) ?? null;
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
    case 'lovable':       return info.lovable_id ?? canonicalId;
  }
}

/** Returns true if the model is known to be available on the given provider. */
export function isModelAvailableOn(canonicalId: string, provider: ProviderId): boolean {
  const info = getModelInfo(canonicalId);
  if (!info) return true; // unknown freetext model — allow attempt
  switch (provider) {
    case 'gemini_direct': return info.gemini_id !== null;
    case 'openrouter':    return info.openrouter_id !== null;
    case 'lovable':       return info.lovable_id !== null;
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