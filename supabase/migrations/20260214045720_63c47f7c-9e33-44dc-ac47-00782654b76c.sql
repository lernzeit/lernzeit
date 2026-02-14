-- Fix Max's test subscription to have a proper expired trial
UPDATE public.subscriptions 
SET 
  status = 'trialing',
  plan = 'premium',
  trial_end = '2025-07-31T23:59:59Z',
  current_period_start = '2025-07-17T07:53:21Z',
  current_period_end = '2025-07-31T23:59:59Z',
  updated_at = NOW()
WHERE user_id = 'a0423962-798f-418c-a320-5d266cd27908';