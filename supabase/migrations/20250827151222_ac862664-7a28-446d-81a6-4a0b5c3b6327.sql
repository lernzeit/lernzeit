-- Add cron job for math curriculum seeder (runs every 6 hours)
SELECT cron.schedule(
  'math-curriculum-seeder',
  '0 0,6,12,18 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/math-curriculum-seeder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
        body:=concat('{"time": "', now(), '", "trigger": "scheduled_curriculum"}')::jsonb
    ) as request_id;
  $$
);

-- Manual trigger function for math curriculum seeder
CREATE OR REPLACE FUNCTION public.trigger_math_curriculum_seeder()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result json;
BEGIN
  -- Manual trigger of the math curriculum seeder
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/math-curriculum-seeder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"time": "Manual curriculum generation trigger", "trigger": "manual"}'::jsonb
  ) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Math curriculum seeder triggered manually',
    'request_id', result
  );
END;
$function$;