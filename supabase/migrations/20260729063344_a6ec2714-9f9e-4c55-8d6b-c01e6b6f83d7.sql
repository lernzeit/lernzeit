UPDATE public.subscriptions
SET plan = 'free',
    status = 'canceled',
    trial_end = now() - interval '1 day',
    current_period_end = now() - interval '1 day',
    updated_at = now()
WHERE user_id = '0a3187ad-1287-4479-8fc1-3b52882f0831';