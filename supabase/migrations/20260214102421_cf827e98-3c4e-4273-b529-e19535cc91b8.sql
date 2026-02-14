
-- Auto-create a 4-week trial subscription when a new user signs up
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, trial_end, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'premium',
    'trialing',
    NOW() + INTERVAL '28 days',
    NOW(),
    NOW() + INTERVAL '28 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on profiles table (fires after profile is created for new users)
DROP TRIGGER IF EXISTS on_profile_created_trial ON public.profiles;
CREATE TRIGGER on_profile_created_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Edge function to reset premium settings when trial expires
-- We'll handle this in the app layer via the useSubscription hook
