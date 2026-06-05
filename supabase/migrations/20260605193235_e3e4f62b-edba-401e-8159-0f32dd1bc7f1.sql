
CREATE OR REPLACE FUNCTION public.link_referral(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(coalesce(p_code, ''));
  v_referrer_id uuid;
  v_role text;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF v_code = '' THEN
    RETURN json_build_object('success', false, 'error', 'no_code');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RETURN json_build_object('success', false, 'error', 'not_parent');
  END IF;

  -- Already linked?
  SELECT id INTO v_existing FROM public.referrals WHERE referee_id = v_uid LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', true, 'already_linked', true);
  END IF;

  SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = v_code;
  IF v_referrer_id IS NULL OR v_referrer_id = v_uid THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  BEGIN
    INSERT INTO public.referrals(referrer_id, referee_id, status)
      VALUES (v_referrer_id, v_uid, 'invited');
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', true, 'already_linked', true);
  END;

  UPDATE public.subscriptions
     SET trial_end = COALESCE(trial_end, now()) + interval '30 days',
         current_period_end = COALESCE(current_period_end, now()) + interval '30 days'
   WHERE user_id = v_uid;

  RETURN json_build_object('success', true, 'linked', true);
END;
$$;

REVOKE ALL ON FUNCTION public.link_referral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_referral(text) TO authenticated;
