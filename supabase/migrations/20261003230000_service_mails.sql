-- Service-Mails an Eltern (Entscheidung des Betreibers, 03.10.2026):
--   einrichtung      24-72 Stunden nach der Registrierung, wenn noch kein Kind
--                    verknuepft ist: Anleitung, wie es weitergeht.
--   testphase_endet  2-3 Tage vor Ende der Testphase: Hinweis auf das Datum.
-- Nur Service-Mails, keine Werbung, keine Feedback-Anfragen. Nie an Kinder.
-- Versand ueber OneSignal (Absender hallo@post.lernzeit.app), Funktion
-- service-mails; diese Datei liefert Auswahl und Protokoll.

CREATE TABLE IF NOT EXISTS public.service_mail_versand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  art text NOT NULL CHECK (art IN ('einrichtung', 'testphase_endet')),
  -- Wofuer die Mail gilt: bei testphase_endet das Enddatum, sonst leer.
  -- Eine Mail je Konto, Art und Bezug.
  bezug text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'wird_gesendet' CHECK (status IN ('wird_gesendet', 'gesendet', 'fehler')),
  onesignal_id text,
  fehler text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, art, bezug)
);
ALTER TABLE public.service_mail_versand ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.service_mail_versand IS
  'Protokoll der Service-Mails an Eltern. Der eindeutige Schluessel verhindert doppelten Versand. Nur service_role.';

-- Wer heute eine Service-Mail bekaeme. Testkonten, Kinder und schon
-- Beschriebene sind ausgenommen. Nur fuer den Datenbank-Eigentuemer und
-- service_role (die Edge Function), nicht fuer App-Nutzer.
CREATE OR REPLACE FUNCTION public.service_mail_kandidaten()
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
    AND e.created_at > now() - interval '72 hours'
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

REVOKE ALL ON FUNCTION public.service_mail_kandidaten() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_mail_kandidaten() TO service_role;
