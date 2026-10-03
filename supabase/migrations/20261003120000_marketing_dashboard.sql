-- Marketing-Dashboard im Admin-Bereich (Wunsch des Betreibers, 03.10.2026):
-- Website-Besuche, Registrierungen und App-Downloads je Tag/Woche/Monat,
-- dazu Kanaele und Anzeigen nach Erfolg.
--
-- Alles aus eigenen Daten in Supabase (EU): analytics_events und profiles.
-- Nichts davon verlaesst die Infrastruktur.
--
-- Was die Zahlen bedeuten — und was nicht:
--
--  * Website-Besucher: verschiedene anonyme Kennungen mit page_view auf
--    platform = 'web'. Ein Besucher mit zwei Browsern zaehlt doppelt.
--  * App-Erstoeffnungen: die ERSTE Kennung je Plattform (ios/android) — also
--    ein Geraet, das LernZeit installiert UND geoeffnet hat. Das ist kein
--    Download-Zaehler: Downloads ohne Oeffnen fehlen, eine Neuinstallation
--    zaehlt erneut. Echte Downloads kennen nur App Store Connect und Google
--    Play.
--  * Registrierungen: neue Konten in profiles, getrennt nach Eltern und
--    Kindern (Admin-Konten zaehlen nicht).
--  * Kanaele: erster Kontakt je Website-Besucher — erste UTM-Quelle, sonst
--    die verweisende Seite, sonst "Direkt". App-Installationen lassen sich
--    einem Kanal NICHT zuordnen: Zwischen Website und App liegt der Store, und
--    die App erhebt bewusst keine Werbe-Kennung (Kinder-App, DSGVO).
--
-- Zeitraeume in deutscher Zeit (Europe/Berlin).
--
-- Nur fuer Admins: SECURITY DEFINER mit eigener Pruefung auf has_role. Ohne
-- die Pruefung koennte jedes angemeldete Konto die Auswertung abrufen.

CREATE OR REPLACE FUNCTION public.admin_marketing_zeitreihe(p_raster text, p_anzahl int)
RETURNS TABLE (
  periode date,
  website_besucher int,
  website_aufrufe int,
  registrierung_klicks int,
  erstoeffnungen_ios int,
  erstoeffnungen_android int,
  registrierungen_eltern int,
  registrierungen_kinder int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
#variable_conflict use_column
DECLARE
  r text;
  schritt interval;
  ende timestamp;
  start timestamp;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur fuer Admins' USING ERRCODE = '42501';
  END IF;

  r := CASE p_raster WHEN 'tag' THEN 'day' WHEN 'woche' THEN 'week' WHEN 'monat' THEN 'month' END;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Raster muss tag, woche oder monat sein';
  END IF;
  schritt := ('1 ' || r)::interval;
  ende := date_trunc(r, now() AT TIME ZONE 'Europe/Berlin');
  start := ende - schritt * (greatest(1, least(p_anzahl, 400)) - 1);

  RETURN QUERY
  WITH perioden AS (
    SELECT generate_series(start, ende, schritt)::date AS p
  ),
  ev AS (
    SELECT date_trunc(r, e.created_at AT TIME ZONE 'Europe/Berlin')::date AS p, e.event_name, e.platform, e.anonymous_id
    FROM analytics_events e
    WHERE e.created_at >= (start AT TIME ZONE 'Europe/Berlin')
  ),
  web AS (
    SELECT ev.p,
      count(DISTINCT ev.anonymous_id) FILTER (WHERE ev.event_name = 'page_view')::int AS besucher,
      count(*) FILTER (WHERE ev.event_name = 'page_view')::int AS aufrufe,
      count(*) FILTER (WHERE ev.event_name = 'landing_cta_click')::int AS klicks
    FROM ev WHERE ev.platform = 'web'
    GROUP BY ev.p
  ),
  erste AS (
    SELECT e.platform, min(e.created_at) AS t
    FROM analytics_events e
    WHERE e.platform IN ('ios', 'android') AND e.anonymous_id IS NOT NULL
    GROUP BY e.anonymous_id, e.platform
  ),
  app AS (
    SELECT date_trunc(r, erste.t AT TIME ZONE 'Europe/Berlin')::date AS p,
      count(*) FILTER (WHERE erste.platform = 'ios')::int AS ios,
      count(*) FILTER (WHERE erste.platform = 'android')::int AS android
    FROM erste
    WHERE erste.t >= (start AT TIME ZONE 'Europe/Berlin')
    GROUP BY 1
  ),
  reg AS (
    SELECT date_trunc(r, pr.created_at AT TIME ZONE 'Europe/Berlin')::date AS p,
      count(*) FILTER (WHERE pr.role = 'parent')::int AS eltern,
      count(*) FILTER (WHERE pr.role = 'child')::int AS kinder
    FROM profiles pr
    WHERE pr.created_at >= (start AT TIME ZONE 'Europe/Berlin')
    GROUP BY 1
  )
  SELECT perioden.p,
    coalesce(web.besucher, 0), coalesce(web.aufrufe, 0), coalesce(web.klicks, 0),
    coalesce(app.ios, 0), coalesce(app.android, 0),
    coalesce(reg.eltern, 0), coalesce(reg.kinder, 0)
  FROM perioden
  LEFT JOIN web ON web.p = perioden.p
  LEFT JOIN app ON app.p = perioden.p
  LEFT JOIN reg ON reg.p = perioden.p
  ORDER BY perioden.p;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_marketing_kanaele(p_tage int)
RETURNS TABLE (
  kanal text,
  medium text,
  kampagne text,
  anzeige text,
  besucher int,
  seitenaufrufe int,
  demo_starts int,
  registrierung_klicks int,
  registrierung_begonnen int
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
  WITH web AS (
    SELECT e.*
    FROM analytics_events e
    WHERE e.platform = 'web'
      AND e.anonymous_id IS NOT NULL
      AND e.created_at >= now() - make_interval(days => greatest(1, least(p_tage, 730)))
  ),
  -- Erster Kontakt je Besucher: der frueheste Eintrag mit UTM-Quelle, sonst
  -- die frueheste fremde verweisende Seite.
  erster AS (
    SELECT DISTINCT ON (web.anonymous_id)
      web.anonymous_id, web.utm_source, web.utm_medium, web.utm_campaign, web.utm_content
    FROM web
    WHERE web.utm_source IS NOT NULL
    ORDER BY web.anonymous_id, web.created_at
  ),
  verweis AS (
    SELECT DISTINCT ON (web.anonymous_id)
      web.anonymous_id,
      regexp_replace(lower(substring(web.referrer FROM '^[a-z]+://([^/:?#]+)')), '^(www\.|m\.|l\.|lm\.)', '') AS host
    FROM web
    WHERE web.referrer IS NOT NULL AND web.referrer !~* '^[a-z]+://([a-z0-9-]+\.)*lernzeit\.app'
    ORDER BY web.anonymous_id, web.created_at
  ),
  bes AS (
    SELECT b.anonymous_id,
      coalesce(erster.utm_source, verweis.host, 'Direkt') AS kanal,
      coalesce(erster.utm_medium, CASE WHEN verweis.host IS NOT NULL THEN 'Verweis' END, '') AS medium,
      coalesce(erster.utm_campaign, '') AS kampagne,
      coalesce(erster.utm_content, '') AS anzeige
    FROM (SELECT DISTINCT web.anonymous_id FROM web) b
    LEFT JOIN erster ON erster.anonymous_id = b.anonymous_id
    LEFT JOIN verweis ON verweis.anonymous_id = b.anonymous_id
  ),
  taten AS (
    SELECT web.anonymous_id,
      count(*) FILTER (WHERE web.event_name = 'page_view') AS aufrufe,
      bool_or(web.event_name = 'demo_started') AS demo,
      bool_or(web.event_name = 'landing_cta_click') AS klick,
      bool_or(web.event_name = 'sign_up_started') AS begonnen
    FROM web GROUP BY web.anonymous_id
  )
  SELECT bes.kanal, bes.medium, bes.kampagne, bes.anzeige,
    count(*)::int,
    sum(taten.aufrufe)::int,
    count(*) FILTER (WHERE taten.demo)::int,
    count(*) FILTER (WHERE taten.klick)::int,
    count(*) FILTER (WHERE taten.begonnen)::int
  FROM bes JOIN taten ON taten.anonymous_id = bes.anonymous_id
  GROUP BY 1, 2, 3, 4
  ORDER BY 5 DESC;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_marketing_zeitreihe(text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_marketing_kanaele(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_marketing_zeitreihe(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_kanaele(int) TO authenticated;
