-- Create a function to trigger curriculum-compliant template generation
CREATE OR REPLACE FUNCTION public.trigger_curriculum_template_generation()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result json;
BEGIN
  -- Manual trigger of the curriculum template generation
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/generate-curriculum-templates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"trigger": "manual_curriculum_generation"}'::jsonb
  ) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Curriculum-compliant template generation triggered',
    'request_id', result
  );
END;
$function$;