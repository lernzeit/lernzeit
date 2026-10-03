-- Produkt-Cockpit ausserhalb der App und Abwanderungs-Umfrage
-- (Wunsch des Betreibers, 03.10.2026).
--
-- 1. Die Auswertungen der Nutzungs-Funktionen ziehen in interne lz_*-
--    Funktionen um (ohne Admin-Pruefung, fuer niemanden ausser dem
--    Datenbank-Eigentuemer aufrufbar). Die admin_*-Funktionen pruefen
--    weiter auf Admin und rufen sie auf - fuer die App aendert sich nichts.
-- 2. produkt_cockpit(): alle Kennzahlen als ein JSON fuer das Cockpit-
--    Artefakt, das ueber den Supabase-Connector des Betreibers laedt.
-- 3. abwanderung_umfrage: Gruende, warum Eltern nicht (mehr) nutzen oder
--    nicht abonnieren.

CREATE OR REPLACE FUNCTION public.lz_nutzung_familien()
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM public.lz_nutzung_familien();
END;
$fn$;

CREATE OR REPLACE FUNCTION public.lz_nutzung_verlauf(p_tage int, p_ohne_test boolean)
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM public.lz_nutzung_verlauf(p_tage, p_ohne_test);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.lz_nutzung_kohorten(p_wochen int, p_ohne_test boolean)
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM public.lz_nutzung_kohorten(p_wochen, p_ohne_test);
END;
$fn$;

REVOKE ALL ON FUNCTION public.lz_nutzung_familien() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lz_nutzung_verlauf(int, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lz_nutzung_kohorten(int, boolean) FROM PUBLIC, anon, authenticated;

-- Warum Familien abspringen: kurze Umfrage an Eltern (nie an Kinder).
-- Ausgeloest in der App bei Inaktivitaet, an der Bezahlsperre nach der
-- Testphase und beim Loeschen des Kontos. Antworten bleiben beim Loeschen
-- des Kontos erhalten, aber ohne Personenbezug (user_id wird NULL).
CREATE TABLE IF NOT EXISTS public.abwanderung_umfrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anlass text NOT NULL CHECK (anlass IN ('inaktiv', 'testphase_ende', 'konto_loeschen')),
  gruende text[] NOT NULL DEFAULT '{}' CHECK (
    gruende <@ ARRAY['kind_will_nicht', 'aufgaben_passen_nicht', 'fehler_in_aufgaben', 'sperre_technik',
                     'einrichtung_aufwendig', 'weiss_nicht_weiter', 'zu_teuer', 'keine_zeit',
                     'andere_loesung', 'datenschutz', 'brauchen_nicht', 'anderes']::text[]
  ),
  freitext text CHECK (char_length(freitext) <= 1000),
  plattform text CHECK (plattform IN ('web', 'ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(gruende) > 0 OR coalesce(char_length(trim(freitext)), 0) > 0)
);
CREATE INDEX IF NOT EXISTS abwanderung_umfrage_user_idx ON public.abwanderung_umfrage (user_id, created_at DESC);
ALTER TABLE public.abwanderung_umfrage ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.abwanderung_umfrage IS
  'Gruende, warum Eltern LernZeit nicht (mehr) nutzen oder nicht abonnieren. Nur Eltern, freiwillig. Beim Loeschen des Kontos bleibt die Antwort ohne Personenbezug.';

CREATE POLICY "Eltern geben eigene Antwort ab" ON public.abwanderung_umfrage
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );
CREATE POLICY "Eltern sehen eigene Antworten" ON public.abwanderung_umfrage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins sehen alle Antworten" ON public.abwanderung_umfrage
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Alles fuer das Produkt-Cockpit (Artefakt ausserhalb der App) in einem
-- Aufruf. Testkonten sind ausgenommen. Namen und E-Mails nur mit
-- p_namen = true; ohne sie ist das Ergebnis pseudonym (Kennung = Anfang
-- eines Hashes der Konto-ID).
--
-- Nicht fuer App-Nutzer aufrufbar: Ausfuehrungsrecht nur fuer den
-- Datenbank-Eigentuemer (Supabase-Konsole bzw. Supabase-Connector).
CREATE OR REPLACE FUNCTION public.produkt_cockpit(p_namen boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
WITH test AS (SELECT t.user_id FROM public.lz_testkonten() t),
fam AS (SELECT * FROM public.lz_nutzung_familien() f WHERE NOT f.testkonto),
kinder_von AS (
  SELECT f.id AS einheit, r.child_id AS kind FROM fam f JOIN parent_child_relationships r ON r.parent_id = f.id
  UNION ALL
  SELECT f.id, f.id FROM fam f WHERE f.art = 'kind_allein'
),
extra AS (
  SELECT f.id,
    (SELECT count(DISTINCT (g.created_at AT TIME ZONE 'Europe/Berlin')::date)
       FROM game_sessions g JOIN kinder_von kv ON kv.kind = g.user_id WHERE kv.einheit = f.id) AS lerntage_gesamt,
    (SELECT count(*) FROM game_sessions g JOIN kinder_von kv ON kv.kind = g.user_id WHERE kv.einheit = f.id) AS runden_gesamt,
    EXISTS (SELECT 1 FROM push_tokens pt WHERE pt.user_id = f.id) AS push,
    EXISTS (SELECT 1 FROM child_settings cs WHERE cs.parent_id = f.id AND cs.screen_time_managed) AS sperre,
    (SELECT count(*) FROM screen_time_requests q WHERE q.parent_id = f.id) AS anfragen_gesamt,
    (SELECT count(*) FROM screen_time_requests q WHERE q.parent_id = f.id AND q.status = 'approved') AS freigaben_gesamt,
    (SELECT count(*) FROM screen_time_requests q WHERE q.parent_id = f.id AND q.status = 'pending') AS anfragen_offen,
    (SELECT min(r.created_at) FROM parent_child_relationships r WHERE r.parent_id = f.id) AS erstes_kind_am,
    (SELECT count(*) FROM parent_feedback pf WHERE pf.user_id = f.id) AS rueckmeldungen,
    (SELECT count(*) FROM abwanderung_umfrage u WHERE u.user_id = f.id) AS umfrage_antworten
  FROM fam f
),
web AS (
  SELECT e.* FROM analytics_events e
  WHERE e.platform = 'web' AND e.anonymous_id IS NOT NULL AND e.created_at > now() - interval '30 days'
),
erster AS (
  SELECT DISTINCT ON (web.anonymous_id) web.anonymous_id, web.utm_source, web.utm_campaign
  FROM web WHERE web.utm_source IS NOT NULL ORDER BY web.anonymous_id, web.created_at
),
verweis AS (
  SELECT DISTINCT ON (web.anonymous_id) web.anonymous_id,
    regexp_replace(lower(substring(web.referrer FROM '^[a-z]+://([^/:?#]+)')), '^(www\.|m\.|l\.|lm\.)', '') AS host
  FROM web WHERE web.referrer IS NOT NULL AND web.referrer !~* '^[a-z]+://([a-z0-9-]+\.)*lernzeit\.app'
  ORDER BY web.anonymous_id, web.created_at
),
besucher AS (
  SELECT b.anonymous_id,
    coalesce(erster.utm_source, verweis.host, 'Direkt') AS kanal,
    coalesce(erster.utm_campaign, '') AS kampagne,
    bool_or(w.event_name = 'app_store_click') AS store,
    bool_or(w.event_name = 'landing_cta_click') AS cta,
    bool_or(w.event_name = 'demo_started') AS demo
  FROM (SELECT DISTINCT web.anonymous_id FROM web) b
  LEFT JOIN erster ON erster.anonymous_id = b.anonymous_id
  LEFT JOIN verweis ON verweis.anonymous_id = b.anonymous_id
  JOIN web w ON w.anonymous_id = b.anonymous_id
  GROUP BY 1, 2, 3
),
wochen AS (
  SELECT generate_series(
    date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') - interval '11 weeks',
    date_trunc('week', now() AT TIME ZONE 'Europe/Berlin'),
    interval '1 week')::date AS woche
),
erstoeffnung AS (
  SELECT e.platform, min(e.created_at) AS t FROM analytics_events e
  WHERE e.platform IN ('ios', 'android') AND e.anonymous_id IS NOT NULL
  GROUP BY e.anonymous_id, e.platform
)
SELECT jsonb_build_object(
  'stand', now(),
  'mit_namen', p_namen,
  'testkonten', (SELECT count(*) FROM test),
  'familien', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'kurz', upper(left(md5(f.id::text), 5)),
      'id', CASE WHEN p_namen THEN f.id END,
      'name', CASE WHEN p_namen THEN f.name END,
      'email', CASE WHEN p_namen THEN f.email END,
      'art', f.art,
      'registriert_am', f.registriert_am,
      'plattform', f.plattform,
      'kinder', f.kinder,
      'kinder_mit_runden', f.kinder_mit_runden,
      'erste_runde', f.erste_runde,
      'letzte_runde', f.letzte_runde,
      'lerntage_7', f.lerntage_7,
      'lerntage_14', f.lerntage_14,
      'lerntage_28', f.lerntage_28,
      'lerntage_gesamt', e.lerntage_gesamt,
      'runden_28', f.runden_28,
      'runden_gesamt', e.runden_gesamt,
      'lernminuten_28', f.lernminuten_28,
      'eltern_zuletzt', f.eltern_zuletzt,
      'eltern_tage_14', f.eltern_tage_14,
      'anfragen_28', f.anfragen_28,
      'freigaben_28', f.freigaben_28,
      'anfragen_gesamt', e.anfragen_gesamt,
      'freigaben_gesamt', e.freigaben_gesamt,
      'anfragen_offen', e.anfragen_offen,
      'paywall_gesehen', f.paywall_gesehen,
      'kauf_begonnen', f.kauf_begonnen,
      'abo_status', f.abo_status,
      'abo_quelle', f.abo_quelle,
      'testphase_ende', f.testphase_ende,
      'push', e.push,
      'sperre', e.sperre,
      'erstes_kind_am', e.erstes_kind_am,
      'rueckmeldungen', e.rueckmeldungen,
      'umfrage_antworten', e.umfrage_antworten
    ) ORDER BY f.registriert_am DESC), '[]'::jsonb)
    FROM fam f JOIN extra e ON e.id = f.id
  ),
  'verlauf', (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.tag) FROM public.lz_nutzung_verlauf(90, true) v),
  'kohorten', (SELECT coalesce(jsonb_agg(to_jsonb(k) ORDER BY k.kohorte DESC), '[]'::jsonb) FROM public.lz_nutzung_kohorten(8, true) k),
  'anfragen', (
    SELECT jsonb_build_object(
      'gesamt', count(*),
      'freigegeben', count(*) FILTER (WHERE q.status = 'approved'),
      'abgelehnt', count(*) FILTER (WHERE q.status = 'denied'),
      'offen', count(*) FILTER (WHERE q.status = 'pending'),
      'median_minuten', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM q.responded_at - q.created_at) / 60)
                         FILTER (WHERE q.responded_at IS NOT NULL))::numeric),
      'in_15_minuten', count(*) FILTER (WHERE q.responded_at - q.created_at <= interval '15 minutes'),
      'beantwortet', count(*) FILTER (WHERE q.responded_at IS NOT NULL))
    FROM screen_time_requests q
    WHERE q.parent_id NOT IN (SELECT test.user_id FROM test) AND q.created_at > now() - interval '90 days'
  ),
  'fragen_meldungen', jsonb_build_object(
    'runden_30', (SELECT count(*) FROM game_sessions g WHERE g.created_at > now() - interval '30 days'
                    AND g.user_id NOT IN (SELECT test.user_id FROM test)),
    'nach_art', (SELECT coalesce(jsonb_object_agg(x.feedback_type, x.n), '{}'::jsonb) FROM (
                   SELECT qf.feedback_type, count(*) AS n FROM question_feedback qf
                   WHERE qf.created_at > now() - interval '30 days' AND qf.user_id NOT IN (SELECT test.user_id FROM test)
                   GROUP BY 1) x)
  ),
  'onboarding', (
    SELECT coalesce(jsonb_object_agg(x.schritt, x.personen), '{}'::jsonb) FROM (
      SELECT e.properties->>'step' AS schritt, count(DISTINCT coalesce(e.user_id::text, e.anonymous_id)) AS personen
      FROM analytics_events e
      WHERE e.event_name = 'onboarding_step_viewed' AND e.created_at > now() - interval '90 days'
        AND (e.user_id IS NULL OR e.user_id NOT IN (SELECT test.user_id FROM test))
      GROUP BY 1) x
  ),
  'kauf', jsonb_build_object(
    'bezahlsperre_gesehen', (SELECT count(DISTINCT e.user_id) FROM analytics_events e WHERE e.event_name = 'trial_ended_paywall_seen' AND e.user_id NOT IN (SELECT test.user_id FROM test)),
    'kauf_begonnen', (SELECT count(DISTINCT e.user_id) FROM analytics_events e WHERE e.event_name = 'checkout_started' AND e.user_id NOT IN (SELECT test.user_id FROM test)),
    'gekauft', (SELECT count(DISTINCT e.user_id) FROM analytics_events e WHERE e.event_name = 'subscription_purchased' AND e.user_id NOT IN (SELECT test.user_id FROM test))
  ),
  'marketing_wochen', (
    SELECT jsonb_agg(jsonb_build_object(
      'woche', w.woche,
      'besucher', (SELECT count(DISTINCT e.anonymous_id) FROM analytics_events e WHERE e.platform = 'web' AND e.event_name = 'page_view'
                     AND date_trunc('week', e.created_at AT TIME ZONE 'Europe/Berlin')::date = w.woche),
      'store_klicks', (SELECT count(*) FROM analytics_events e WHERE e.event_name = 'app_store_click'
                     AND date_trunc('week', e.created_at AT TIME ZONE 'Europe/Berlin')::date = w.woche),
      'erstoeffnungen_ios', (SELECT count(*) FROM erstoeffnung o WHERE o.platform = 'ios' AND date_trunc('week', o.t AT TIME ZONE 'Europe/Berlin')::date = w.woche),
      'erstoeffnungen_android', (SELECT count(*) FROM erstoeffnung o WHERE o.platform = 'android' AND date_trunc('week', o.t AT TIME ZONE 'Europe/Berlin')::date = w.woche),
      'eltern_neu', (SELECT count(*) FROM profiles p WHERE p.role = 'parent' AND p.id NOT IN (SELECT test.user_id FROM test)
                     AND date_trunc('week', p.created_at AT TIME ZONE 'Europe/Berlin')::date = w.woche)
    ) ORDER BY w.woche) FROM wochen w
  ),
  'kanaele_30', (
    SELECT coalesce(jsonb_agg(x ORDER BY x.besucher DESC), '[]'::jsonb) FROM (
      SELECT b.kanal, b.kampagne, count(*) AS besucher,
        count(*) FILTER (WHERE b.store) AS store_klicks,
        count(*) FILTER (WHERE b.cta) AS registrieren_klicks,
        count(*) FILTER (WHERE b.demo) AS demo
      FROM besucher b GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 12) x
  ),
  'umfrage', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'anlass', u.anlass, 'gruende', to_jsonb(u.gruende), 'freitext', u.freitext, 'plattform', u.plattform,
      'am', u.created_at, 'kurz', CASE WHEN u.user_id IS NULL THEN NULL ELSE upper(left(md5(u.user_id::text), 5)) END
    ) ORDER BY u.created_at DESC), '[]'::jsonb)
    FROM abwanderung_umfrage u WHERE u.user_id IS NULL OR u.user_id NOT IN (SELECT test.user_id FROM test)
  ),
  'kuendigungen', (
    SELECT coalesce(jsonb_object_agg(x.grund, x.n), '{}'::jsonb) FROM (
      SELECT coalesce(r.kuendigungsgrund, 'unbekannt') AS grund, count(*) AS n FROM revenuecat_events r
      WHERE r.typ IN ('CANCELLATION', 'EXPIRATION') AND coalesce(r.umgebung, '') <> 'SANDBOX'
        AND (r.user_id IS NULL OR r.user_id NOT IN (SELECT test.user_id FROM test))
      GROUP BY 1) x
  ),
  'rueckmeldungen', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'kategorie', pf.category, 'status', pf.status, 'plattform', pf.platform, 'am', pf.created_at,
      'kurz', upper(left(md5(pf.user_id::text), 5)),
      'text', CASE WHEN p_namen THEN pf.message END
    ) ORDER BY pf.created_at DESC), '[]'::jsonb)
    FROM parent_feedback pf WHERE pf.user_id IS NULL OR pf.user_id NOT IN (SELECT test.user_id FROM test)
  )
);
$fn$;

REVOKE ALL ON FUNCTION public.produkt_cockpit(boolean) FROM PUBLIC, anon, authenticated;
