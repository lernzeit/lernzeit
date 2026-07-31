-- === TEIL A: ai_model_config erweitern ===
ALTER TABLE public.ai_model_config
  ADD COLUMN IF NOT EXISTS thinking_level text,
  ADD COLUMN IF NOT EXISTS max_output_tokens integer,
  ADD COLUMN IF NOT EXISTS provider_routing jsonb,
  ADD COLUMN IF NOT EXISTS deprecation_date date;

CREATE OR REPLACE FUNCTION public.validate_ai_model_config()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.thinking_level IS NOT NULL AND NEW.thinking_level NOT IN ('minimal','low','medium','high') THEN
    RAISE EXCEPTION 'thinking_level must be one of minimal, low, medium, high';
  END IF;
  IF NEW.max_output_tokens IS NOT NULL AND (NEW.max_output_tokens < 1 OR NEW.max_output_tokens > 65536) THEN
    RAISE EXCEPTION 'max_output_tokens must be between 1 and 65536';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ai_model_config_trigger ON public.ai_model_config;
CREATE TRIGGER validate_ai_model_config_trigger
  BEFORE INSERT OR UPDATE ON public.ai_model_config
  FOR EACH ROW EXECUTE FUNCTION public.validate_ai_model_config();

-- unique key on use_case (needed for upserts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ai_model_config'::regclass
      AND conname = 'ai_model_config_use_case_key'
  ) THEN
    -- remove potential duplicates first
    DELETE FROM public.ai_model_config a
      USING public.ai_model_config b
      WHERE a.use_case = b.use_case AND a.ctid > b.ctid;
    ALTER TABLE public.ai_model_config ADD CONSTRAINT ai_model_config_use_case_key UNIQUE (use_case);
  END IF;
END $$;

-- === Alte Einträge entfernen ===
DELETE FROM public.ai_model_config WHERE use_case = 'question_generator';

-- === Neue Konfiguration ===
INSERT INTO public.ai_model_config
  (use_case, display_name, primary_model, fallback_models, provider_order, temperature,
   thinking_level, max_output_tokens, provider_routing, deprecation_date, is_active, notes)
VALUES
  ('question_generator_live', 'Fragengenerator (Live / Cache-Miss)', 'google/gemini-3.1-flash-lite',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'minimal', 1024, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true,
   'Latenzkritischer Pfad bei Cache-Miss.'),
  ('question_generator_batch', 'Fragengenerator (Batch / Vorgenerierung)', 'google/gemini-3.5-flash',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'medium', 2048, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true,
   'Offline-Poolvorgenerierung, Qualität vor Latenz.'),
  ('ai_explain', 'KI-Erklärung', 'google/gemini-3.1-flash-lite',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'low', 512, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true, NULL),
  ('ai_tutor', 'KI-Tutor', 'google/gemini-3.5-flash',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'low', 400, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true,
   'Token-Limit 400 ist die Kostenbremse bei abgebrochenen Streams.'),
  ('validate_answer', 'Antwortprüfung', 'google/gemini-3.1-flash-lite',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'minimal', 128, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true, NULL),
  ('validate_question', 'Fragenprüfung', 'google/gemini-3.1-flash-lite',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'low', 512, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true,
   'Deterministische Mathe-Prüfung ist vorgelagert.'),
  ('analyze_feedback', 'Feedback-Analyse', 'google/gemini-3.5-flash',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'high', 4096, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true, NULL),
  ('learning_plan', 'Lernplan-Generator', 'google/gemini-3.5-flash',
   '["openai/gpt-oss-120b"]'::jsonb, '["gemini_direct","openrouter"]'::jsonb, 1.0,
   'medium', 4096, '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb, NULL, true, NULL)
ON CONFLICT (use_case) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  primary_model     = EXCLUDED.primary_model,
  fallback_models   = EXCLUDED.fallback_models,
  provider_order    = EXCLUDED.provider_order,
  temperature       = EXCLUDED.temperature,
  thinking_level    = EXCLUDED.thinking_level,
  max_output_tokens = EXCLUDED.max_output_tokens,
  provider_routing  = EXCLUDED.provider_routing,
  is_active         = true,
  updated_at        = now();

-- Restliche Alt-Einträge deaktivieren
UPDATE public.ai_model_config
  SET is_active = false, updated_at = now()
  WHERE use_case NOT IN (
    'question_generator_live','question_generator_batch','ai_explain','ai_tutor',
    'validate_answer','validate_question','analyze_feedback','learning_plan');

-- === Metriken erweitern ===
ALTER TABLE public.ai_model_metrics
  ADD COLUMN IF NOT EXISTS ttft_ms integer,
  ADD COLUMN IF NOT EXISTS total_latency_ms integer,
  ADD COLUMN IF NOT EXISTS thinking_level text,
  ADD COLUMN IF NOT EXISTS resolved_provider text,
  ADD COLUMN IF NOT EXISTS cache_hit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aborted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_created_use_case
  ON public.ai_model_metrics (created_at DESC, use_case);

-- === Latenz-Auswertung für das Admin-Panel ===
CREATE OR REPLACE FUNCTION public.get_ai_latency_summary(p_days integer DEFAULT 7)
RETURNS TABLE(
  use_case text,
  provider text,
  total_calls bigint,
  ttft_p50 numeric,
  ttft_p95 numeric,
  latency_p50 numeric,
  latency_p95 numeric,
  cache_hit_rate numeric,
  abort_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    m.use_case,
    COALESCE(m.resolved_provider, m.provider) AS provider,
    COUNT(*)::bigint AS total_calls,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.ttft_ms)::numeric, 0) AS ttft_p50,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.ttft_ms)::numeric, 0) AS ttft_p95,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY COALESCE(m.total_latency_ms, m.latency_ms))::numeric, 0) AS latency_p50,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY COALESCE(m.total_latency_ms, m.latency_ms))::numeric, 0) AS latency_p95,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.cache_hit) / NULLIF(COUNT(*),0), 2) AS cache_hit_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.aborted) / NULLIF(COUNT(*),0), 2) AS abort_rate
  FROM public.ai_model_metrics m
  WHERE m.created_at >= now() - (p_days || ' days')::interval
  GROUP BY m.use_case, COALESCE(m.resolved_provider, m.provider)
  ORDER BY total_calls DESC;
END;
$$;