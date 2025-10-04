-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the direct-template-generator to run hourly
-- This will generate 5 templates every hour for different grades and domains
SELECT cron.schedule(
  'hourly-template-generation',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/direct-template-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
        body:=jsonb_build_object(
          'grade', (EXTRACT(HOUR FROM NOW())::integer % 10) + 1,
          'domain', CASE (EXTRACT(HOUR FROM NOW())::integer % 4)
            WHEN 0 THEN 'Zahlen & Operationen'
            WHEN 1 THEN 'Raum & Form'
            WHEN 2 THEN 'Größen & Messen'
            ELSE 'Daten & Zufall'
          END,
          'count', 5
        )
    ) as request_id;
  $$
);