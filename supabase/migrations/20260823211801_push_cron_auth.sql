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
-- doppelte Benachrichtigungen entstehen also nicht.
--
-- Nachtrag 14.09.2026: Er laesst sich von hier aus NICHT entfernen, auch
-- nicht ueber den SQL-Editor des Dashboards. Beide laufen als `postgres`,
-- und pg_cron verlangt den Eigentuemer:
--
--   SELECT cron.unschedule(13);
--     -> ERROR 42501: permission denied for table job
--   SET ROLE supabase_read_only_user;
--     -> ERROR 42501: permission denied to set role
--   GRANT supabase_read_only_user TO postgres;
--     -> ERROR 42501: role memberships are reserved, only superusers may grant
--
-- Damit bleibt nur der Supabase-Support. Solange der Auftrag steht, kostet er
-- nichts ausser einer 401-Zeile je Stunde in net._http_response (am
-- 14.09.2026 nachgesehen: 6 Fehlschlaege neben 9 erfolgreichen Antworten in
-- 24 Stunden). Kein Push geht doppelt raus, keiner geht verloren.
