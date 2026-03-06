
-- 1. Create prompt_rules table
CREATE TABLE public.prompt_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text text NOT NULL,
  subject text DEFAULT NULL,
  grade_min integer DEFAULT NULL,
  grade_max integer DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  source_feedback_ids uuid[] NOT NULL DEFAULT '{}',
  source_feedback_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz DEFAULT NULL
);

-- RLS
ALTER TABLE public.prompt_rules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active rules
CREATE POLICY "Authenticated users can read prompt rules"
  ON public.prompt_rules FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage all rules
CREATE POLICY "Service role manages prompt rules"
  ON public.prompt_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can manage prompt rules
CREATE POLICY "Admins can manage prompt rules"
  ON public.prompt_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Add analyzed_at to question_feedback
ALTER TABLE public.question_feedback
  ADD COLUMN analyzed_at timestamptz DEFAULT NULL;
