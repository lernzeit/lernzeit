-- push-hourly-dispatch hat den anon-Schluessel als Bearer-Token geschickt.
-- send-push verlangt seit Einfuehrung der Pruefung exakt den Service-Role-Key
-- und hat deshalb stuendlich mit 401 geantwortet. Nachweisbar in
-- net._http_response: jeder Lauf zur vollen Stunde {"error":"Unauthorized"}.
-- cron.job_run_details meldete trotzdem "succeeded", weil net.http_post nur
-- einreiht und die HTTP-Antwort dort nicht auftaucht.
--
-- Folge: Seit der Umstellung ist KEIN geplanter Push rausgegangen — weder der
-- Eltern-Tagesbericht noch die Lern-Erinnerung noch die Verknuepfungs-
-- Erinnerung nach 24/72 Stunden.
--
-- Der Schluessel kommt jetzt wie bei den Cache-Jobs aus dem Vault, steht also
-- nicht mehr im Klartext in der Job-Definition.
SELECT cron.schedule(
  'push-hourly-dispatch',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"event":"hourly_dispatch"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

-- Hinweis zum Aufraeumen: cron.schedule hat den bestehenden Auftrag nicht
-- ersetzt, sondern einen zweiten gleichen Namens angelegt — der alte gehoert
-- dem Rollennamen supabase_read_only_user, der neue postgres. Der alte
-- (jobid 13) laeuft weiter in seinen 401 und verschickt dadurch nichts;
-- doppelte Benachrichtigungen entstehen also nicht. Entfernen laesst er sich
-- nur als Eigentuemer bzw. als Superuser im SQL-Editor:
--
--   SELECT cron.unschedule(13);
