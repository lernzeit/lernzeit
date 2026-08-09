-- Qualitaetspruefung beschleunigen, um den Rueckstand abzubauen.
--
-- Ausgangslage: 2531 Fragen im Cache, davon 2526 ungeprueft. Beim bisherigen
-- Takt (3 Laeufe/Tag zu je 20 Pruefungen = 60/Tag) haette ein erster Durchlauf
-- ueber 40 Tage gedauert. Solange blieben die mehrschrittigen Altlasten in der
-- Auslieferung - genau die Aufgaben, die den Spielfluss zerstoeren.
--
-- Der bisherige Takt war auf das Gratis-Kontingent von OpenRouter zugeschnitten
-- (1000 Anfragen/Tag, 20/Minute). Seit beide Jobs auf Gemini laufen, gelten
-- diese Grenzen nicht mehr.
--
-- Neu: alle 2 Stunden ein Lauf zu je 50 Pruefungen -> 600/Tag. Der Rueckstand
-- ist damit in etwa vier Tagen abgearbeitet. Kosten waehrend des Aufholens rund
-- 1 USD pro Monat; danach faellt der Verbrauch von selbst, weil nur noch neue
-- Fragen und turnusmaessige Nachpruefungen anfallen.
--
-- Die Vorproduktion bleibt bei 3 Laeufen/Tag: Mit 2531 Fragen im Bestand ist
-- der Pool ausreichend gefuellt, Prioritaet hat das Aufraeumen.

DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN
    SELECT jobid FROM cron.job WHERE jobname = 'cache-quality-check-regular'
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'cache-quality-check-regular',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-quality-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron","maxChecks":50}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
