-- Allow admins to read all question feedback for analysis
CREATE POLICY "Admins can view all feedback"
ON public.question_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));