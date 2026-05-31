-- Add role_locked column, defaulting existing rows to true (already chose their role)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_locked boolean NOT NULL DEFAULT true;

-- New rows from now on default to false; handle_new_user sets explicitly
ALTER TABLE public.profiles ALTER COLUMN role_locked SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_tester_code text;
  v_is_founding boolean := false;
  v_referral_code text;
  v_referrer_id uuid;
  v_meta_role text;
  v_role_locked boolean;
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

  v_meta_role := NEW.raw_user_meta_data->>'role';
  v_role_locked := v_meta_role IS NOT NULL AND v_meta_role IN ('parent','child');

  INSERT INTO public.profiles (id, name, role, grade, username, is_founding_family, founding_family_at, role_locked)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(v_meta_role, 'child'),
    CASE WHEN COALESCE(v_meta_role, 'child') = 'child'
      THEN COALESCE((NEW.raw_user_meta_data->>'grade')::integer, 1)
      ELSE NULL END,
    NEW.raw_user_meta_data->>'username',
    v_is_founding,
    CASE WHEN v_is_founding THEN now() ELSE NULL END,
    v_role_locked
  );

  v_referral_code := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  IF v_referral_code <> '' AND COALESCE(v_meta_role,'child') = 'parent' THEN
    SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = v_referral_code;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      BEGIN
        INSERT INTO public.referrals(referrer_id, referee_id, status)
          VALUES (v_referrer_id, NEW.id, 'invited');
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean := false;
  v_is_service boolean := false;
BEGIN
  v_is_service := (auth.role() = 'service_role');

  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  END IF;

  IF v_is_service OR v_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF COALESCE(OLD.role_locked, true) = false AND NEW.role IN ('parent','child') THEN
        NEW.role_locked := true;
      ELSE
        NEW.role := OLD.role;
      END IF;
    END IF;
    IF COALESCE(OLD.role_locked, false) = true AND NEW.role_locked = false THEN
      NEW.role_locked := true;
    END IF;
    IF NEW.is_founding_family IS DISTINCT FROM OLD.is_founding_family THEN
      NEW.is_founding_family := OLD.is_founding_family;
    END IF;
    IF NEW.founding_family_at IS DISTINCT FROM OLD.founding_family_at THEN
      NEW.founding_family_at := OLD.founding_family_at;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role NOT IN ('parent', 'child') THEN
      RAISE EXCEPTION 'Invalid role on profile insert';
    END IF;
    IF NEW.is_founding_family = true THEN
      NEW.is_founding_family := false;
      NEW.founding_family_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Unlock the affected test account (direct UPDATE bypasses enforce_profile_role role check
-- because role isn't changing). role_locked update needs to bypass the trigger guard.
-- We temporarily disable the trigger for this targeted fix.
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles p
SET role_locked = false
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = 'brösicke.immobilien@gmail.com';
ALTER TABLE public.profiles ENABLE TRIGGER USER;