
-- 1. Extend enforce_profile_role to lock founding_family columns from self-update
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

  -- Block role = 'admin' from anyone but admins
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Prevent role changes
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.role := OLD.role;
    END IF;
    -- Prevent self-awarding founding family status
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
    -- Prevent self-claiming founding family on insert (only handle_new_user trigger / service role may set this)
    IF NEW.is_founding_family = true THEN
      NEW.is_founding_family := false;
      NEW.founding_family_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS enforce_profile_role_trg ON public.profiles;
CREATE TRIGGER enforce_profile_role_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role();

-- 2. Restrict prompt_rules SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can read prompt rules" ON public.prompt_rules;
CREATE POLICY "Admins can read prompt rules"
  ON public.prompt_rules
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
