-- ============================================================
-- AI Model Configuration
-- ============================================================
CREATE TABLE public.ai_model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case text NOT NULL UNIQUE,
  display_name text NOT NULL,
  primary_model text NOT NULL,
  fallback_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_order jsonb NOT NULL DEFAULT '["gemini_direct","openrouter","lovable"]'::jsonb,
  temperature numeric,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_model_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active model config"
ON public.ai_model_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage model config"
ON public.ai_model_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages model config"
ON public.ai_model_config FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ai_model_config_updated_at
BEFORE UPDATE ON public.ai_model_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AI Model Metrics (append-only telemetry)
-- ============================================================
CREATE TABLE public.ai_model_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  status_code int,
  success boolean NOT NULL DEFAULT false,
  latency_ms int,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  estimated_cost_usd numeric(10,6),
  error_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_model_metrics_usecase_time ON public.ai_model_metrics (use_case, created_at DESC);
CREATE INDEX idx_ai_model_metrics_model_time ON public.ai_model_metrics (model, created_at DESC);
CREATE INDEX idx_ai_model_metrics_created_at ON public.ai_model_metrics (created_at DESC);

ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics"
ON public.ai_model_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages metrics"
ON public.ai_model_metrics FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- Aggregation RPC (server-side, avoids 1000-row limit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_model_metrics_summary(
  p_since timestamptz DEFAULT (now() - interval '24 hours'),
  p_use_case text DEFAULT NULL
)
RETURNS TABLE (
  use_case text,
  provider text,
  model text,
  total_calls bigint,
  success_calls bigint,
  error_calls bigint,
  success_rate numeric,
  avg_latency_ms numeric,
  p95_latency_ms numeric,
  total_prompt_tokens bigint,
  total_completion_tokens bigint,
  total_cost_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    m.use_case,
    m.provider,
    m.model,
    COUNT(*)::bigint AS total_calls,
    COUNT(*) FILTER (WHERE m.success)::bigint AS success_calls,
    COUNT(*) FILTER (WHERE NOT m.success)::bigint AS error_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.success) / NULLIF(COUNT(*),0), 2) AS success_rate,
    ROUND(AVG(m.latency_ms)::numeric, 0) AS avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms)::numeric, 0) AS p95_latency_ms,
    COALESCE(SUM(m.prompt_tokens), 0)::bigint AS total_prompt_tokens,
    COALESCE(SUM(m.completion_tokens), 0)::bigint AS total_completion_tokens,
    ROUND(COALESCE(SUM(m.estimated_cost_usd), 0)::numeric, 4) AS total_cost_usd
  FROM public.ai_model_metrics m
  WHERE m.created_at >= p_since
    AND (p_use_case IS NULL OR m.use_case = p_use_case)
  GROUP BY m.use_case, m.provider, m.model
  ORDER BY total_calls DESC;
END;
$$;

-- ============================================================
-- Seed default config (mirrors current hardcoded behaviour)
-- ============================================================
INSERT INTO public.ai_model_config (use_case, display_name, primary_model, provider_order, temperature) VALUES
  ('question_generator', 'Fragen-Generator', 'google/gemini-3-flash-preview', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL),
  ('ai_tutor',           'KI-Tutor',         'google/gemini-3-flash-preview', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL),
  ('ai_explain',         'Antwort-Erklärung','google/gemini-3-flash-preview', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL),
  ('validate_answer',    'Antwort-Validierung','google/gemini-2.5-flash-lite', '["gemini_direct","openrouter","lovable"]'::jsonb, 0.1),
  ('validate_question',  'Fragen-Validierung', 'google/gemini-3-flash-preview', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL),
  ('learning_plan',      'Lernplan-Generator', 'google/gemini-2.5-flash', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL),
  ('analyze_feedback',   'Feedback-Analyse',   'google/gemini-2.5-flash', '["gemini_direct","openrouter","lovable"]'::jsonb, NULL);