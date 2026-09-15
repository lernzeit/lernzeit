-- Trichter-Bericht und Ausgabenrahmen fuer die bezahlte Werbung.
--
-- Zweck: Die Zielwerte Z4 bis Z7 aus docs/positionierung.md sind bisher
-- Absichten ohne Messung. Ohne diese Sichten liesse sich hinterher nur die
-- Zahl nachschlagen, die Google selbst meldet — und die zaehlt nach eigenen
-- Regeln, kennt die Verknuepfung mit dem Kind nicht und die erste Lernsitzung
-- schon gar nicht. Gemessen wird deshalb an den eigenen Daten.
--
-- Alle Sichten lesen ausschliesslich Elternkonten. Kinder kommen nur als
-- ANZAHL vor (hat dieses Elternteil ein Kind verknuepft, hat dieses Kind
-- gelernt), nie als Datensatz.

-- Eine Zeile je Elternkonto, das aus einer Anzeige stammt. Das ist der
-- Trichter, einmal ausgerollt.
create or replace view public.ads_funnel as
select
  a.id                                   as attribution_id,
  a.user_id,
  a.created_at                           as klick_am,
  a.converted_at                         as angemeldet_am,
  coalesce(a.utm_campaign, '(ohne Kampagne)') as kampagne,
  coalesce(a.utm_source,   '(ohne Quelle)')   as quelle,
  case
    when a.gclid  is not null then 'google/gclid'
    when a.gbraid is not null then 'google/gbraid'
    when a.wbraid is not null then 'google/wbraid'
    when a.fbclid is not null then 'meta/fbclid'
    else '(unbekannt)'
  end                                    as plattform,
  -- Z5: Hat dieses Elternteil mindestens ein Kind verknuepft?
  exists (
    select 1 from public.parent_child_relationships r
     where r.parent_id = a.user_id
  )                                      as kind_verknuepft,
  -- Z6: Hat eines dieser Kinder in der ersten Woche nach der Anmeldung
  -- gelernt? Die Woche zaehlt ab der Anmeldung, nicht ab dem Klick.
  exists (
    select 1
      from public.parent_child_relationships r
      join public.game_sessions g on g.user_id = r.child_id
     where r.parent_id = a.user_id
       -- Beide Grenzen. Ohne die untere zaehlte jede Lernsitzung mit, auch
       -- eine von lange vor der Anmeldung — bei einem Konto, das vorher schon
       -- bestand, waere Z6 damit still zu hoch ausgefallen. Im Probelauf
       -- sichtbar geworden: 1 statt 0.
       and g.created_at >= a.converted_at
       and g.created_at <= a.converted_at + interval '7 days'
  )                                      as gelernt_in_woche_1,
  -- Z7: zahlendes Abo.
  exists (
    select 1 from public.subscriptions s
     where s.user_id = a.user_id and s.status = 'active'
  )                                      as zahlt
from public.ad_attribution a
where a.user_id is not null;

comment on view public.ads_funnel is
  'Ein Elternkonto je Zeile, das aus einer Anzeige kam. Grundlage von ads_funnel_summary.';

-- Der Bericht, wie er sich im Supabase-Dashboard lesen laesst: eine Zeile je
-- Kampagne, die Stufen als Zahlen nebeneinander.
create or replace view public.ads_funnel_summary as
select
  kampagne,
  plattform,
  count(*)                                              as anmeldungen,
  count(*) filter (where kind_verknuepft)               as mit_kind,
  count(*) filter (where gelernt_in_woche_1)            as gelernt_woche_1,
  count(*) filter (where zahlt)                         as zahlende_abos,
  min(angemeldet_am)::date                              as erste_anmeldung,
  max(angemeldet_am)::date                              as letzte_anmeldung
from public.ads_funnel
group by kampagne, plattform
order by anmeldungen desc;

comment on view public.ads_funnel_summary is
  'Trichter je Kampagne: Anmeldung -> Kind verknuepft -> erste Lernsitzung -> Abo. Entspricht Z4 bis Z7 in docs/positionierung.md.';

-- Klicks, die noch zu nichts gefuehrt haben. Der Unterschied zwischen dieser
-- Zahl und den Anmeldungen ist Z4 — und die Stelle, an der ein undichter
-- Trichter zuerst sichtbar wird.
create or replace view public.ads_klicks_offen as
select
  coalesce(utm_campaign, '(ohne Kampagne)') as kampagne,
  count(*)                                  as klicks_ohne_anmeldung,
  min(created_at)::date                     as aeltester_klick
from public.ad_attribution
where user_id is null
group by 1
order by klicks_ohne_anmeldung desc;

-- Sichten erben keine RLS von ihren Tabellen. security_invoker sorgt dafuer,
-- dass die Regeln der Basistabellen mit den Rechten des LESENDEN greifen —
-- ohne das waere ads_funnel ein Weg, ad_attribution an der eigenen
-- Zugriffsregel vorbei zu lesen.
alter view public.ads_funnel            set (security_invoker = on);
alter view public.ads_funnel_summary    set (security_invoker = on);
alter view public.ads_klicks_offen      set (security_invoker = on);

-- ------------------------------------------------------------------------
-- Ausgabenrahmen
-- ------------------------------------------------------------------------
--
-- Ehrlich zum Umfang: Das hier stoppt kein Geld. Ausgegeben wird bei Google,
-- und nur das Google-Ads-Konto kann Kampagnen anhalten. Was diese Tabelle
-- kann, ist die zweite Haelfte des Notaus — die Werbe-Tags auf lernzeit.app
-- abschalten, ohne ein neues Build. Der Ablauf steht in
-- docs/werbung-notaus.md.
create table if not exists public.ad_settings (
  id             boolean primary key default true check (id),
  tags_enabled   boolean not null default false,
  monthly_cap_eur numeric(8,2) not null default 250.00,
  note           text,
  updated_at     timestamptz not null default now()
);

comment on table public.ad_settings is
  'Ein Schalter fuer die Werbe-Tags auf der Website und der vereinbarte Monatsdeckel. Genau eine Zeile (id = true).';

insert into public.ad_settings (id, tags_enabled, monthly_cap_eur, note)
values (true, false, 250.00, 'Aus, bis Einwilligungsbanner und Datenschutzerklaerung stehen.')
on conflict (id) do nothing;

alter table public.ad_settings enable row level security;

-- Lesen darf jeder: Die Website muss vor dem Laden eines Tags wissen, ob sie
-- darf. Die Zeile enthaelt keine personenbezogenen Daten.
create policy "Anyone can read ad settings"
  on public.ad_settings for select
  to anon, authenticated
  using (true);

-- Aendern nur die Administration.
create policy "Admins can update ad settings"
  on public.ad_settings for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
