CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-optimize-ai-models-monthly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-optimize-ai-models-monthly',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/auto-optimize-models',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"apply": true}'::jsonb
  );
  $$
);