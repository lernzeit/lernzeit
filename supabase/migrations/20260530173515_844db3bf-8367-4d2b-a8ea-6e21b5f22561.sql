
-- Phase 1: Tester-Belohnung & Gründungsfamilie

-- 1. premium_grants table
CREATE TABLE public.premium_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  months integer NOT NULL,
  reason text NOT NULL,
  source_ref uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.premium_grants TO authenticated;
GRANT ALL ON public.premium_grants TO service_role;

ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grants" ON public.premium_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages grants" ON public.premium_grants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_premium_grants_user_reason ON public.premium_grants(user_id, reason);

-- 2. tester_codes table
CREATE TABLE public.tester_codes (
  code text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer NOT NULL DEFAULT 500,
  uses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tester_codes TO anon, authenticated;
GRANT ALL ON public.tester_codes TO service_role;

ALTER TABLE public.tester_codes ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to read active codes for client-side validation
CREATE POLICY "Anyone can read active tester codes" ON public.tester_codes
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Service role manages tester codes" ON public.tester_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed
INSERT INTO public.tester_codes (code, max_uses) VALUES ('LERNZEIT2026', 500);

-- 3. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN is_founding_family boolean NOT NULL DEFAULT false,
  ADD COLUMN founding_family_at timestamptz;

-- 4. parent_feedback flag
ALTER TABLE public.parent_feedback
  ADD COLUMN is_tester_feedback boolean NOT NULL DEFAULT false;

-- 5. Update handle_new_user trigger to handle tester_code metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tester_code text;
  v_is_founding boolean := false;
BEGIN
  v_tester_code := upper(coalesce(NEW.raw_user_meta_data->>'tester_code', ''));

  IF v_tester_code <> '' THEN
    -- Validate against tester_codes table
    IF EXISTS (
      SELECT 1 FROM public.tester_codes
      WHERE code = v_tester_code
        AND is_active = true
        AND uses < max_uses
    ) THEN
      v_is_founding := true;
      UPDATE public.tester_codes
        SET uses = uses + 1
        WHERE code = v_tester_code;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, name, role, grade, username, is_founding_family, founding_family_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'child'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'child') = 'child' 
      THEN COALESCE((NEW.raw_user_meta_data->>'grade')::integer, 1)
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'username',
    v_is_founding,
    CASE WHEN v_is_founding THEN now() ELSE NULL END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 6. Helper function to apply premium grants (additive, never replace)
CREATE OR REPLACE FUNCTION public.apply_premium_grant(
  p_user_id uuid,
  p_months integer,
  p_reason text,
  p_source_ref uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_end timestamptz;
  v_new_end timestamptz;
BEGIN
  IF p_months <= 0 THEN
    RAISE EXCEPTION 'months must be > 0';
  END IF;

  INSERT INTO public.premium_grants (user_id, months, reason, source_ref)
  VALUES (p_user_id, p_months, p_reason, p_source_ref);

  SELECT current_period_end INTO v_current_end
    FROM public.subscriptions WHERE user_id = p_user_id;

  v_new_end := GREATEST(COALESCE(v_current_end, now()), now()) + (p_months || ' months')::interval;

  IF v_current_end IS NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, trial_end)
    VALUES (p_user_id, 'premium', 'trialing', now(), v_new_end, v_new_end)
    ON CONFLICT (user_id) DO UPDATE
      SET plan = 'premium',
          status = CASE WHEN public.subscriptions.status = 'active' THEN 'active' ELSE 'trialing' END,
          current_period_end = v_new_end;
  ELSE
    UPDATE public.subscriptions
      SET plan = CASE WHEN plan = 'free' THEN 'premium' ELSE plan END,
          status = CASE WHEN status = 'free' OR status IS NULL THEN 'trialing' ELSE status END,
          current_period_end = v_new_end,
          trial_end = CASE WHEN status = 'trialing' THEN v_new_end ELSE trial_end END
      WHERE user_id = p_user_id;
  END IF;
END;
$$;
