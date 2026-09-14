-- Zuordnung von Anzeigenklicks zu Anmeldungen.
--
-- Warum eine eigene Tabelle und nicht weitere Spalten in analytics_events:
-- Die Klick-Kennungen sind das einzige Datum im Projekt mit einer zugesagten
-- Loeschfrist (docs/datenschutz-entwurf.md, § 8a: 90 Tage ohne Anmeldung,
-- 13 Monate mit). Liegen sie an jedem einzelnen Ereignis, waere Loeschen ein
-- Massen-UPDATE ueber die gesamte Ereignishistorie und die Frist nicht
-- nachpruefbar. In einer eigenen Tabelle ist sie eine Spalte und ein DELETE.
--
-- analytics_events behaelt die utm_*-Felder: Die sind Kampagnenbezeichnungen,
-- keine Kennung einer Person, und tragen den eigenen Funnel-Bericht.
--
-- WICHTIG: Hier landet nie ein Kind. Die Zeile entsteht anonym beim Klick;
-- meldet sich anschliessend ein Kinderkonto an, wird sie geloescht
-- (forget_ad_attribution). Verknuepft wird ausschliesslich mit Elternkonten.
create table if not exists public.ad_attribution (
  id uuid primary key default gen_random_uuid(),

  -- Browser-Kennung aus localStorage, dieselbe wie in analytics_events.
  anonymous_id text not null,

  -- Google. gclid ist der Regelfall; gbraid und wbraid treten an seine Stelle,
  -- wenn auf iOS keine Einwilligung fuer geraeteuebergreifende Messung
  -- vorliegt. Ohne diese beiden fehlt genau der Teil der Klicks, der aus der
  -- Zielgruppe kommt — Eltern auf iPhones.
  gclid  text,
  gbraid text,
  wbraid text,

  -- Meta. fbclid kommt aus der Adresse, fbp und fbc sind die Cookies, die das
  -- Meta-Pixel setzt. Fuer die spaetere Conversions-API werden alle drei
  -- gebraucht, damit ein Ereignis nicht doppelt gezaehlt wird.
  fbclid text,
  fbp    text,
  fbc    text,

  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,

  referrer     text,
  landing_path text,

  created_at timestamptz not null default now(),

  -- Gesetzt, sobald sich aus diesem Klick ein Elternkonto ergeben hat.
  user_id      uuid references auth.users(id) on delete cascade,
  converted_at timestamptz,

  -- Gesetzt, sobald die Conversion an die Plattform gemeldet wurde. Verhindert
  -- Doppelmeldungen, wenn der Versand wiederholt laeuft.
  reported_at timestamptz,

  -- Die zugesagte Loeschfrist, als Wert statt als Absicht. Der Loeschauftrag
  -- unten muss dadurch nichts rechnen, und die Frist ist an der Zeile
  -- ablesbar.
  delete_after timestamptz not null default (now() + interval '90 days')
);

comment on table public.ad_attribution is
  'Anzeigenklicks und ihre Zuordnung zu Elternkonten. Nie Kinder. Loeschung nach delete_after, taeglich durch cron-Job ad-attribution-retention.';

create index if not exists ad_attribution_anonymous_id_idx on public.ad_attribution (anonymous_id);
create index if not exists ad_attribution_delete_after_idx on public.ad_attribution (delete_after);
create index if not exists ad_attribution_user_id_idx      on public.ad_attribution (user_id) where user_id is not null;
-- Fuer den Versand der Conversions: offene, bereits zugeordnete Zeilen.
create index if not exists ad_attribution_pending_idx
  on public.ad_attribution (converted_at) where converted_at is not null and reported_at is null;

alter table public.ad_attribution enable row level security;

-- Schreiben darf jeder Besucher, wie bei analytics_events. Aber nur anonym:
-- Eine Zeile mit user_id entsteht ausschliesslich ueber link_ad_attribution,
-- damit sich niemand einem fremden Konto zuordnen kann.
create policy "Anyone can insert ad attribution"
  on public.ad_attribution for insert
  to anon, authenticated
  with check (user_id is null and converted_at is null and reported_at is null);

-- Lesen darf nur die Administration. Der Versand der Conversions laeuft
-- spaeter mit dem Service-Role-Key und umgeht RLS ohnehin.
create policy "Admins can read ad attribution"
  on public.ad_attribution for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Verknuepft die juengste Zeile dieses Browsers mit dem ANGEMELDETEN Konto.
-- Das Konto kommt aus auth.uid() und nicht aus einem Parameter: So kann ein
-- Aufrufer nur sich selbst zuordnen, nie jemand anderen.
--
-- Kinderkonten werden abgewiesen. Das ist die zweite Sperre neben der in
-- src/lib/analytics.ts — eine im Browser, eine in der Datenbank. Wer die eine
-- umgeht, steht vor der anderen.
create or replace function public.link_ad_attribution(p_anonymous_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
begin
  if v_user is null or p_anonymous_id is null then
    return;
  end if;

  select role into v_role from public.profiles where id = v_user;

  -- Kein Elternkonto: nichts verknuepfen, stattdessen die Spur entfernen.
  if v_role is distinct from 'parent' then
    delete from public.ad_attribution
     where anonymous_id = p_anonymous_id and user_id is null;
    return;
  end if;

  update public.ad_attribution
     set user_id      = v_user,
         converted_at = now(),
         -- Ab der Anmeldung gilt die laengere Frist aus § 8a.
         delete_after = now() + interval '13 months'
   where id = (
     select id from public.ad_attribution
      where anonymous_id = p_anonymous_id
        and user_id is null
      order by created_at desc
      limit 1
   );
end;
$$;

-- Loescht die Spur dieses Browsers. Aufgerufen, sobald sich ein Kind
-- registriert, und nutzbar als Widerruf.
--
-- Bewusst ohne Nachweis, dass der Aufrufer zu dieser Kennung gehoert: Die
-- einzige moegliche Wirkung ist, Werbedaten zu LOESCHEN. Wer die Kennung
-- eines anderen erraet, richtet damit keinen Schaden an — er erzwingt
-- Datensparsamkeit.
create or replace function public.forget_ad_attribution(p_anonymous_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_anonymous_id is null then
    return;
  end if;
  delete from public.ad_attribution where anonymous_id = p_anonymous_id;
end;
$$;

revoke all on function public.link_ad_attribution(text) from public;
revoke all on function public.forget_ad_attribution(text) from public;
grant execute on function public.link_ad_attribution(text)   to authenticated;
grant execute on function public.forget_ad_attribution(text) to anon, authenticated;

-- Die zugesagte Loeschung. Ohne diesen Auftrag waere § 8a des Datenschutz-
-- Entwurfs eine Behauptung ueber etwas, das nicht stattfindet.
create or replace function public.purge_ad_attribution()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anzahl integer;
begin
  delete from public.ad_attribution where delete_after < now();
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;

revoke all on function public.purge_ad_attribution() from public;

select cron.schedule(
  'ad-attribution-retention',
  '30 3 * * *',
  $job$ select public.purge_ad_attribution(); $job$
);
