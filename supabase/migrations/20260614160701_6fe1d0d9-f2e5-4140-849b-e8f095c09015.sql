UPDATE public.ai_model_config
SET primary_model = 'google/gemini-2.5-flash-lite',
    fallback_models = '["google/gemini-3.1-flash-lite-preview","google/gemini-3-flash-preview"]'::jsonb,
    provider_order = '["lovable"]'::jsonb,
    temperature = 0.8,
    is_active = true
WHERE use_case = 'question_generator';