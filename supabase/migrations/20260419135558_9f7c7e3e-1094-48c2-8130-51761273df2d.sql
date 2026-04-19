-- Trigger function: notify child when a new learning plan is created
CREATE OR REPLACE FUNCTION public.notify_new_learning_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := jsonb_build_object(
      'event', 'learning_plan_created',
      'plan_id', NEW.id,
      'child_id', NEW.child_id,
      'parent_id', NEW.parent_id,
      'subject', NEW.subject,
      'topic', NEW.topic
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_new_learning_plan failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_learning_plan ON public.learning_plans;
CREATE TRIGGER trg_notify_new_learning_plan
AFTER INSERT ON public.learning_plans
FOR EACH ROW EXECUTE FUNCTION public.notify_new_learning_plan();

-- Trigger function: notify child when a subject is marked as priority (focus subject)
CREATE OR REPLACE FUNCTION public.notify_subject_priority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  should_notify boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_priority = true THEN
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_priority = true AND COALESCE(OLD.is_priority, false) = false THEN
    should_notify := true;
  END IF;

  IF should_notify THEN
    PERFORM net.http_post(
      url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
      body := jsonb_build_object(
        'event', 'subject_priority_set',
        'child_id', NEW.child_id,
        'parent_id', NEW.parent_id,
        'subject', NEW.subject
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_subject_priority failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_subject_priority_ins ON public.child_subject_visibility;
CREATE TRIGGER trg_notify_subject_priority_ins
AFTER INSERT ON public.child_subject_visibility
FOR EACH ROW EXECUTE FUNCTION public.notify_subject_priority();

DROP TRIGGER IF EXISTS trg_notify_subject_priority_upd ON public.child_subject_visibility;
CREATE TRIGGER trg_notify_subject_priority_upd
AFTER UPDATE ON public.child_subject_visibility
FOR EACH ROW EXECUTE FUNCTION public.notify_subject_priority();