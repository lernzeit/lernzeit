-- Service-Mails, zweite Fassung (Entscheidung des Betreibers, 03.10.2026):
--   - Eltern ohne verbundenes Kind bekommen zum Ende der Testphase keine
--     Premium-Hinweise, sondern nur die Info, dass es kostenlos weitergeht.
--   - Eine Woche nach der Hilfe-Mail, wenn noch immer kein Kind verbunden ist,
--     eine kurze Erinnerung. Nicht, wenn die Testphase-Mail schon kam oder in
--     den naechsten Tagen kommt: mehr als zwei Mails in kurzer Zeit waeren zu viel.
-- Keine Frage nach Gruenden per Mail: Feedback-Bitten gelten als Werbung
-- (BGH VI ZR 225/17). Gefragt wird in der App (AbwanderungUmfrage.tsx).
--
-- Neue Funktion statt Aenderung der alten: Die Rueckgabe hat eine Spalte mehr
-- (vorlage). Die Protokolltabelle bleibt unveraendert; die Erinnerung steht dort
-- als art 'einrichtung' mit bezug 'erinnerung'.

CREATE OR REPLACE FUNCTION public.service_mail_auswahl(p_einrichtung_ab timestamptz DEFAULT NULL)
RETURNS TABLE (user_id uuid, email text, name text, art text, bezug text, testphase_ende timestamptz, vorlage text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH test AS (SELECT t.user_id FROM public.lz_testkonten() t),
  eltern AS (
    SELECT p.id, p.name, p.created_at, u.email::text AS email,
      EXISTS (SELECT 1 FROM parent_child_relationships r WHERE r.parent_id = p.id) AS hat_kind
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
  -- Hilfe beim Einrichten: 24-72 Stunden nach der Anmeldung
  SELECT e.id, e.email, e.name, 'einrichtung'::text, ''::text, NULL::timestamptz, 'einrichtung'::text
  FROM eltern e
  WHERE NOT e.hat_kind
    AND e.created_at <= now() - interval '24 hours'
    AND e.created_at > COALESCE(p_einrichtung_ab, now() - interval '72 hours')
    AND NOT EXISTS (SELECT 1 FROM service_mail_versand v WHERE v.user_id = e.id AND v.art = 'einrichtung')
  UNION ALL
  -- Erinnerung: 7-14 Tage nach der Hilfe-Mail
  SELECT e.id, e.email, e.name, 'einrichtung', 'erinnerung', NULL, 'einrichtung_erinnerung'
  FROM eltern e
  LEFT JOIN abo a ON a.user_id = e.id
  WHERE NOT e.hat_kind
    AND EXISTS (
      SELECT 1 FROM service_mail_versand v
      WHERE v.user_id = e.id AND v.art = 'einrichtung' AND v.bezug = '' AND v.status = 'gesendet'
        AND v.created_at <= now() - interval '7 days'
        AND v.created_at > now() - interval '14 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM service_mail_versand v
      WHERE v.user_id = e.id AND ((v.art = 'einrichtung' AND v.bezug = 'erinnerung') OR v.art = 'testphase_endet')
    )
    AND NOT COALESCE(a.status = 'trialing' AND a.trial_end > now() AND a.trial_end <= now() + interval '4 days', false)
  UNION ALL
  -- Testphase endet: 48-72 Stunden vorher, je nach Stand mit oder ohne Kind
  SELECT e.id, e.email, e.name, 'testphase_endet', (a.trial_end AT TIME ZONE 'Europe/Berlin')::date::text, a.trial_end,
    CASE WHEN e.hat_kind THEN 'testphase_endet' ELSE 'testphase_endet_ohne_kind' END
  FROM eltern e
  JOIN abo a ON a.user_id = e.id
  WHERE a.status = 'trialing'
    -- Nur die kostenlose Testphase ohne Zahlungsdaten (handle_new_user). Ein
    -- Probeabo bei Stripe oder im Store verlaengert sich kostenpflichtig.
    AND a.eigene_testphase
    AND a.trial_end > now() + interval '48 hours'
    AND a.trial_end <= now() + interval '72 hours'
    AND NOT EXISTS (
      SELECT 1 FROM service_mail_versand v
      WHERE v.user_id = e.id AND v.art = 'testphase_endet'
        AND v.bezug = (a.trial_end AT TIME ZONE 'Europe/Berlin')::date::text
    );
$fn$;

REVOKE ALL ON FUNCTION public.service_mail_auswahl(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_mail_auswahl(timestamptz) TO service_role;
