-- Registrierungs-Trichter fuer das Marketing-Panel (Auftrag des Betreibers,
-- 04.10.2026: warum registrieren sich Besucher nicht?).
--
-- Je Herkunft (meta / google / direkt / sonstige) und Geraet (Website:
-- ios / android / desktop aus properties.geraet, seit 04.10.2026; App: App iOS /
-- App Android), gezaehlt nach eindeutigen anonymen IDs:
-- Abschnitte der Startseite, CTA/Demo, Store-Klick, Formularschritte, Fehler,
-- Abbruch, Abschluss, Verweildauer (Median aus page_leave).
-- Testkonten (lz_testkonten) und ihre anonymen IDs sind ausgenommen.

CREATE OR REPLACE FUNCTION public.admin_registrierungs_trichter(p_tage integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  ergebnis jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
    SELECT e.* FROM analytics_events e
    WHERE e.anonymous_id IS NOT NULL
      AND e.created_at >= now() - make_interval(days => greatest(1, least(p_tage, 365)))
      AND coalesce(e.page_path, '') NOT IN ('/apple-app-site-association', '/api/mcp')
  ),
  test_ids AS (
    SELECT DISTINCT ev.anonymous_id FROM ev JOIN public.lz_testkonten() t ON t.user_id = ev.user_id
  ),
  erst AS (
    SELECT DISTINCT ON (ev.anonymous_id) ev.anonymous_id, ev.utm_source, ev.referrer, ev.platform
    FROM ev ORDER BY ev.anonymous_id, ev.created_at
  ),
  geraet AS (
    SELECT DISTINCT ON (ev.anonymous_id) ev.anonymous_id, ev.properties->>'geraet' AS geraet
    FROM ev WHERE ev.properties ? 'geraet' ORDER BY ev.anonymous_id, ev.created_at
  ),
  bes AS (
    SELECT erst.anonymous_id,
      CASE
        WHEN erst.utm_source ILIKE ANY (ARRAY['meta','facebook','fb','instagram','ig'])
          OR erst.referrer ILIKE ANY (ARRAY['%facebook.%','%instagram.%','%fb.%']) THEN 'meta'
        WHEN erst.utm_source ILIKE 'google%' OR erst.referrer ILIKE '%google.%' THEN 'google'
        WHEN erst.utm_source IS NULL AND (coalesce(erst.referrer, '') = '' OR erst.referrer ILIKE '%lernzeit.app%') THEN 'direkt'
        ELSE 'sonstige'
      END AS herkunft,
      CASE erst.platform
        WHEN 'ios' THEN 'App iOS'
        WHEN 'android' THEN 'App Android'
        ELSE coalesce(geraet.geraet, 'unbekannt')
      END AS geraet
    FROM erst
    LEFT JOIN geraet ON geraet.anonymous_id = erst.anonymous_id
    WHERE erst.anonymous_id NOT IN (SELECT anonymous_id FROM test_ids)
  ),
  taten AS (
    SELECT ev.anonymous_id,
      bool_or(ev.event_name = 'page_view') AS pv,
      bool_or(ev.event_name = 'abschnitt_gesehen' AND ev.properties->>'abschnitt' = 'hero') AS a_hero,
      bool_or(ev.event_name = 'abschnitt_gesehen' AND ev.properties->>'abschnitt' = 'so_funktionierts') AS a_so,
      bool_or(ev.event_name = 'abschnitt_gesehen' AND ev.properties->>'abschnitt' = 'preise') AS a_preise,
      bool_or(ev.event_name = 'abschnitt_gesehen' AND ev.properties->>'abschnitt' = 'faq') AS a_faq,
      bool_or(ev.event_name = 'abschnitt_gesehen' AND ev.properties->>'abschnitt' = 'fusszeile') AS a_fuss,
      bool_or(ev.event_name IN ('landing_cta_click', 'demo_started')) AS cta,
      bool_or(ev.event_name = 'app_store_click') AS store,
      bool_or(ev.event_name = 'sign_up_started') AS formular,
      bool_or(ev.event_name = 'sign_up_step' AND ev.properties->>'schritt' = 'rolle_gewaehlt') AS s_rolle,
      bool_or(ev.event_name = 'sign_up_step' AND ev.properties->>'schritt' IN ('eingabe_begonnen', 'oauth')) AS s_eingabe,
      bool_or(ev.event_name = 'sign_up_step' AND ev.properties->>'schritt' IN ('absenden', 'oauth')) AS s_absenden,
      bool_or(ev.event_name = 'sign_up_error') AS fehler,
      bool_or(ev.event_name = 'sign_up_abandoned') AS abbruch,
      bool_or(ev.event_name = 'sign_up_completed') AS fertig,
      max((ev.properties->>'sekunden_seit_erstem_aufruf')::numeric) FILTER (WHERE ev.event_name = 'page_leave') AS dauer
    FROM ev GROUP BY ev.anonymous_id
  ),
  zeilen AS (
    SELECT bes.herkunft, bes.geraet,
      count(*) FILTER (WHERE taten.pv) AS besucher,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY taten.dauer) AS verweildauer_median_s,
      count(*) FILTER (WHERE taten.a_hero) AS hero,
      count(*) FILTER (WHERE taten.a_so) AS so_funktionierts,
      count(*) FILTER (WHERE taten.a_preise) AS preise,
      count(*) FILTER (WHERE taten.a_faq) AS faq,
      count(*) FILTER (WHERE taten.a_fuss) AS fusszeile,
      count(*) FILTER (WHERE taten.cta) AS cta_demo,
      count(*) FILTER (WHERE taten.store) AS store_klick,
      count(*) FILTER (WHERE taten.formular) AS formular_geoeffnet,
      count(*) FILTER (WHERE taten.s_rolle) AS rolle_gewaehlt,
      count(*) FILTER (WHERE taten.s_eingabe) AS eingabe_begonnen,
      count(*) FILTER (WHERE taten.s_absenden) AS abgeschickt,
      count(*) FILTER (WHERE taten.fehler) AS mit_fehler,
      count(*) FILTER (WHERE taten.abbruch AND NOT taten.fertig) AS abgebrochen,
      count(*) FILTER (WHERE taten.fertig) AS registriert
    FROM bes JOIN taten ON taten.anonymous_id = bes.anonymous_id
    GROUP BY 1, 2
  ),
  fehler AS (
    SELECT ev.properties->>'fehler' AS fehler, count(*) AS anzahl, count(DISTINCT ev.anonymous_id) AS besucher
    FROM ev
    WHERE ev.event_name = 'sign_up_error' AND ev.anonymous_id NOT IN (SELECT anonymous_id FROM test_ids)
    GROUP BY 1
  ),
  abbruch AS (
    SELECT ev.properties->>'letzter_schritt' AS schritt, count(DISTINCT ev.anonymous_id) AS besucher,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY (ev.properties->>'sekunden')::numeric) AS sekunden_median
    FROM ev
    WHERE ev.event_name = 'sign_up_abandoned' AND ev.anonymous_id NOT IN (SELECT anonymous_id FROM test_ids)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'tage', p_tage,
    'trichter', coalesce((SELECT jsonb_agg(to_jsonb(z) ORDER BY z.besucher DESC) FROM zeilen z), '[]'::jsonb),
    'fehler', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.besucher DESC) FROM fehler f), '[]'::jsonb),
    'abbruch', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.besucher DESC) FROM abbruch a), '[]'::jsonb)
  ) INTO ergebnis;

  RETURN ergebnis;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_registrierungs_trichter(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_registrierungs_trichter(integer) TO authenticated;
