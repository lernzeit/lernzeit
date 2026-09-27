-- RevenueCat-Käufe auf den Server bringen.
--
-- Befund vom 27.09.2026: Käufe im App Store und bei Google Play kannte nur
-- RevenueCat. Die Premium-Sperren fragen den Server, und der kannte nur
-- Stripe. Eine Kundin mit Play-Store-Jahresabo sah „Premium aktiv" und kam
-- an keine Premium-Funktion. Die Edge Function `revenuecat-webhook` trägt
-- Store-Käufe jetzt in `subscriptions` ein.

-- Woher ein Abo stammt. NULL bei allen Zeilen von vor diesem Tag.
alter table public.subscriptions
  add column if not exists quelle text,
  add column if not exists store text,
  add column if not exists store_produkt text;

comment on column public.subscriptions.quelle is
  'revenuecat, wenn das Abo über App Store/Google Play läuft (gesetzt vom Webhook). NULL: Stripe oder lokale Testphase.';

-- Protokoll jedes Ereignisses — für Nachvollziehbarkeit und damit ein
-- doppelt geliefertes Ereignis nur einmal wirkt.
--
-- Bewusst NICHT die ganze Nutzlast: RevenueCat schickt u. a. Preis,
-- Länderkennung und Nutzerattribute mit. Gespeichert wird nur, was für den
-- Zugang und die Fehlersuche nötig ist.
create table if not exists public.revenuecat_events (
  id text primary key,
  typ text not null,
  user_id uuid,
  umgebung text,
  store text,
  produkt text,
  periode text,
  gekauft_am timestamptz,
  ablauf_am timestamptz,
  kuendigungsgrund text,
  ergebnis text,
  empfangen_am timestamptz not null default now()
);

create index if not exists idx_revenuecat_events_user on public.revenuecat_events (user_id, empfangen_am desc);

-- Nur der Webhook (service_role) liest und schreibt. Keine Policies =
-- kein Zugriff für anon und authenticated.
alter table public.revenuecat_events enable row level security;

comment on table public.revenuecat_events is
  'Eingang des RevenueCat-Webhooks, ein Eintrag je Ereignis. Nur service_role.';

-- Trichterbericht: Store-Käufe stehen jetzt ebenfalls in bezahlt_seit.
-- Das Ereignis subscription_purchased (channel revenuecat) wird deshalb
-- nicht mehr zusätzlich gezählt — sonst stünde jeder Store-Kauf doppelt da.
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
    -- Käufe am Kauftag, Stripe und Store gleichermaßen.
    (SELECT count(*) FROM public.subscriptions s
      WHERE s.bezahlt_seit::date = t.tag)
  FROM tage t
  ORDER BY t.tag DESC;
$$;

REVOKE ALL ON FUNCTION public.funnel_report(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.funnel_report(integer) TO service_role;
