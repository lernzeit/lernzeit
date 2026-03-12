
-- =====================================================
-- Fix ALL restrictive RLS policies to PERMISSIVE
-- =====================================================

-- 1. achievements_template
DROP POLICY IF EXISTS "Anyone can view achievement templates" ON public.achievements_template;
CREATE POLICY "Anyone can view achievement templates" ON public.achievements_template FOR SELECT TO public USING (true);

-- 2. ai_question_cache
DROP POLICY IF EXISTS "Authenticated users can read cache" ON public.ai_question_cache;
DROP POLICY IF EXISTS "Service role manages cache" ON public.ai_question_cache;
CREATE POLICY "Authenticated users can read cache" ON public.ai_question_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages cache" ON public.ai_question_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. child_settings
DROP POLICY IF EXISTS "Children can view their own settings" ON public.child_settings;
DROP POLICY IF EXISTS "Parents can create child settings" ON public.child_settings;
DROP POLICY IF EXISTS "Parents can delete child settings" ON public.child_settings;
DROP POLICY IF EXISTS "Parents can update child settings" ON public.child_settings;
DROP POLICY IF EXISTS "Parents can view their child settings" ON public.child_settings;
CREATE POLICY "Children can view their own settings" ON public.child_settings FOR SELECT TO public USING (auth.uid() = child_id);
CREATE POLICY "Parents can create child settings" ON public.child_settings FOR INSERT TO public WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can delete child settings" ON public.child_settings FOR DELETE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can update child settings" ON public.child_settings FOR UPDATE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can view their child settings" ON public.child_settings FOR SELECT TO public USING (auth.uid() = parent_id);

-- 4. child_subject_visibility
DROP POLICY IF EXISTS "Children can view their own subject visibility" ON public.child_subject_visibility;
DROP POLICY IF EXISTS "Parents can create child subject visibility" ON public.child_subject_visibility;
DROP POLICY IF EXISTS "Parents can delete child subject visibility" ON public.child_subject_visibility;
DROP POLICY IF EXISTS "Parents can update child subject visibility" ON public.child_subject_visibility;
DROP POLICY IF EXISTS "Parents can view their child subject visibility" ON public.child_subject_visibility;
CREATE POLICY "Children can view their own subject visibility" ON public.child_subject_visibility FOR SELECT TO public USING (auth.uid() = child_id);
CREATE POLICY "Parents can create child subject visibility" ON public.child_subject_visibility FOR INSERT TO public WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can delete child subject visibility" ON public.child_subject_visibility FOR DELETE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can update child subject visibility" ON public.child_subject_visibility FOR UPDATE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can view their child subject visibility" ON public.child_subject_visibility FOR SELECT TO public USING (auth.uid() = parent_id);

-- 5. daily_challenges
DROP POLICY IF EXISTS "Parents can view children challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Users can insert own challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Users can view own challenges" ON public.daily_challenges;
CREATE POLICY "Parents can view children challenges" ON public.daily_challenges FOR SELECT TO public USING (EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = daily_challenges.user_id));
CREATE POLICY "Users can insert own challenges" ON public.daily_challenges FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.daily_challenges FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view own challenges" ON public.daily_challenges FOR SELECT TO public USING (auth.uid() = user_id);

-- 6. daily_request_summary
DROP POLICY IF EXISTS "Parents can view children daily summary" ON public.daily_request_summary;
DROP POLICY IF EXISTS "Users can insert own daily summary" ON public.daily_request_summary;
DROP POLICY IF EXISTS "Users can update own daily summary" ON public.daily_request_summary;
DROP POLICY IF EXISTS "Users can view own daily summary" ON public.daily_request_summary;
CREATE POLICY "Parents can view children daily summary" ON public.daily_request_summary FOR SELECT TO public USING (EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = daily_request_summary.user_id));
CREATE POLICY "Users can insert own daily summary" ON public.daily_request_summary FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily summary" ON public.daily_request_summary FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view own daily summary" ON public.daily_request_summary FOR SELECT TO public USING (auth.uid() = user_id);

-- 7. game_sessions
DROP POLICY IF EXISTS "Parents can view linked children game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert own game sessions" ON public.game_sessions;
CREATE POLICY "Parents can view linked children game sessions" ON public.game_sessions FOR SELECT TO public USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = game_sessions.user_id));
CREATE POLICY "Users can insert own game sessions" ON public.game_sessions FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

-- 8. invitation_codes
DROP POLICY IF EXISTS "Parents can delete their codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Parents can insert their codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Parents can select their codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Parents can update own codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Parents can view own invitation codes" ON public.invitation_codes;
CREATE POLICY "Parents can delete their codes" ON public.invitation_codes FOR DELETE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert their codes" ON public.invitation_codes FOR INSERT TO public WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can view own invitation codes" ON public.invitation_codes FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Parents can update own codes" ON public.invitation_codes FOR UPDATE TO authenticated USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

-- 9. learning_plans
DROP POLICY IF EXISTS "Children can view their own learning plans" ON public.learning_plans;
DROP POLICY IF EXISTS "Parents can delete own learning plans" ON public.learning_plans;
DROP POLICY IF EXISTS "Parents can insert own learning plans" ON public.learning_plans;
DROP POLICY IF EXISTS "Parents can update own learning plans" ON public.learning_plans;
DROP POLICY IF EXISTS "Parents can view own learning plans" ON public.learning_plans;
CREATE POLICY "Children can view their own learning plans" ON public.learning_plans FOR SELECT TO public USING (auth.uid() = child_id);
CREATE POLICY "Parents can delete own learning plans" ON public.learning_plans FOR DELETE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert own learning plans" ON public.learning_plans FOR INSERT TO public WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update own learning plans" ON public.learning_plans FOR UPDATE TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can view own learning plans" ON public.learning_plans FOR SELECT TO public USING (auth.uid() = parent_id);

-- 10. learning_sessions
DROP POLICY IF EXISTS "Parents can view children learning sessions" ON public.learning_sessions;
DROP POLICY IF EXISTS "Users can insert own learning sessions" ON public.learning_sessions;
DROP POLICY IF EXISTS "Users can view own learning sessions" ON public.learning_sessions;
CREATE POLICY "Parents can view children learning sessions" ON public.learning_sessions FOR SELECT TO public USING (EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = learning_sessions.user_id));
CREATE POLICY "Users can insert own learning sessions" ON public.learning_sessions FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own learning sessions" ON public.learning_sessions FOR SELECT TO public USING (auth.uid() = user_id);

-- 11. parent_child_relationships
DROP POLICY IF EXISTS "Children can create their own relationships" ON public.parent_child_relationships;
DROP POLICY IF EXISTS "Children can view their parent relationship" ON public.parent_child_relationships;
DROP POLICY IF EXISTS "Parents can manage relationships" ON public.parent_child_relationships;
DROP POLICY IF EXISTS "Parents can view their children" ON public.parent_child_relationships;
CREATE POLICY "Children can create their own relationships" ON public.parent_child_relationships FOR INSERT TO public WITH CHECK (auth.uid() = child_id);
CREATE POLICY "Children can view their parent relationship" ON public.parent_child_relationships FOR SELECT TO public USING (auth.uid() = child_id);
CREATE POLICY "Parents can manage relationships" ON public.parent_child_relationships FOR ALL TO public USING (auth.uid() = parent_id);
CREATE POLICY "Parents can view their children" ON public.parent_child_relationships FOR SELECT TO public USING (auth.uid() = parent_id);

-- 12. profiles
DROP POLICY IF EXISTS "Children can view linked parent profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can update linked children grades" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view linked children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Children can view linked parent profiles" ON public.profiles FOR SELECT TO public USING (id IN (SELECT parent_id FROM parent_child_relationships WHERE child_id = auth.uid()));
CREATE POLICY "Parents can update linked children grades" ON public.profiles FOR UPDATE TO public USING (id IN (SELECT child_id FROM parent_child_relationships WHERE parent_id = auth.uid())) WITH CHECK (id IN (SELECT child_id FROM parent_child_relationships WHERE parent_id = auth.uid()));
CREATE POLICY "Parents can view linked children profiles" ON public.profiles FOR SELECT TO public USING (id IN (SELECT child_id FROM parent_child_relationships WHERE parent_id = auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = id);

-- 13. prompt_rules
DROP POLICY IF EXISTS "Admins can manage prompt rules" ON public.prompt_rules;
DROP POLICY IF EXISTS "Authenticated users can read prompt rules" ON public.prompt_rules;
DROP POLICY IF EXISTS "Service role manages prompt rules" ON public.prompt_rules;
CREATE POLICY "Admins can manage prompt rules" ON public.prompt_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read prompt rules" ON public.prompt_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages prompt rules" ON public.prompt_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 14. question_feedback (already fixed in previous migration, but ensure permissive)
DROP POLICY IF EXISTS "Users can submit feedback" ON public.question_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.question_feedback;
CREATE POLICY "Users can submit feedback" ON public.question_feedback FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own feedback" ON public.question_feedback FOR SELECT TO public USING (auth.uid() = user_id);

-- 15. review_queue
DROP POLICY IF EXISTS "Users can delete own review items" ON public.review_queue;
DROP POLICY IF EXISTS "Users can insert own review items" ON public.review_queue;
DROP POLICY IF EXISTS "Users can update own review items" ON public.review_queue;
DROP POLICY IF EXISTS "Users can view own review queue" ON public.review_queue;
CREATE POLICY "Users can delete own review items" ON public.review_queue FOR DELETE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own review items" ON public.review_queue FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review items" ON public.review_queue FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view own review queue" ON public.review_queue FOR SELECT TO public USING (auth.uid() = user_id);

-- 16. screen_time_requests
DROP POLICY IF EXISTS "Children can create requests to their parents" ON public.screen_time_requests;
DROP POLICY IF EXISTS "Children can view their own requests" ON public.screen_time_requests;
DROP POLICY IF EXISTS "Parents can update requests from their children" ON public.screen_time_requests;
DROP POLICY IF EXISTS "Parents can view requests from their children" ON public.screen_time_requests;
CREATE POLICY "Children can create requests to their parents" ON public.screen_time_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = child_id AND parent_id IN (SELECT pcr.parent_id FROM parent_child_relationships pcr WHERE pcr.child_id = auth.uid()));
CREATE POLICY "Children can view their own requests" ON public.screen_time_requests FOR SELECT TO authenticated USING (auth.uid() = child_id);
CREATE POLICY "Parents can update requests from their children" ON public.screen_time_requests FOR UPDATE TO authenticated USING (auth.uid() = parent_id AND child_id IN (SELECT pcr.child_id FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid()));
CREATE POLICY "Parents can view requests from their children" ON public.screen_time_requests FOR SELECT TO authenticated USING (auth.uid() = parent_id AND child_id IN (SELECT pcr.child_id FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid()));

-- 17. subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL TO public USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT TO public USING (auth.uid() = user_id);

-- 18. user_achievements
DROP POLICY IF EXISTS "Parents can view children achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Parents can view children achievements" ON public.user_achievements FOR SELECT TO public USING (EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = user_achievements.user_id));
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON public.user_achievements FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT TO public USING (auth.uid() = user_id);

-- 19. user_difficulty_profiles
DROP POLICY IF EXISTS "Parents can view linked children difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can insert their own difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can update their own difficulty profiles" ON public.user_difficulty_profiles;
CREATE POLICY "Parents can view linked children difficulty profiles" ON public.user_difficulty_profiles FOR SELECT TO public USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = user_difficulty_profiles.user_id));
CREATE POLICY "Users can insert their own difficulty profiles" ON public.user_difficulty_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own difficulty profiles" ON public.user_difficulty_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 20. user_earned_minutes
DROP POLICY IF EXISTS "Parents can view children earned minutes" ON public.user_earned_minutes;
DROP POLICY IF EXISTS "Users can insert own earned minutes" ON public.user_earned_minutes;
DROP POLICY IF EXISTS "Users can update own requested minutes" ON public.user_earned_minutes;
DROP POLICY IF EXISTS "Users can view own earned minutes" ON public.user_earned_minutes;
CREATE POLICY "Parents can view children earned minutes" ON public.user_earned_minutes FOR SELECT TO public USING (EXISTS (SELECT 1 FROM parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = user_earned_minutes.user_id));
CREATE POLICY "Users can insert own earned minutes" ON public.user_earned_minutes FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own requested minutes" ON public.user_earned_minutes FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view own earned minutes" ON public.user_earned_minutes FOR SELECT TO public USING (auth.uid() = user_id);

-- 21. user_roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
