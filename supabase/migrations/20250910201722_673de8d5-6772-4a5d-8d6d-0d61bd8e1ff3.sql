-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron job for auto-question-generator
SELECT cron.unschedule('auto-question-generator-schedule');

-- Schedule auto-question-generator to run every 2 hours
SELECT cron.schedule(
  'auto-question-generator-schedule',
  '0 */2 * * *', -- every 2 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/auto-question-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);