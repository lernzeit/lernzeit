UPDATE subscriptions 
SET plan = 'premium', 
    status = 'trialing', 
    trial_end = (now() + interval '28 days')::timestamptz, 
    current_period_end = (now() + interval '28 days')::timestamptz, 
    updated_at = now() 
WHERE user_id = 'a0423962-798f-418c-a320-5d266cd27908';