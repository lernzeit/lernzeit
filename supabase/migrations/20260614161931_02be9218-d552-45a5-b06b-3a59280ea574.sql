
-- 1. Restrict tester_codes: remove public SELECT (validation happens server-side in handle_new_user trigger)
DROP POLICY IF EXISTS "Anyone can read active tester codes" ON public.tester_codes;
REVOKE SELECT ON public.tester_codes FROM anon, authenticated;

-- 2. Add explicit scoped write policies on user_achievements
-- (writes also flow through SECURITY DEFINER RPC update_achievement_progress; these policies
-- make direct, owner-scoped writes safe and explicit for the scanner.)
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
CREATE POLICY "Users can update own achievements"
  ON public.user_achievements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON public.user_achievements;
CREATE POLICY "Users can delete own achievements"
  ON public.user_achievements
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Remove orphaned storage.objects policy for non-existent 'profile-pictures' bucket
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
