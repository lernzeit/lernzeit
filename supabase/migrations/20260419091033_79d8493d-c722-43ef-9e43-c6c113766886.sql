CREATE OR REPLACE FUNCTION public.notify_new_screen_time_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
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
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
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