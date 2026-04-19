-- Push tokens table for OneSignal Player IDs
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id)
);

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages push tokens"
ON public.push_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER touch_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger function: notify on INSERT (new screen-time request → parent)
CREATE OR REPLACE FUNCTION public.notify_new_screen_time_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'event', 'screen_time_request_new',
      'request_id', NEW.id,
      'parent_id', NEW.parent_id,
      'child_id', NEW.child_id,
      'requested_minutes', NEW.requested_minutes
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_new_screen_time_request failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_screen_time_request
AFTER INSERT ON public.screen_time_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_screen_time_request();

-- Trigger function: notify on UPDATE (status pending→approved/denied → child)
CREATE OR REPLACE FUNCTION public.notify_screen_time_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'denied') THEN
    PERFORM net.http_post(
      url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'event', CASE WHEN NEW.status = 'approved' THEN 'screen_time_approved' ELSE 'screen_time_denied' END,
        'request_id', NEW.id,
        'child_id', NEW.child_id,
        'parent_id', NEW.parent_id,
        'requested_minutes', NEW.requested_minutes,
        'parent_response', NEW.parent_response
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_screen_time_response failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_screen_time_response
AFTER UPDATE ON public.screen_time_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_screen_time_response();

-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;