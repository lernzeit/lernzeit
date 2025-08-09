-- Phase 3 (security hardening): scope policies to authenticated role and set function search_path

-- Recreate policies with explicit role scoping
DROP POLICY IF EXISTS "Users can view their own difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can insert their own difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can update their own difficulty profiles" ON public.user_difficulty_profiles;

CREATE POLICY "Users can view their own difficulty profiles"
ON public.user_difficulty_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own difficulty profiles"
ON public.user_difficulty_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own difficulty profiles"
ON public.user_difficulty_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Question quality metrics
DROP POLICY IF EXISTS "Users can view their own quality metrics" ON public.question_quality_metrics;
DROP POLICY IF EXISTS "Users can insert their own quality metrics" ON public.question_quality_metrics;

CREATE POLICY "Users can view their own quality metrics"
ON public.question_quality_metrics
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quality metrics"
ON public.question_quality_metrics
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Replace function with secure search_path
CREATE OR REPLACE FUNCTION public.update_difficulty_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;