
UPDATE public.ai_model_config
SET primary_model = 'google/gemini-2.5-flash-lite',
    provider_order = '["gemini_direct", "openrouter", "lovable"]'::jsonb,
    temperature = 0.8,
    updated_at = now()
WHERE use_case = 'question_generator';

CREATE INDEX IF NOT EXISTS idx_ai_question_cache_lookup
  ON public.ai_question_cache (grade, subject, difficulty, times_served);
