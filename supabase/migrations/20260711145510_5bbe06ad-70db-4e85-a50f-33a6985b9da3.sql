DROP POLICY IF EXISTS "Authenticated can read votes" ON public.feature_idea_votes;
CREATE POLICY "Users can read only their own votes"
  ON public.feature_idea_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);