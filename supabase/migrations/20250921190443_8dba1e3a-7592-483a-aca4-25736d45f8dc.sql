-- Create function to trigger cleanup of faulty questions
CREATE OR REPLACE FUNCTION public.trigger_cleanup_faulty_questions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result json;
BEGIN
  -- Call the cleanup-faulty-questions edge function
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cleanup-faulty-questions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"trigger": "manual"}'::jsonb
  ) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Faulty questions cleanup triggered',
    'request_id', result
  );
END;
$function$;

-- Execute the cleanup
SELECT trigger_cleanup_faulty_questions();