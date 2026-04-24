CREATE TABLE IF NOT EXISTS public.user_streak_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  streak_value integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  last_activity_date date,
  last_reactivated_at timestamp with time zone,
  last_push_sent_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streak_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak state" ON public.user_streak_states;
DROP POLICY IF EXISTS "Users can create own streak state" ON public.user_streak_states;
DROP POLICY IF EXISTS "Users can update own streak state" ON public.user_streak_states;
DROP POLICY IF EXISTS "Parents can view linked children streak state" ON public.user_streak_states;
DROP POLICY IF EXISTS "Service role manages streak states" ON public.user_streak_states;

CREATE POLICY "Users can view own streak state"
ON public.user_streak_states
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streak state"
ON public.user_streak_states
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak state"
ON public.user_streak_states
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can view linked children streak state"
ON public.user_streak_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
      AND pcr.child_id = user_streak_states.user_id
  )
);

CREATE POLICY "Service role manages streak states"
ON public.user_streak_states
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_user_streak_states_user_id ON public.user_streak_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streak_states_status ON public.user_streak_states(status);

CREATE OR REPLACE FUNCTION public.touch_user_streak_states_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_streak_states_updated_at ON public.user_streak_states;
CREATE TRIGGER update_user_streak_states_updated_at
BEFORE UPDATE ON public.user_streak_states
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_streak_states_updated_at();