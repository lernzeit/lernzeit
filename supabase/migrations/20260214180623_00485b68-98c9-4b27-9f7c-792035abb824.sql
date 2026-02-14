
-- Fix: Add missing parent access RLS policies for learning_sessions
CREATE POLICY "Parents can view children learning sessions"
ON public.learning_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
    AND pcr.child_id = learning_sessions.user_id
  )
);

-- Fix: Add missing parent access RLS policies for user_earned_minutes
CREATE POLICY "Parents can view children earned minutes"
ON public.user_earned_minutes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
    AND pcr.child_id = user_earned_minutes.user_id
  )
);

-- Fix: Add missing parent access RLS policies for user_achievements
CREATE POLICY "Parents can view children achievements"
ON public.user_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid()
    AND pcr.child_id = user_achievements.user_id
  )
);
