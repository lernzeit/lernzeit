
-- Phase 2: Referral program

-- 1. referral_codes
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_codes TO anon;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral code" ON public.referral_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own referral code" ON public.referral_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can validate codes" ON public.referral_codes
  FOR SELECT TO anon USING (true);
CREATE POLICY "Service role manages referral codes" ON public.referral_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  paid_at timestamptz,
  blocked_reason text,
  CONSTRAINT referrals_status_check CHECK (status IN ('invited','active','paying','blocked'))
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view referrals as referrer or referee" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "Service role manages referrals" ON public.referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON public.referrals(referee_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- 3. referral_milestones
CREATE TABLE public.referral_milestones (
  user_id uuid NOT NULL,
  milestone integer NOT NULL,
  reached_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, milestone),
  CONSTRAINT referral_milestones_milestone_check CHECK (milestone IN (3,5))
);
GRANT SELECT ON public.referral_milestones TO authenticated;
GRANT ALL ON public.referral_milestones TO service_role;
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own milestones" ON public.referral_milestones
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages milestones" ON public.referral_milestones
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Cap helper: returns months allowed up to remaining cap (default cap 6)
CREATE OR REPLACE FUNCTION public.cap_referral_grant(p_user_id uuid, p_requested integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
  v_cap integer := 6;
  v_remaining integer;
BEGIN
  SELECT COALESCE(SUM(months),0) INTO v_used
    FROM public.premium_grants
    WHERE user_id = p_user_id
      AND (reason LIKE 'referral_%' OR reason LIKE 'milestone_%');
  v_remaining := GREATEST(v_cap - v_used, 0);
  RETURN LEAST(p_requested, v_remaining);
END;
$$;

-- 5. Generate unique 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing text;
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempts integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random()*length(v_chars))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.referral_codes(user_id, code) VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique code';
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;

-- 6. Extend handle_new_user to apply referral attribution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tester_code text;
  v_is_founding boolean := false;
  v_referral_code text;
  v_referrer_id uuid;
BEGIN
  v_tester_code := upper(coalesce(NEW.raw_user_meta_data->>'tester_code', ''));

  IF v_tester_code <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.tester_codes
      WHERE code = v_tester_code AND is_active = true AND uses < max_uses
    ) THEN
      v_is_founding := true;
      UPDATE public.tester_codes SET uses = uses + 1 WHERE code = v_tester_code;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, name, role, grade, username, is_founding_family, founding_family_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'child'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'child') = 'child'
      THEN COALESCE((NEW.raw_user_meta_data->>'grade')::integer, 1)
      ELSE NULL END,
    NEW.raw_user_meta_data->>'username',
    v_is_founding,
    CASE WHEN v_is_founding THEN now() ELSE NULL END
  );

  -- Referral attribution (parents only)
  v_referral_code := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  IF v_referral_code <> '' AND COALESCE(NEW.raw_user_meta_data->>'role','child') = 'parent' THEN
    SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = v_referral_code;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      BEGIN
        INSERT INTO public.referrals(referrer_id, referee_id, status)
          VALUES (v_referrer_id, NEW.id, 'invited');
        -- Extend trial by 30 days (additive)
        UPDATE public.subscriptions
          SET trial_end = COALESCE(trial_end, now()) + interval '30 days',
              current_period_end = COALESCE(current_period_end, now()) + interval '30 days'
          WHERE user_id = NEW.id;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
