
-- Daily Challenges table
CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL DEFAULT CURRENT_DATE,
  challenge_type text NOT NULL, -- 'subject', 'speed', 'perfect'
  challenge_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. {"subject":"math","target_questions":10,"target_accuracy":80}
  -- or {"target_questions":5,"max_seconds":180}
  -- or {"target_questions":5,"target_accuracy":100}
  reward_minutes integer NOT NULL DEFAULT 2,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
  ON public.daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON public.daily_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON public.daily_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children challenges"
  ON public.daily_challenges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid() AND pcr.child_id = daily_challenges.user_id
  ));
