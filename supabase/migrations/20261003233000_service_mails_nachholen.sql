-- Hilfe-Mail einmalig nachholen (Entscheidung des Betreibers, 03.10.2026):
-- Eltern, die sich vor dem Start der Service-Mails angemeldet und noch kein Kind
-- verbunden haben, fallen aus dem 72-Stunden-Fenster. Mit p_einrichtung_ab
-- zaehlen alle Konten ab diesem Zeitpunkt (mindestens 24 Stunden alt).
-- Ohne Parameter unveraendert: die bisherige Fassung reicht nur noch durch.

CREATE OR REPLACE FUNCTION public.service_mail_kandidaten(p_einrichtung_ab timestamptz)
RETURNS TABLE (user_id uuid, email text, name text, art text, bezug text, testphase_ende timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH test AS (SELECT t.user_id FROM public.lz_testkonten() t),
  eltern AS (
    SELECT p.id, p.name, p.created_at, u.email::text AS email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'parent'
      AND u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
      AND p.id NOT IN (SELECT test.user_id FROM test)
  ),
  abo AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.status, s.trial_end,
      (s.stripe_subscription_id IS NULL AND s.quelle IS NULL AND s.store IS NULL) AS eigene_testphase
    FROM subscriptions s ORDER BY s.user_id, s.updated_at DESC NULLS LAST
  )
  SELECT e.id, e.email, e.name, 'einrichtung'::text, ''::text, NULL::timestamptz
  FROM eltern e
  WHERE e.created_at <= now() - interval '24 hours'
    AND e.created_at > COALESCE(p_einrichtung_ab, now() - interval '72 hours')
    AND NOT EXISTS (SELECT 1 FROM parent_child_relationships r WHERE r.parent_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM service_mail_versand v WHERE v.user_id = e.id AND v.art = 'einrichtung')
  UNION ALL
  SELECT e.id, e.email, e.name, 'testphase_endet', (a.trial_end AT TIME ZONE 'Europe/Berlin')::date::text, a.trial_end
  FROM eltern e
  JOIN abo a ON a.user_id = e.id
  WHERE a.status = 'trialing'
    -- Nur die kostenlose Testphase ohne Zahlungsdaten (handle_new_user). Ein
    -- Probeabo bei Stripe oder im Store verlaengert sich kostenpflichtig;
    -- dafuer passt der Text der Mail nicht.
    AND a.eigene_testphase
    AND a.trial_end > now() + interval '48 hours'
    AND a.trial_end <= now() + interval '72 hours'
    AND NOT EXISTS (
      SELECT 1 FROM service_mail_versand v
      WHERE v.user_id = e.id AND v.art = 'testphase_endet'
        AND v.bezug = (a.trial_end AT TIME ZONE 'Europe/Berlin')::date::text
    );
$fn$;

REVOKE ALL ON FUNCTION public.service_mail_kandidaten(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_mail_kandidaten(timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.service_mail_kandidaten()
RETURNS TABLE (user_id uuid, email text, name text, art text, bezug text, testphase_ende timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT * FROM public.service_mail_kandidaten(NULL::timestamptz);
$fn$;
