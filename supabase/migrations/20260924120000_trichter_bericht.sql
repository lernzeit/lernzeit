-- Der Trichterbericht: eine Zeile je Tag, eine Spalte je Stufe.
--
-- Zweck: Waehrend eines Werbetests taeglich ablesen koennen, wie viele Leute
-- ankommen und an welcher Stelle sie aufhoeren. Ohne diesen Bericht endet der
-- Test mit einer Gesamtzahl und ohne Erklaerung.
--
-- ── Warum Tabellen und nicht Ereignisse ──────────────────────────────────
--
-- Wo es eine belastbare Tabelle gibt, wird sie gezaehlt und nicht das
-- dazugehoerige Ereignis aus `analytics_events`. Grund ist ein Befund vom
-- 24.09.2026: Seit Messbeginn am 18.08.2026 sind 16 Konten entstanden, aber
-- `sign_up_completed` steht null Mal im Protokoll. Ein Ereignis, das im
-- Browser abgeschickt wird, kann verloren gehen — eine Zeile in `profiles`
-- nicht.
--
-- Ereignisse werden nur dort benutzt, wo es gar keine Tabelle gibt: Besuche
-- der Zielseite, geoeffnetes Registrierungsformular, gesehene Bezahlschranke,
-- begonnener Bezahlvorgang.
--
-- ── Was der Bericht NICHT ist ────────────────────────────────────────────
--
-- Solange die einzigen Konten Testkonten des Betreibers sind, beschreibt
-- jede Zeile hier das Verhalten des Betreibers. Aussagekraft bekommt der
-- Bericht erst mit fremdem Zulauf. Siehe docs/verkaufstest.md, Abschnitt 2.1.

CREATE OR REPLACE FUNCTION public.funnel_report(p_tage integer DEFAULT 14)
RETURNS TABLE (
  tag date,
  besucher_zielseite bigint,
  formular_geoeffnet bigint,
  elternkonten bigint,
  einladungscodes bigint,
  kinder_verknuepft bigint,
  erste_lernsitzung bigint,
  bezahlschranke bigint,
  bezahlvorgang bigint,
  abos bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH tage AS (
    SELECT generate_series(
             (current_date - (greatest(p_tage, 1) - 1)),
             current_date,
             interval '1 day'
           )::date AS tag
  ),
  -- Erste Lernsitzung je Kind: nur der Tag, an dem es ZUM ERSTEN MAL gelernt
  -- hat. Sonst zaehlt ein fleissiges Kind jeden Tag erneut als Aktivierung.
  erstsitzung AS (
    SELECT user_id, min(created_at)::date AS tag
      FROM public.game_sessions
     GROUP BY user_id
  )
  SELECT
    t.tag,
    (SELECT count(DISTINCT coalesce(e.anonymous_id, e.user_id::text))
       FROM public.analytics_events e
      WHERE e.event_name = 'page_view'
        AND e.page_path LIKE '/start%'
        AND e.created_at::date = t.tag),
    (SELECT count(*) FROM public.analytics_events e
      WHERE e.event_name = 'sign_up_started' AND e.created_at::date = t.tag),
    (SELECT count(*) FROM public.profiles p
      WHERE p.role = 'parent' AND p.created_at::date = t.tag),
    (SELECT count(*) FROM public.invitation_codes c
      WHERE c.created_at::date = t.tag),
    (SELECT count(*) FROM public.parent_child_relationships r
      WHERE r.created_at::date = t.tag),
    (SELECT count(*) FROM erstsitzung s WHERE s.tag = t.tag),
    (SELECT count(*) FROM public.analytics_events e
      WHERE e.event_name = 'trial_ended_paywall_seen' AND e.created_at::date = t.tag),
    (SELECT count(*) FROM public.analytics_events e
      WHERE e.event_name = 'checkout_started' AND e.created_at::date = t.tag),
    (SELECT count(*) FROM public.subscriptions s
      WHERE s.status = 'active' AND s.created_at::date = t.tag)
  FROM tage t
  ORDER BY t.tag DESC;
$$;

COMMENT ON FUNCTION public.funnel_report(integer) IS
  'Eine Zeile je Tag mit allen Stufen des Trichters. Zaehlt Tabellen, wo es '
  'welche gibt, und Ereignisse nur dort, wo keine Tabelle existiert. '
  'Gedacht fuer den Werbetest aus docs/verkaufstest.md.';

-- Nur der Betreiber liest das, nicht die App. Deshalb kein Recht fuer anon
-- oder authenticated: Der Bericht zaehlt ueber alle Konten hinweg und ginge
-- sonst jeden an, der ein Konto hat.
REVOKE ALL ON FUNCTION public.funnel_report(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.funnel_report(integer) TO service_role;
