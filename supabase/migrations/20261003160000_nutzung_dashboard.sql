-- Nutzungs-Dashboard im Admin-Bereich (Wunsch des Betreibers, 03.10.2026):
-- Wie viele Kinder und Eltern nutzen LernZeit wirklich, und welche Familien
-- werden wahrscheinlich ein Abo abschliessen?
--
-- Keine neue Erhebung. Ausgewertet wird, was die App ohnehin speichert:
--  * Kinder:  game_sessions (eine Zeile je gespielter Lernrunde). Kein
--             Tracking von Kindern ueber analytics_events.
--  * Eltern:  analytics_events mit user_id (erfasst seit 18.08.2026),
--             beantwortete Bildschirmzeit-Anfragen, profiles.last_platform_at.
--  * Abo:     subscriptions; Kaeufe aus der RevenueCat-Sandbox (Testkaeufe)
--             erkennt revenuecat_events.umgebung.
--
-- Eine Familie = ein Elternkonto mit den verknuepften Kindern. Das Abo haengt
-- am Elternkonto; Kinder nutzen es mit (siehe useSubscription.ts).
--
-- Testkonten: Fast alle bisherigen Konten sind Tests des Betreibers. Ohne
-- Kennzeichnung waeren alle Zahlen wertlos. Testkonto ist, wer
--   - in admin_testkonten steht (im Dashboard per Schalter gesetzt),
--   - eine E-Mail auf lernzeit.app oder test.de hat (Apple-Pruefung, QA),
--   - Admin ist,
--   - oder Kind eines Testkontos ist.
--
-- Nur fuer Admins: SECURITY DEFINER mit eigener Pruefung auf has_role.

CREATE TABLE IF NOT EXISTS public.admin_testkonten (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  markiert_am timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_testkonten ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.admin_testkonten IS
  'Vom Admin als Test markierte Konten. Fliegen aus den Nutzungszahlen. Nur ueber admin_testkonto_setzen() beschreibbar; keine Policies.';

-- Alle Test-Kennungen samt Grund. Nicht direkt aufrufbar (nur aus den
-- Admin-Funktionen heraus).
CREATE OR REPLACE FUNCTION public.lz_testkonten()
RETURNS TABLE (user_id uuid, grund text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH direkt AS (
    SELECT t.user_id, 'markiert'::text AS grund FROM admin_testkonten t
    UNION ALL
    SELECT u.id, 'E-Mail ' || split_part(u.email, '@', 2)
    FROM auth.users u
    WHERE lower(split_part(u.email, '@', 2)) IN ('lernzeit.app', 'test.de')
    UNION ALL
    SELECT r.user_id, 'Admin' FROM user_roles r WHERE r.role = 'admin'::app_role
  ),
  mit_kindern AS (
    SELECT d.user_id, d.grund FROM direkt d
    UNION ALL
    SELECT pcr.child_id, 'Kind eines Testkontos'
    FROM parent_child_relationships pcr
    JOIN direkt d ON d.user_id = pcr.parent_id
  )
  SELECT DISTINCT ON (m.user_id) m.user_id, m.grund
  FROM mit_kindern m
  ORDER BY m.user_id, CASE m.grund WHEN 'markiert' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END;
$fn$;

REVOKE ALL ON FUNCTION public.lz_testkonten() FROM PUBLIC, anon, authenticated;

-- Schalter im Dashboard.
CREATE OR REPLACE FUNCTION public.admin_testkonto_setzen(p_user uuid, p_test boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;
  IF p_test THEN
    INSERT INTO admin_testkonten (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM admin_testkonten WHERE user_id = p_user;
  END IF;
END;
$fn$;

-- Eine Zeile je Familie (Elternkonto) und je Kind ohne Elternkonto.
CREATE OR REPLACE FUNCTION public.admin_nutzung_familien()
RETURNS TABLE (
  id uuid,
  art text,                    -- 'familie' | 'kind_allein'
  name text,
  email text,
  registriert_am timestamptz,
  plattform text,
  kinder int,
  kinder_mit_runden int,
  erste_runde timestamptz,
  letzte_runde timestamptz,
  lerntage_7 int,
  lerntage_14 int,
  lerntage_28 int,
  runden_28 int,
  lernminuten_28 int,
  eltern_zuletzt timestamptz,
  eltern_tage_14 int,
  anfragen_28 int,
  freigaben_28 int,
  paywall_gesehen boolean,
  kauf_begonnen boolean,
  abo_status text,             -- bezahlt | testkauf | freigeschaltet | testphase | testphase_abgelaufen | gekuendigt | zahlung_offen | ohne
  abo_quelle text,
  testphase_ende timestamptz,
  testkonto boolean,
  testkonto_grund text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH test AS (SELECT * FROM public.lz_testkonten()),
  heute AS (SELECT (now() AT TIME ZONE 'Europe/Berlin')::date AS d),
  einheiten AS (
    SELECT p.id, 'familie'::text AS art, p.id AS eltern_id FROM profiles p WHERE p.role = 'parent'
    UNION ALL
    SELECT c.id, 'kind_allein', NULL::uuid FROM profiles c
    WHERE c.role = 'child'
      AND NOT EXISTS (SELECT 1 FROM parent_child_relationships r WHERE r.child_id = c.id)
  ),
  -- Kinder je Einheit (bei kind_allein: das Kind selbst)
  kind_von AS (
    SELECT e.id AS einheit, r.child_id AS kind FROM einheiten e
    JOIN parent_child_relationships r ON r.parent_id = e.id WHERE e.art = 'familie'
    UNION ALL
    SELECT e.id, e.id FROM einheiten e WHERE e.art = 'kind_allein'
  ),
  runden AS (
    SELECT kv.einheit, g.user_id AS kind, g.created_at,
      (g.created_at AT TIME ZONE 'Europe/Berlin')::date AS tag,
      coalesce(g.duration_seconds, round(g.time_spent)::int, 0) AS sekunden
    FROM kind_von kv JOIN game_sessions g ON g.user_id = kv.kind
  ),
  r_agg AS (
    SELECT runden.einheit,
      count(DISTINCT runden.kind)::int AS kinder_mit_runden,
      min(runden.created_at) AS erste,
      max(runden.created_at) AS letzte,
      count(DISTINCT runden.tag) FILTER (WHERE runden.tag > (SELECT d FROM heute) - 7)::int AS t7,
      count(DISTINCT runden.tag) FILTER (WHERE runden.tag > (SELECT d FROM heute) - 14)::int AS t14,
      count(DISTINCT runden.tag) FILTER (WHERE runden.tag > (SELECT d FROM heute) - 28)::int AS t28,
      count(*) FILTER (WHERE runden.tag > (SELECT d FROM heute) - 28)::int AS r28,
      (sum(runden.sekunden) FILTER (WHERE runden.tag > (SELECT d FROM heute) - 28) / 60)::int AS min28
    FROM runden GROUP BY runden.einheit
  ),
  -- Aktivitaet der Eltern: App-Ereignisse und beantwortete Anfragen
  eltern_akt AS (
    SELECT ev.user_id AS eltern, ev.created_at AS t FROM analytics_events ev
    WHERE ev.user_id IN (SELECT e.id FROM einheiten e WHERE e.art = 'familie')
    UNION ALL
    SELECT q.parent_id, q.responded_at FROM screen_time_requests q WHERE q.responded_at IS NOT NULL
    UNION ALL
    SELECT p.id, p.last_platform_at FROM profiles p WHERE p.role = 'parent' AND p.last_platform_at IS NOT NULL
  ),
  e_agg AS (
    SELECT eltern_akt.eltern,
      max(eltern_akt.t) AS zuletzt,
      count(DISTINCT (eltern_akt.t AT TIME ZONE 'Europe/Berlin')::date)
        FILTER (WHERE (eltern_akt.t AT TIME ZONE 'Europe/Berlin')::date > (SELECT d FROM heute) - 14)::int AS tage14
    FROM eltern_akt GROUP BY eltern_akt.eltern
  ),
  anfr AS (
    SELECT q.parent_id,
      count(*) FILTER (WHERE q.created_at > now() - interval '28 days')::int AS anfragen,
      count(*) FILTER (WHERE q.status = 'approved' AND q.responded_at > now() - interval '28 days')::int AS freigaben
    FROM screen_time_requests q GROUP BY q.parent_id
  ),
  kauf AS (
    SELECT ev.user_id,
      bool_or(ev.event_name = 'trial_ended_paywall_seen') AS paywall,
      bool_or(ev.event_name = 'checkout_started') AS checkout
    FROM analytics_events ev
    WHERE ev.event_name IN ('trial_ended_paywall_seen', 'checkout_started') AND ev.user_id IS NOT NULL
    GROUP BY ev.user_id
  ),
  abo AS (
    SELECT DISTINCT ON (s.user_id) s.* FROM subscriptions s ORDER BY s.user_id, s.updated_at DESC NULLS LAST
  ),
  rc AS (
    SELECT DISTINCT ON (x.user_id) x.user_id, x.umgebung FROM revenuecat_events x
    WHERE x.user_id IS NOT NULL ORDER BY x.user_id, x.empfangen_am DESC
  )
  SELECT e.id, e.art, p.name, u.email::text, p.created_at, p.last_platform,
    (SELECT count(*) FROM kind_von kv WHERE kv.einheit = e.id)::int,
    coalesce(r_agg.kinder_mit_runden, 0),
    r_agg.erste, r_agg.letzte,
    coalesce(r_agg.t7, 0), coalesce(r_agg.t14, 0), coalesce(r_agg.t28, 0),
    coalesce(r_agg.r28, 0), coalesce(r_agg.min28, 0),
    e_agg.zuletzt, coalesce(e_agg.tage14, 0),
    coalesce(anfr.anfragen, 0), coalesce(anfr.freigaben, 0),
    coalesce(kauf.paywall, false), coalesce(kauf.checkout, false),
    CASE
      WHEN e.art = 'kind_allein' THEN 'ohne'
      WHEN abo.user_id IS NULL THEN 'ohne'
      WHEN abo.status = 'active' AND (abo.stripe_subscription_id IS NOT NULL OR abo.quelle = 'revenuecat')
        THEN CASE WHEN rc.umgebung = 'SANDBOX' THEN 'testkauf' ELSE 'bezahlt' END
      WHEN abo.status = 'active' THEN 'freigeschaltet'
      WHEN abo.status = 'trialing' AND abo.trial_end > now() THEN 'testphase'
      WHEN abo.status = 'trialing' THEN 'testphase_abgelaufen'
      WHEN abo.status = 'past_due' THEN 'zahlung_offen'
      WHEN abo.bezahlt_seit IS NOT NULL THEN 'gekuendigt'
      ELSE 'testphase_abgelaufen'
    END,
    CASE WHEN abo.quelle = 'revenuecat' THEN coalesce(abo.store, 'RevenueCat')
         WHEN abo.stripe_subscription_id IS NOT NULL THEN 'Stripe' END,
    CASE WHEN e.art = 'familie' AND abo.status = 'trialing' THEN abo.trial_end END,
    test.user_id IS NOT NULL,
    test.grund
  FROM einheiten e
  JOIN profiles p ON p.id = e.id
  LEFT JOIN auth.users u ON u.id = e.id
  LEFT JOIN r_agg ON r_agg.einheit = e.id
  LEFT JOIN e_agg ON e_agg.eltern = e.id
  LEFT JOIN anfr ON anfr.parent_id = e.id
  LEFT JOIN kauf ON kauf.user_id = e.id
  LEFT JOIN abo ON abo.user_id = e.id
  LEFT JOIN rc ON rc.user_id = e.id
  LEFT JOIN test ON test.user_id = e.id
  ORDER BY p.created_at DESC;
END;
$fn$;

-- Aktive Kinder und Eltern je Tag, dazu "in den 7 Tagen bis einschliesslich".
CREATE OR REPLACE FUNCTION public.admin_nutzung_verlauf(p_tage int, p_ohne_test boolean)
RETURNS TABLE (
  tag date,
  kinder_aktiv int,
  kinder_aktiv_7t int,
  eltern_aktiv int,
  eltern_aktiv_7t int,
  runden int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
#variable_conflict use_column
DECLARE
  bis date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  von date := bis - (greatest(7, least(p_tage, 400)) - 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH test AS (SELECT t.user_id FROM public.lz_testkonten() t WHERE p_ohne_test),
  kind_tage AS (
    SELECT DISTINCT g.user_id, (g.created_at AT TIME ZONE 'Europe/Berlin')::date AS tag
    FROM game_sessions g
    WHERE g.created_at >= ((von - 6)::timestamp AT TIME ZONE 'Europe/Berlin')
      AND g.user_id NOT IN (SELECT test.user_id FROM test)
  ),
  kind_runden AS (
    SELECT (g.created_at AT TIME ZONE 'Europe/Berlin')::date AS tag, count(*)::int AS n
    FROM game_sessions g
    WHERE g.created_at >= (von::timestamp AT TIME ZONE 'Europe/Berlin')
      AND g.user_id NOT IN (SELECT test.user_id FROM test)
    GROUP BY 1
  ),
  eltern AS (SELECT p.id FROM profiles p WHERE p.role = 'parent' AND p.id NOT IN (SELECT test.user_id FROM test)),
  eltern_tage AS (
    SELECT DISTINCT x.eltern, (x.t AT TIME ZONE 'Europe/Berlin')::date AS tag FROM (
      SELECT ev.user_id AS eltern, ev.created_at AS t FROM analytics_events ev WHERE ev.user_id IN (SELECT eltern.id FROM eltern)
      UNION ALL
      SELECT q.parent_id, q.responded_at FROM screen_time_requests q
      WHERE q.responded_at IS NOT NULL AND q.parent_id IN (SELECT eltern.id FROM eltern)
      UNION ALL
      SELECT p.id, p.last_platform_at FROM profiles p
      WHERE p.last_platform_at IS NOT NULL AND p.id IN (SELECT eltern.id FROM eltern)
    ) x
    WHERE x.t >= ((von - 6)::timestamp AT TIME ZONE 'Europe/Berlin')
  ),
  tage AS (SELECT generate_series(von, bis, interval '1 day')::date AS tag)
  SELECT tage.tag,
    (SELECT count(*) FROM kind_tage k WHERE k.tag = tage.tag)::int,
    (SELECT count(DISTINCT k.user_id) FROM kind_tage k WHERE k.tag BETWEEN tage.tag - 6 AND tage.tag)::int,
    (SELECT count(*) FROM eltern_tage e WHERE e.tag = tage.tag)::int,
    (SELECT count(DISTINCT e.eltern) FROM eltern_tage e WHERE e.tag BETWEEN tage.tag - 6 AND tage.tag)::int,
    coalesce((SELECT kr.n FROM kind_runden kr WHERE kr.tag = tage.tag), 0)
  FROM tage
  ORDER BY tage.tag;
END;
$fn$;

-- Kommen Kinder wieder? Kinder nach der Woche ihrer ersten Lernrunde; je
-- Folgewoche, wie viele davon in dieser Woche gelernt haben. Wochen in der
-- Zukunft sind NULL.
CREATE OR REPLACE FUNCTION public.admin_nutzung_kohorten(p_wochen int, p_ohne_test boolean)
RETURNS TABLE (
  kohorte date,
  kinder int,
  aktiv int[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
#variable_conflict use_column
DECLARE
  n int := greatest(2, least(p_wochen, 26));
  diese_woche date := date_trunc('week', now() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH test AS (SELECT t.user_id FROM public.lz_testkonten() t WHERE p_ohne_test),
  wochen AS (
    SELECT DISTINCT g.user_id, date_trunc('week', g.created_at AT TIME ZONE 'Europe/Berlin')::date AS woche
    FROM game_sessions g
    WHERE g.user_id NOT IN (SELECT test.user_id FROM test)
  ),
  start AS (SELECT w.user_id, min(w.woche) AS kohorte FROM wochen w GROUP BY w.user_id),
  kohorten AS (
    SELECT s.kohorte, count(*)::int AS kinder FROM start s
    WHERE s.kohorte > diese_woche - 7 * n
    GROUP BY s.kohorte
  )
  SELECT k.kohorte, k.kinder,
    ARRAY(
      SELECT CASE WHEN k.kohorte + 7 * i > diese_woche THEN NULL ELSE (
        SELECT count(*)::int FROM start s JOIN wochen w ON w.user_id = s.user_id
        WHERE s.kohorte = k.kohorte AND w.woche = k.kohorte + 7 * i
      ) END
      FROM generate_series(0, n - 1) AS i
      ORDER BY i
    )
  FROM kohorten k
  ORDER BY k.kohorte DESC;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_testkonto_setzen(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_nutzung_familien() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_nutzung_verlauf(int, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_nutzung_kohorten(int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_testkonto_setzen(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_nutzung_familien() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_nutzung_verlauf(int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_nutzung_kohorten(int, boolean) TO authenticated;
