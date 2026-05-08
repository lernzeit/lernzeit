/**
 * Frontend mirror of `supabase/functions/_shared/model-catalog.ts`.
 * Keep in sync when adding/removing models.
 */

export type ProviderId = 'gemini_direct' | 'openrouter' | 'lovable';

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini_direct: 'Gemini Direct',
  openrouter: 'OpenRouter',
  lovable: 'Lovable Gateway',
};

export interface ModelInfo {
  id: string;
  label: string;
  family: 'google' | 'openai' | 'anthropic' | 'meta' | 'mistral' | 'deepseek' | 'other';
  input_price_per_1m: number;
  output_price_per_1m: number;
  available_on: ProviderId[];
  recommended_for: string[];
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
  { id: 'openrouter/free', label: 'OpenRouter Free (Auto)', family: 'other', input_price_per_1m: 0, output_price_per_1m: 0, available_on: ['openrouter'], recommended_for: ['validate_answer', 'question_generator', 'ai_explain', 'ai_tutor', 'analyze_feedback'] },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', family: 'google', input_price_per_1m: 0.10, output_price_per_1m: 0.40, available_on: ['gemini_direct', 'openrouter', 'lovable'], recommended_for: ['validate_answer'] },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', family: 'google', input_price_per_1m: 0.30, output_price_per_1m: 2.50, available_on: ['gemini_direct', 'openrouter', 'lovable'], recommended_for: ['question_generator', 'ai_explain'] },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)', family: 'google', input_price_per_1m: 0.30, output_price_per_1m: 2.50, available_on: ['gemini_direct', 'openrouter', 'lovable'], recommended_for: ['question_generator', 'ai_tutor'] },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', family: 'google', input_price_per_1m: 1.25, output_price_per_1m: 10.00, available_on: ['gemini_direct', 'openrouter', 'lovable'], recommended_for: ['analyze_feedback', 'learning_plan'] },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', family: 'openai', input_price_per_1m: 0.15, output_price_per_1m: 0.60, available_on: ['openrouter'], recommended_for: ['question_generator'] },
  { id: 'openai/gpt-4o', label: 'GPT-4o', family: 'openai', input_price_per_1m: 2.50, output_price_per_1m: 10.00, available_on: ['openrouter'], recommended_for: ['analyze_feedback'] },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4', family: 'anthropic', input_price_per_1m: 1.00, output_price_per_1m: 5.00, available_on: ['openrouter'], recommended_for: ['ai_tutor'] },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', family: 'anthropic', input_price_per_1m: 3.00, output_price_per_1m: 15.00, available_on: ['openrouter'], recommended_for: ['analyze_feedback'] },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', family: 'meta', input_price_per_1m: 0.13, output_price_per_1m: 0.40, available_on: ['openrouter'], recommended_for: ['question_generator'] },
  { id: 'google/gemma-3-12b-it', label: 'Gemma 3 12B', family: 'google', input_price_per_1m: 0.05, output_price_per_1m: 0.10, available_on: ['openrouter'], recommended_for: ['validate_answer'] },
  { id: 'deepseek/deepseek-chat-v3', label: 'DeepSeek V3', family: 'deepseek', input_price_per_1m: 0.27, output_price_per_1m: 1.10, available_on: ['openrouter'], recommended_for: ['question_generator'] },
  { id: 'mistralai/mistral-large', label: 'Mistral Large', family: 'mistral', input_price_per_1m: 2.00, output_price_per_1m: 6.00, available_on: ['openrouter'], recommended_for: ['analyze_feedback'] },
];

export function getModelLabel(id: string): string {
  return RECOMMENDED_MODELS.find((m) => m.id === id)?.label ?? id;
}