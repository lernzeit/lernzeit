-- 1. Remove permissive direct INSERT on user_achievements.
-- All achievement grants must go through the SECURITY DEFINER function
-- public.update_achievement_progress, which validates auth.uid().
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

-- Keep UPDATE blocked from clients too (progress is set by the RPC).
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;

-- 2. Validate user_earned_minutes inserts via trigger:
--    - minutes_earned must be between 0 and 120 per entry (sane upper bound)
--    - session_id must reference a real session belonging to the same user
CREATE OR REPLACE FUNCTION public.validate_user_earned_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_user uuid;
BEGIN
  IF NEW.minutes_earned IS NULL OR NEW.minutes_earned < 0 THEN
    RAISE EXCEPTION 'minutes_earned must be >= 0';
  END IF;

  IF NEW.minutes_earned > 120 THEN
    RAISE EXCEPTION 'minutes_earned exceeds per-entry maximum (120)';
  END IF;

  IF NEW.session_type NOT IN ('learning', 'game') THEN
    RAISE EXCEPTION 'session_type must be learning or game';
  END IF;

  -- Verify the referenced session exists AND belongs to the same user.
  IF NEW.session_type = 'game' THEN
    SELECT user_id INTO v_session_user
    FROM public.game_sessions
    WHERE id = NEW.session_id;
  ELSE
    SELECT user_id INTO v_session_user
    FROM public.learning_sessions
    WHERE id = NEW.session_id;
  END IF;

  IF v_session_user IS NULL THEN
    RAISE EXCEPTION 'Referenced session does not exist';
  END IF;

  IF v_session_user <> NEW.user_id THEN
    RAISE EXCEPTION 'Session does not belong to user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_earned_minutes_trg ON public.user_earned_minutes;
CREATE TRIGGER validate_user_earned_minutes_trg
BEFORE INSERT ON public.user_earned_minutes
FOR EACH ROW EXECUTE FUNCTION public.validate_user_earned_minutes();