-- Security hardening migration: Fix template policies and function security

-- 1. Drop overly permissive policies on templates table
DROP POLICY IF EXISTS "Anyone can view templates" ON public.templates;
DROP POLICY IF EXISTS "Service role can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Service role can update templates" ON public.templates;

-- 2. Ensure secure policies exist for templates
-- Authenticated users can only view ACTIVE templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Authenticated users view active templates'
  ) THEN
    CREATE POLICY "Authenticated users view active templates"
    ON public.templates
    FOR SELECT
    TO authenticated
    USING (status = 'ACTIVE');
  END IF;
END $$;

-- Service role has full access for template management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Service role manages templates'
  ) THEN
    CREATE POLICY "Service role manages templates"
    ON public.templates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Restore SECURITY DEFINER and search_path protection to template functions
CREATE OR REPLACE FUNCTION public.apply_template_stat(tid uuid, is_correct boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.templates
  SET plays = plays + 1,
      correct = correct + CASE WHEN is_correct THEN 1 ELSE 0 END
  WHERE id = tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_template_rating(tid uuid, stars int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.templates
  SET rating_sum = rating_sum + greatest(1, least(5, stars)),
      rating_count = rating_count + 1
  WHERE id = tid;
END;
$$;