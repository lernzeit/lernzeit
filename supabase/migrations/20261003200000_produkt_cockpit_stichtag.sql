-- Produkt-Cockpit nur mit Konten ab einem Stichtag (Wunsch des Betreibers,
-- 03.10.2026: "nur Konten, die ab 01.09.2026 angelegt wurden").
--
-- produkt_cockpit_ab(p_ab, p_namen) rechnet alles ab dem Stichtag: Familien,
-- aktive Kinder und Eltern, Wiederkehr, Anfragen, Onboarding, Umfrage,
-- Rueckmeldungen. Ausgenommen sind ausserdem Kinder von Eltern, die vor dem
-- Stichtag angelegt wurden. produkt_cockpit(p_namen) bleibt und nutzt den
-- 01.09.2026.

CREATE OR REPLACE FUNCTION public.produkt_cockpit_ab(p_ab date, p_namen boolean)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
WITH testkonten AS (SELECT t.user_id FROM public.lz_testkonten() t),
-- Ausgenommen: Testkonten, Konten vor dem Stichtag und Kinder von Eltern
-- vor dem Stichtag (die Familie zaehlt dann als alt).
test AS (
  SELECT testkonten.user_id FROM testkonten
  UNION
  SELECT p.id FROM profiles p WHERE p.created_at < (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
  UNION
  SELECT r.child_id FROM parent_child_relationships r JOIN profiles pp ON pp.id = r.parent_id
  WHERE pp.created_at < (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
),
fam AS (SELECT * FROM public.lz_nutzung_familien() f WHERE NOT f.testkonto AND f.id NOT IN (SELECT test.user_id FROM test)),
von_bis AS (
  SELECT greatest(p_ab, (now() AT TIME ZONE 'Europe/Berlin')::date - 89) AS von,
         (now() AT TIME ZONE 'Europe/Berlin')::date AS bis
),
kind_tage AS (
  SELECT DISTINCT g.user_id, (g.created_at AT TIME ZONE 'Europe/Berlin')::date AS tag
  FROM game_sessions g
  WHERE g.created_at >= (((SELECT von FROM von_bis) - 6)::timestamp AT TIME ZONE 'Europe/Berlin')
    AND g.user_id NOT IN (SELECT test.user_id FROM test)
),
eltern_tage AS (
  SELECT DISTINCT x.eltern, (x.t AT TIME ZONE 'Europe/Berlin')::date AS tag FROM (
    SELECT ev.user_id AS eltern, ev.created_at AS t FROM analytics_events ev
    JOIN profiles p ON p.id = ev.user_id AND p.role = 'parent'
    UNION ALL
    SELECT q.parent_id, q.responded_at FROM screen_time_requests q WHERE q.responded_at IS NOT NULL
    UNION ALL
    SELECT p.id, p.last_platform_at FROM profiles p WHERE p.role = 'parent' AND p.last_platform_at IS NOT NULL
  ) x
  WHERE x.eltern NOT IN (SELECT test.user_id FROM test)
    AND x.t >= (((SELECT von FROM von_bis) - 6)::timestamp AT TIME ZONE 'Europe/Berlin')
),
tage AS (SELECT generate_series((SELECT von FROM von_bis), (SELECT bis FROM von_bis), interval '1 day')::date AS tag),
kind_wochen AS (
  SELECT DISTINCT g.user_id, date_trunc('week', g.created_at AT TIME ZONE 'Europe/Berlin')::date AS woche
  FROM game_sessions g WHERE g.user_id NOT IN (SELECT test.user_id FROM test)
),
kind_start AS (SELECT w.user_id, min(w.woche) AS kohorte FROM kind_wochen w GROUP BY w.user_id),
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
    greatest(date_trunc('week', p_ab::timestamp), date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') - interval '25 weeks'),
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
  'stichtag', p_ab,
  'testkonten', (SELECT count(*) FROM testkonten),
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
  'verlauf', (
    SELECT jsonb_agg(jsonb_build_object(
      'tag', tage.tag,
      'kinder_aktiv', (SELECT count(*) FROM kind_tage k WHERE k.tag = tage.tag),
      'kinder_aktiv_7t', (SELECT count(DISTINCT k.user_id) FROM kind_tage k WHERE k.tag BETWEEN tage.tag - 6 AND tage.tag),
      'eltern_aktiv', (SELECT count(*) FROM eltern_tage e WHERE e.tag = tage.tag),
      'eltern_aktiv_7t', (SELECT count(DISTINCT e.eltern) FROM eltern_tage e WHERE e.tag BETWEEN tage.tag - 6 AND tage.tag),
      'runden', (SELECT count(*) FROM game_sessions g WHERE (g.created_at AT TIME ZONE 'Europe/Berlin')::date = tage.tag
                   AND g.user_id NOT IN (SELECT test.user_id FROM test))
    ) ORDER BY tage.tag) FROM tage
  ),
  'kohorten', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'kohorte', k.kohorte,
      'kinder', k.kinder,
      'aktiv', (SELECT jsonb_agg(CASE WHEN k.kohorte + 7 * i > date_trunc('week', now() AT TIME ZONE 'Europe/Berlin')::date THEN NULL ELSE (
                  SELECT count(*) FROM kind_start s JOIN kind_wochen w ON w.user_id = s.user_id
                  WHERE s.kohorte = k.kohorte AND w.woche = k.kohorte + 7 * i) END ORDER BY i)
                FROM generate_series(0, 7) AS i)
    ) ORDER BY k.kohorte DESC), '[]'::jsonb)
    FROM (SELECT s.kohorte, count(*) AS kinder FROM kind_start s
          WHERE s.kohorte >= date_trunc('week', p_ab::timestamp)::date GROUP BY s.kohorte) k
  ),
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
    WHERE q.parent_id NOT IN (SELECT test.user_id FROM test) AND q.created_at >= (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
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
      WHERE e.event_name = 'onboarding_step_viewed' AND e.created_at >= (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
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
    FROM abwanderung_umfrage u
    WHERE u.created_at >= (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
      AND (u.user_id IS NULL OR u.user_id NOT IN (SELECT test.user_id FROM test))
  ),
  'kuendigungen', (
    SELECT coalesce(jsonb_object_agg(x.grund, x.n), '{}'::jsonb) FROM (
      SELECT coalesce(r.kuendigungsgrund, 'unbekannt') AS grund, count(*) AS n FROM revenuecat_events r
      WHERE r.typ IN ('CANCELLATION', 'EXPIRATION') AND coalesce(r.umgebung, '') <> 'SANDBOX'
        AND r.empfangen_am >= (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
        AND (r.user_id IS NULL OR r.user_id NOT IN (SELECT test.user_id FROM test))
      GROUP BY 1) x
  ),
  'rueckmeldungen', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'kategorie', pf.category, 'status', pf.status, 'plattform', pf.platform, 'am', pf.created_at,
      'kurz', upper(left(md5(pf.user_id::text), 5)),
      'text', CASE WHEN p_namen THEN pf.message END
    ) ORDER BY pf.created_at DESC), '[]'::jsonb)
    FROM parent_feedback pf
    WHERE pf.created_at >= (p_ab::timestamp AT TIME ZONE 'Europe/Berlin')
      AND (pf.user_id IS NULL OR pf.user_id NOT IN (SELECT test.user_id FROM test))
  )
);
$fn$;

CREATE OR REPLACE FUNCTION public.produkt_cockpit(p_namen boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT public.produkt_cockpit_ab(DATE '2026-09-01', p_namen);
$fn$;

REVOKE ALL ON FUNCTION public.produkt_cockpit_ab(date, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.produkt_cockpit(boolean) FROM PUBLIC, anon, authenticated;
