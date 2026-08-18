CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  referrer text,
  page_path text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_analytics_events_event_name ON public.analytics_events (event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events (user_id);

CREATE OR REPLACE FUNCTION public.track_screen_time_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_first boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.analytics_events
    WHERE event_name = 'screen_time_requested' AND user_id = NEW.child_id
  ) INTO v_is_first;

  INSERT INTO public.analytics_events (event_name, user_id, properties, platform)
  VALUES (
    'screen_time_requested',
    NEW.child_id,
    jsonb_build_object(
      'is_first', v_is_first,
      'requested_minutes', NEW.requested_minutes,
      'source', 'db_trigger'
    ),
    'server'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'track_screen_time_requested failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_screen_time_requested
AFTER INSERT ON public.screen_time_requests
FOR EACH ROW EXECUTE FUNCTION public.track_screen_time_requested();

CREATE OR REPLACE FUNCTION public.track_screen_time_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.analytics_events (event_name, user_id, properties, platform)
    VALUES (
      'screen_time_approved',
      NEW.parent_id,
      jsonb_build_object(
        'requested_minutes', NEW.requested_minutes,
        'source', 'db_trigger'
      ),
      'server'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'track_screen_time_approved failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_screen_time_approved
AFTER UPDATE ON public.screen_time_requests
FOR EACH ROW EXECUTE FUNCTION public.track_screen_time_approved();

CREATE OR REPLACE FUNCTION public.track_child_linked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.analytics_events (event_name, user_id, properties, platform)
  VALUES (
    'child_linked',
    NEW.parent_id,
    jsonb_build_object('source', 'db_trigger'),
    'server'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'track_child_linked failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_child_linked
AFTER INSERT ON public.parent_child_relationships
FOR EACH ROW EXECUTE FUNCTION public.track_child_linked();