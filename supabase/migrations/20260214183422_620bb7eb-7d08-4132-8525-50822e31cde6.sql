
-- Reset Max's trial period to 28 days from now
UPDATE public.subscriptions 
SET trial_end = NOW() + INTERVAL '28 days', 
    current_period_end = NOW() + INTERVAL '28 days',
    current_period_start = NOW()
WHERE user_id = 'a0423962-798f-418c-a320-5d266cd27908';
