-- Regelmaessiger Betrieb der beiden Hintergrundjobs.
--
-- Vorgabe war: laeuft regelmaessig, kostet moeglichst nichts. Der Zeitpunkt ist
-- unerheblich, deshalb kleine Laeufe ueber den Tag verteilt statt eines grossen
-- Nachtlaufs. Das entzerrt nebenbei die 20-Anfragen-pro-Minute-Grenze der
-- kostenlosen Modelle von selbst.
--
-- Beide Jobs bringen ihre eigene Kostensperre mit (Tagesbudget aus
-- ai_model_metrics, siehe _shared/job-budget.ts). Der Cron darf also ruhig
-- oefter feuern als noetig - ist das Budget erreicht, beendet sich der Lauf
-- ohne einen einzigen Modellaufruf.
--
-- Zeitraster (UTC):
--   00,08,16 Uhr  Vorproduktion       -> ~36 Fragen/Tag
--   02,10,18 Uhr  Qualitaetspruefung  -> ~60 Pruefungen/Tag
--   04 Uhr        cache-cleanup       (bestehend)
--
--
-- ============================================================================
-- EINMALIGE EINRICHTUNG NOETIG
-- ============================================================================
-- Beide Funktionen verlangen den Service-Role-Key. Der darf nicht im Repository
-- stehen, deshalb wird er ueber Supabase Vault gelesen.
--
-- Einmalig im Supabase-SQL-Editor ausfuehren (Key aus
-- Project Settings -> API -> service_role):
--
--   SELECT vault.create_secret('<DEIN_SERVICE_ROLE_KEY>', 'service_role_key');
--
-- Ohne diesen Schritt laufen die Jobs in einen 401 und tun nichts - sie
-- richten aber auch keinen Schaden an.
--
--
-- NEBENBEFUND, hier gleich mitbehoben:
-- Der bestehende Job 'cache-cleanup-daily' aus 20260314223413_*.sql schickt den
-- ANON-Key, waehrend cache-cleanup/index.ts:18 den SERVICE-ROLE-Key verlangt.
-- Der Job lief seit seiner Einrichtung in einen 401, die Cache-Bereinigung hat
-- also nie stattgefunden. Wird unten mit derselben Vault-Mechanik neu gesetzt.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Bestehende Zeitplaene gleichen Namens entfernen (idempotent)
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'cache-prefill-regular',
      'cache-quality-check-regular',
      'cache-cleanup-daily'
    )
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

-- ── Vorproduktion ────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cache-prefill-regular',
  '0 0,8,16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-prefill',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron","maxQuestions":12}'::jsonb
  );
  $$
);

-- ── Qualitaetspruefung ───────────────────────────────────────────────────────
SELECT cron.schedule(
  'cache-quality-check-regular',
  '0 2,10,18 * * *',
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
    body := '{"source":"cron","maxChecks":20}'::jsonb
  );
  $$
);

-- ── Bestehende Cache-Bereinigung mit korrekter Autorisierung ─────────────────
SELECT cron.schedule(
  'cache-cleanup-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
