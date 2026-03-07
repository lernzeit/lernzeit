
CREATE TABLE public.learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  child_name text NOT NULL DEFAULT '',
  grade integer NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  test_date date,
  plan_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own learning plans"
  ON public.learning_plans FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own learning plans"
  ON public.learning_plans FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own learning plans"
  ON public.learning_plans FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own learning plans"
  ON public.learning_plans FOR DELETE
  USING (auth.uid() = parent_id);

CREATE TRIGGER update_learning_plans_updated_at
  BEFORE UPDATE ON public.learning_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
