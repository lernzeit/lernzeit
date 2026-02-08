-- ============================================
-- SECURITY FIX: daily_request_summary - Remove overly permissive policy
-- ============================================

-- Remove the overly permissive "System can manage daily summary" policy
DROP POLICY IF EXISTS "System can manage daily summary" ON public.daily_request_summary;

-- Add missing INSERT policy for users (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_request_summary' 
    AND policyname = 'Users can insert own daily summary'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own daily summary" ON public.daily_request_summary FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Add missing UPDATE policy for users (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_request_summary' 
    AND policyname = 'Users can update own daily summary'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own daily summary" ON public.daily_request_summary FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Add policy for parents to view children's summary (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_request_summary' 
    AND policyname = 'Parents can view children daily summary'
  ) THEN
    EXECUTE 'CREATE POLICY "Parents can view children daily summary" ON public.daily_request_summary FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_child_relationships pcr WHERE pcr.parent_id = auth.uid() AND pcr.child_id = daily_request_summary.user_id))';
  END IF;
END $$;

-- ============================================
-- SECURITY FIX: Templates table - remove overly permissive policy
-- ============================================

-- Remove the overly permissive policy that uses USING (true)
DROP POLICY IF EXISTS "Service role manages templates" ON public.templates;

-- ============================================
-- SECURITY FIX: template_scores view access
-- Recreate with security_invoker to respect RLS
-- ============================================

DROP VIEW IF EXISTS public.template_scores;

CREATE VIEW public.template_scores
WITH (security_invoker = on)
AS
SELECT 
  t.id,
  t.student_prompt,
  t.grade,
  t.quarter_app,
  t.domain,
  t.subcategory,
  t.difficulty,
  t.plays,
  t.correct,
  t.rating_sum,
  t.rating_count,
  t.created_at,
  CASE WHEN t.rating_count > 0 THEN t.rating_sum::numeric / t.rating_count ELSE NULL END as average_rating,
  CASE WHEN t.plays > 0 THEN t.correct::numeric / t.plays ELSE NULL END as success_rate
FROM public.templates t
WHERE t.status = 'ACTIVE';