-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Check existing cron jobs
SELECT * FROM cron.job;