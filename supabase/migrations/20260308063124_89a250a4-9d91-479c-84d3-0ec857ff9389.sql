CREATE POLICY "Children can view their own learning plans"
  ON public.learning_plans FOR SELECT
  USING (auth.uid() = child_id);