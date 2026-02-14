-- Insert test premium subscription for parent Max
INSERT INTO public.subscriptions (user_id, plan, status) 
VALUES ('a0423962-798f-418c-a320-5d266cd27908', 'premium', 'active')
ON CONFLICT (user_id) DO UPDATE SET plan = 'premium', status = 'active';