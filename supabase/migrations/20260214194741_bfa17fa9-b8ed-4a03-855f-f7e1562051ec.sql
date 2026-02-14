UPDATE subscriptions 
SET status = 'trialing', 
    plan = 'premium', 
    trial_end = now() + interval '14 days',
    current_period_start = now(),
    current_period_end = now() + interval '14 days',
    updated_at = now()
WHERE user_id = 'a0423962-798f-418c-a320-5d266cd27908';