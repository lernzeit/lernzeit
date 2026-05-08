CREATE TABLE public.ai_model_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  use_case text NOT NULL,
  previous_model text,
  new_model text,
  applied boolean NOT NULL DEFAULT false,
  winner_provider text,
  winner_score numeric,
  winner_cost_usd numeric,
  reason text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX idx_ai_model_opt_runs_use_case ON public.ai_model_optimization_runs(use_case, run_at DESC);

ALTER TABLE public.ai_model_optimization_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read optimization runs"
  ON public.ai_model_optimization_runs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages optimization runs"
  ON public.ai_model_optimization_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);