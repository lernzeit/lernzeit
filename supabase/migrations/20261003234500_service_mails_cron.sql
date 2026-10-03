-- Taeglicher Lauf der Service-Mails (Freigabe des Betreibers, 03.10.2026).
-- 07:13 UTC = 9:13 Uhr Sommerzeit, 8:13 Uhr Winterzeit. Ein Lauf am Tag passt
-- zu den Fenstern in service_mail_kandidaten(); doppelt verschickt wird
-- wegen des eindeutigen Schluessels in service_mail_versand ohnehin nicht.
-- Schluessel aus dem Vault wie bei push-hourly-dispatch (Job 20).
SELECT cron.schedule(
  'service-mails-taeglich',
  '13 7 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/service-mails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"senden":true}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
