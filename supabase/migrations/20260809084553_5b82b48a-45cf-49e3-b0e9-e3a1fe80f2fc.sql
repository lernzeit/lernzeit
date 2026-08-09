DO $$
DECLARE k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-quality-check',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || k),
    body := '{"maxChecks": 5}'::jsonb,
    timeout_milliseconds := 150000
  );
  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-prefill',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || k),
    body := '{"maxQuestions": 3}'::jsonb,
    timeout_milliseconds := 150000
  );
END $$;