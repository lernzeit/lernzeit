/**
 * Frontend mirror of `supabase/functions/_shared/model-catalog.ts`.
 * Keep in sync when adding/removing models.
 */

export type ProviderId = 'gemini_direct' | 'openrouter';

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini_direct: 'Gemini Direct',
  openrouter: 'OpenRouter',
};

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_LEVELS: ThinkingLevel[] = ['minimal', 'low', 'medium', 'high'];

export interface ModelInfo {
  id: string;
  label: string;
  family: 'google' | 'openai' | 'anthropic' | 'meta' | 'mistral' | 'deepseek' | 'other';
  input_price_per_1m: number;
  output_price_per_1m: number;
  available_on: ProviderId[];
  /** Gemini 3 models must run at temperature 1.0. */
  requires_default_temperature: boolean;
  recommended_for: string[];
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  { id: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', family: 'google', input_price_per_1m: 0.10, output_price_per_1m: 0.40, available_on: ['gemini_direct', 'openrouter'], requires_default_temperature: true, recommended_for: ['question_generator_live', 'validate_answer', 'validate_question', 'ai_explain'] },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash', family: 'google', input_price_per_1m: 0.30, output_price_per_1m: 2.50, available_on: ['gemini_direct', 'openrouter'], requires_default_temperature: true, recommended_for: ['question_generator_batch', 'ai_tutor', 'analyze_feedback', 'learning_plan'] },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Groq)', family: 'openai', input_price_per_1m: 0.15, output_price_per_1m: 0.60, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['question_generator_live', 'question_generator_batch', 'ai_explain', 'ai_tutor', 'validate_answer', 'validate_question', 'analyze_feedback', 'learning_plan'] },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4', family: 'anthropic', input_price_per_1m: 1.00, output_price_per_1m: 5.00, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['ai_tutor', 'ai_explain'] },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', family: 'anthropic', input_price_per_1m: 3.00, output_price_per_1m: 15.00, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['analyze_feedback', 'learning_plan'] },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', family: 'meta', input_price_per_1m: 0.13, output_price_per_1m: 0.40, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['question_generator_batch', 'ai_explain'] },
  { id: 'deepseek/deepseek-chat-v3', label: 'DeepSeek V3', family: 'deepseek', input_price_per_1m: 0.27, output_price_per_1m: 1.10, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['question_generator_batch', 'analyze_feedback'] },
  { id: 'mistralai/mistral-large', label: 'Mistral Large', family: 'mistral', input_price_per_1m: 2.00, output_price_per_1m: 6.00, available_on: ['openrouter'], requires_default_temperature: false, recommended_for: ['analyze_feedback'] },
];

export function getModelLabel(id: string): string {
  return RECOMMENDED_MODELS.find((m) => m.id === id)?.label ?? id;
}

export function isGemini3(id: string): boolean {
  return /^google\/gemini-3/.test(id);
}
