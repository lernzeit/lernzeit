
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can submit feedback" ON public.question_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.question_feedback;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can submit feedback"
ON public.question_feedback
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.question_feedback
FOR SELECT
TO public
USING (auth.uid() = user_id);
