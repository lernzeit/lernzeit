-- Kauftag fuer den Trichterbericht.
--
-- Befund vom 25.09.2026: Die Spalte „abos" in funnel_report zaehlte Zeilen
-- aus `subscriptions` am Tag ihrer ANLAGE und nur, solange sie heute noch
-- `active` sind. Die Zeile entsteht aber bei der Registrierung (Testphase);
-- der Kauf aendert sie spaeter nur. Ein Kauf erschien darum nie am Tag des
-- Kaufs, und nach einer Kuendigung verschwand er ganz. Nachgewiesen am
-- Testkonto des Betreibers: Stripe-Abo seit 18.09.2026, Bericht am 18.09.: 0.
--
-- Ausserdem fehlten Kaeufe in der iOS-App voellig: RevenueCat schreibt nicht
-- in `subscriptions`, einzige Spur ist das Ereignis `subscription_purchased`.
--
-- bezahlt_seit setzt check-subscription (_shared/stripe-abo.ts) aus dem
-- Stripe-Abo. Es wird nie zurueckgesetzt: Ein Kauf bleibt ein Kauf.

alter table public.subscriptions
  add column if not exists bezahlt_seit timestamptz;

comment on column public.subscriptions.bezahlt_seit is
  'Stripe: Tag des Kaufs (Beginn der Bezahlung). Bleibt nach Kuendigung stehen. Quelle fuer funnel_report.abos.';

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
    -- Kaeufe am Kauftag: Stripe aus der Tabelle (bezahlt_seit), iOS/Android
    -- aus dem Ereignis — fuer RevenueCat gibt es keine Tabelle. Das
    -- Stripe-Ereignis wird NICHT gezaehlt, sonst doppelt.
    (SELECT count(*) FROM public.subscriptions s
      WHERE s.bezahlt_seit::date = t.tag)
    + (SELECT count(DISTINCT coalesce(e.user_id::text, e.anonymous_id))
         FROM public.analytics_events e
        WHERE e.event_name = 'subscription_purchased'
          AND e.properties->>'channel' = 'revenuecat'
          AND e.created_at::date = t.tag)
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
