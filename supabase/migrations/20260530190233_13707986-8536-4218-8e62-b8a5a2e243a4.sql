
-- 1. Remove anon SELECT on referral_codes (expose entire table to anonymous users)
DROP POLICY IF EXISTS "Anon can validate codes" ON public.referral_codes;

-- 2. Lock down ai_model_config so only admins can read (currently all authenticated users)
DROP POLICY IF EXISTS "Authenticated can read active model config" ON public.ai_model_config;

-- 3. Prevent users from elevating their role via profiles INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  -- Admins can do anything
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  END IF;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Block role = 'admin' from anyone but admins
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  -- On UPDATE, prevent changing role at all (only admins can change role)
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  -- On INSERT, restrict role to 'parent' or 'child' (already handled above for admin)
  IF TG_OP = 'INSERT' AND NEW.role NOT IN ('parent', 'child') THEN
    RAISE EXCEPTION 'Invalid role on profile insert';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_role_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_role_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role();

-- 4. Limit game_sessions.time_earned to prevent earned-minutes inflation
-- Add a trigger (CHECK constraints can't be modified later easily, and triggers can be added even with existing data).
CREATE OR REPLACE FUNCTION public.validate_game_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.time_earned IS NULL OR NEW.time_earned < 0 THEN
    NEW.time_earned := 0;
  END IF;
  -- Cap any single session at 1800 seconds (30 minutes) — generous upper bound
  IF NEW.time_earned > 1800 THEN
    NEW.time_earned := 1800;
  END IF;
  -- Also clamp time_spent and correct_answers / total_questions to sane values
  IF NEW.total_questions IS NULL OR NEW.total_questions <= 0 THEN
    NEW.total_questions := 5;
  END IF;
  IF NEW.correct_answers IS NULL OR NEW.correct_answers < 0 THEN
    NEW.correct_answers := 0;
  END IF;
  IF NEW.correct_answers > NEW.total_questions THEN
    NEW.correct_answers := NEW.total_questions;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_game_session_trigger ON public.game_sessions;
CREATE TRIGGER validate_game_session_trigger
BEFORE INSERT OR UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_game_session();

-- Same for learning_sessions
CREATE OR REPLACE FUNCTION public.validate_learning_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.time_earned IS NULL OR NEW.time_earned < 0 THEN
    NEW.time_earned := 0;
  END IF;
  IF NEW.time_earned > 1800 THEN
    NEW.time_earned := 1800;
  END IF;
  IF NEW.total_questions IS NULL OR NEW.total_questions <= 0 THEN
    NEW.total_questions := 5;
  END IF;
  IF NEW.correct_answers IS NULL OR NEW.correct_answers < 0 THEN
    NEW.correct_answers := 0;
  END IF;
  IF NEW.correct_answers > NEW.total_questions THEN
    NEW.correct_answers := NEW.total_questions;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_learning_session_trigger ON public.learning_sessions;
CREATE TRIGGER validate_learning_session_trigger
BEFORE INSERT OR UPDATE ON public.learning_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_learning_session();
