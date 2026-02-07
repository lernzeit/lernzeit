
-- Allow parents to view game_sessions of their linked children
CREATE POLICY "Parents can view linked children game sessions"
ON public.game_sessions
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
    AND pcr.child_id = game_sessions.user_id
  )
);

-- Drop old policy that only allowed self-access
DROP POLICY IF EXISTS "Users can view own game sessions" ON public.game_sessions;

-- Allow parents to view user_difficulty_profiles of their linked children
CREATE POLICY "Parents can view linked children difficulty profiles"
ON public.user_difficulty_profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
    AND pcr.child_id = user_difficulty_profiles.user_id
  )
);

-- Drop old policy that only allowed self-access
DROP POLICY IF EXISTS "Users can view their own difficulty profiles" ON public.user_difficulty_profiles;
