
-- Add missing triggers on screen_time_requests for push notifications
DROP TRIGGER IF EXISTS trg_notify_new_screen_time_request ON public.screen_time_requests;
CREATE TRIGGER trg_notify_new_screen_time_request
  AFTER INSERT ON public.screen_time_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_screen_time_request();

DROP TRIGGER IF EXISTS trg_notify_screen_time_response ON public.screen_time_requests;
CREATE TRIGGER trg_notify_screen_time_response
  AFTER UPDATE ON public.screen_time_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_screen_time_response();

-- Ensure REPLICA IDENTITY FULL so realtime UPDATE payloads include all columns
ALTER TABLE public.screen_time_requests REPLICA IDENTITY FULL;
