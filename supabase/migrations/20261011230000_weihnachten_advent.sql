-- Weihnachtszeit und Adventskalender (11.10.2026)
--
-- Weihnachtszeit: jedes Jahr 1. bis 26. Dezember (Berliner Zeit).
-- Nur dann lassen sich die Weihnachts-Figuren mit Tinte freischalten und die
-- Weihnachts-Sticker nach einer Runde mit allen Aufgaben richtig aussuchen.
-- Was ein Kind schon hat, bleibt.
--
-- Adventskalender: je Tuerchen 5 Aufgaben aus zufaelligen Faechern. Ab 4
-- richtigen geht das Tuerchen auf und schenkt einen Weihnachts-Sticker
-- (Tuerchen 6 und 24 zusaetzlich eine Figur). Sonst gibt es fuer diese
-- Aufgaben nichts: keine Zeit, keine Tinte, keine Reise, keine Erfolge, keinen
-- Streak. Deshalb steht eine Kalender-Runde nicht in game_sessions, sondern
-- nur das geoeffnete Tuerchen in advent_tueren. Tuerchen bis zum heutigen
-- Datum; verpasste lassen sich bis 26. Dezember nachholen. Ab 27.12. ist alles
-- Weihnachtliche weg; was ein Kind sich geholt hat, bleibt.
-- Regeln auch in src/lib/weihnachten.ts (npm run test:reise prueft beide).

-- 1. Kalender
create or replace function public.heute_berlin()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Europe/Berlin')::date;
$$;

create or replace function public.ist_weihnachtszeit(p_tag date)
returns boolean
language sql
immutable
set search_path = public
as $$
  select extract(month from p_tag) = 12 and extract(day from p_tag) <= 26;
$$;

-- Hoechstes Tuerchen, das an diesem Tag offen sein darf (0 = kein Kalender)
create or replace function public.advent_offen_bis(p_tag date)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when extract(month from p_tag) = 12 and extract(day from p_tag) <= 26
      then least(extract(day from p_tag)::integer, 24)
    else 0
  end;
$$;

-- Jahr des Kalenders: im Januar der Kalender vom Dezember davor
create or replace function public.advent_jahr(p_tag date)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when extract(month from p_tag) = 1 then extract(year from p_tag)::integer - 1
              else extract(year from p_tag)::integer end;
$$;

-- Sticker hinter einem Tuerchen (Reihenfolge wie WEIHNACHTS_STICKER in src/lib/hefte.ts)
create or replace function public.advent_sticker(p_tuer integer)
returns text
language sql
immutable
set search_path = public
as $$
  select (array['schneeflocke', 'plaetzchen', 'kerze', 'socke', 'glocke', 'weihnachtsmann',
                'rentier', 'schleife', 'bonbon', 'engel', 'schlitten', 'weihnachtsbaum'])
         [1 + ((p_tuer - 1) % 12)];
$$;

-- Figur hinter einem Tuerchen (Nikolaus und Heiligabend)
create or replace function public.advent_avatar(p_tuer integer)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_tuer when 6 then 'weihnachtsmann' when 24 then 'tannenbaum' else null end;
$$;

-- 2. Figuren: Preise (muss zu src/lib/federmaeppchen.ts passen) und Saison
create or replace function public.avatar_preis(p_avatar text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_avatar
    when 'cat' then 0 when 'dog' then 0 when 'bear' then 0 when 'fox' then 0
    when 'rabbit' then 0 when 'panda' then 0 when 'happy' then 0 when 'smart' then 0
    when 'lion' then 40 when 'monkey' then 40
    when 'star' then 50 when 'sun' then 50 when 'flower' then 50 when 'tree' then 50 when 'wink' then 50
    when 'cool' then 60 when 'moon' then 60
    when 'star_eyes' then 70 when 'angel' then 70
    when 'robot' then 80 when 'rainbow' then 80
    when 'pirate' then 90 when 'unicorn' then 100
    when 'wizard' then 120 when 'superhero' then 120
    when 'crown' then 150
    -- Weihnachten
    when 'rentier' then 40 when 'schneemann' then 40 when 'elf' then 50
    when 'weihnachtsmann' then 60 when 'tannenbaum' then 60
    else null
  end;
$$;

create or replace function public.avatar_saison(p_avatar text)
returns text
language sql
immutable
set search_path = public
as $$
  select case when p_avatar in ('weihnachtsmann', 'rentier', 'schneemann', 'elf', 'tannenbaum')
              then 'weihnachten' end;
$$;

create or replace function public.mit_tinte_freischalten(p_art text, p_ding text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind uuid := auth.uid();
  v_preis integer;
  v_stand integer;
begin
  if v_kind is null then
    return jsonb_build_object('ok', false, 'grund', 'anmelden');
  end if;
  if p_art is distinct from 'avatar' then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  v_preis := public.avatar_preis(p_ding);
  if v_preis is null then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  if not exists (select 1 from public.profiles where id = v_kind and role = 'child') then
    return jsonb_build_object('ok', false, 'grund', 'nur_kinder');
  end if;

  perform pg_advisory_xact_lock(hashtext('tinte:' || v_kind::text));
  select coalesce(sum(menge), 0) into v_stand from public.kind_tinte where child_id = v_kind;

  if v_preis = 0 or exists (select 1 from public.kind_freigeschaltet
                             where child_id = v_kind and art = p_art and ding = p_ding) then
    return jsonb_build_object('ok', true, 'stand', v_stand);
  end if;
  if public.avatar_saison(p_ding) = 'weihnachten' and not public.ist_weihnachtszeit(public.heute_berlin()) then
    return jsonb_build_object('ok', false, 'grund', 'saison', 'stand', v_stand);
  end if;
  if v_stand < v_preis then
    return jsonb_build_object('ok', false, 'grund', 'zu_wenig', 'stand', v_stand, 'preis', v_preis);
  end if;

  insert into public.kind_freigeschaltet (child_id, art, ding) values (v_kind, p_art, p_ding);
  insert into public.kind_tinte (child_id, menge, grund, bezug) values (v_kind, -v_preis, 'kauf', p_art || ':' || p_ding);
  return jsonb_build_object('ok', true, 'stand', v_stand - v_preis);
end;
$$;
revoke execute on function public.mit_tinte_freischalten(text, text) from public, anon;
grant execute on function public.mit_tinte_freischalten(text, text) to authenticated;

-- 3. Sticker aussuchen: Weihnachts-Sticker nur in der Weihnachtszeit
-- Katalog muss mit STICKER in src/lib/hefte.ts uebereinstimmen.
create or replace function public.sticker_waehlen(p_sticker text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_kind uuid := auth.uid();
  v_sitzung uuid;
  v_katalog text[] := array['fuchs','panda','einhorn','schildkroete','krake','eule','biene','schmetterling','regenbogen','stern','rakete','ballon','erdbeere','pizza','gitarre','fussball','pokal','diamant','sonnenblume','kleeblatt','delfin','dino','farben','puzzle','katze','hund','hase','loewe','tiger','koala','pinguin','frosch','elefant','giraffe','igel','krabbe','wal','marienkaefer','baer','schwein','drache','eis','donut','wassermelone','kuchen','sonne','mond','krone','roboter','ufo','basketball','fahrrad','pilz','kaktus','geschenk','schneemann'];
  v_weihnachten text[] := array['schneeflocke','plaetzchen','kerze','socke','glocke','weihnachtsmann','rentier','schleife','bonbon','engel','schlitten','weihnachtsbaum'];
begin
  if v_kind is null or p_sticker is null then
    return null;
  end if;
  if not (p_sticker = any (v_katalog))
     and not (p_sticker = any (v_weihnachten) and public.ist_weihnachtszeit(public.heute_berlin())) then
    return null;
  end if;

  v_sitzung := public.sticker_sitzung();
  if v_sitzung is null then
    return null;
  end if;

  insert into public.kind_sticker (child_id, sticker, quelle, sitzung_id)
  values (v_kind, p_sticker, 'alles_richtig', v_sitzung)
  on conflict do nothing;

  if not found then
    return null;
  end if;
  return p_sticker;
end;
$fn$;
revoke all on function public.sticker_waehlen(text) from public, anon;
grant execute on function public.sticker_waehlen(text) to authenticated;

-- 4. Adventskalender: nur geoeffnete Tuerchen (keine Versuche, keine Aufgaben)
create table if not exists public.advent_tueren (
  child_id uuid not null references auth.users(id) on delete cascade,
  jahr smallint not null,
  tag smallint not null check (tag between 1 and 24),
  sticker text not null,
  avatar text,
  geoeffnet_am timestamptz not null default now(),
  primary key (child_id, jahr, tag)
);
alter table public.advent_tueren enable row level security;
create policy advent_tueren_lesen on public.advent_tueren for select using (
  auth.uid() = child_id
  or exists (select 1 from public.parent_child_relationships p
              where p.parent_id = auth.uid() and p.child_id = advent_tueren.child_id)
);

-- Pruefen und oeffnen; p_heute nur fuer Tests (intern, nicht aufrufbar)
create or replace function public.advent_runde_werten(p_kind uuid, p_tag integer, p_richtig integer,
                                                      p_gesamt integer, p_heute date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jahr integer := public.advent_jahr(p_heute);
  v_tuer record;
  v_sticker text;
  v_avatar text;
begin
  if p_kind is null or p_tag is null or p_tag not between 1 and 24 then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  if not exists (select 1 from public.profiles where id = p_kind and role = 'child') then
    return jsonb_build_object('ok', false, 'grund', 'nur_kinder');
  end if;
  if p_tag > public.advent_offen_bis(p_heute) then
    return jsonb_build_object('ok', false, 'grund', 'noch_zu');
  end if;

  select sticker, avatar into v_tuer from public.advent_tueren
   where child_id = p_kind and jahr = v_jahr and tag = p_tag;
  if found then
    return jsonb_build_object('ok', true, 'offen', true, 'schon', true, 'tag', p_tag,
                              'sticker', v_tuer.sticker, 'avatar', v_tuer.avatar);
  end if;

  if p_gesamt is distinct from 5 or p_richtig is null or p_richtig not between 0 and 5 then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  if p_richtig < 4 then
    return jsonb_build_object('ok', true, 'offen', false, 'tag', p_tag, 'richtig', p_richtig);
  end if;

  v_sticker := public.advent_sticker(p_tag);
  v_avatar := public.advent_avatar(p_tag);
  insert into public.advent_tueren (child_id, jahr, tag, sticker, avatar)
  values (p_kind, v_jahr, p_tag, v_sticker, v_avatar)
  on conflict do nothing;
  if v_avatar is not null then
    insert into public.kind_freigeschaltet (child_id, art, ding) values (p_kind, 'avatar', v_avatar)
    on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true, 'offen', true, 'schon', false, 'tag', p_tag, 'richtig', p_richtig,
                            'sticker', v_sticker, 'avatar', v_avatar);
end;
$$;
revoke execute on function public.advent_runde_werten(uuid, integer, integer, integer, date)
  from public, anon, authenticated;

create or replace function public.advent_runde(p_tag integer, p_richtig integer, p_gesamt integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'grund', 'anmelden');
  end if;
  return public.advent_runde_werten(auth.uid(), p_tag, p_richtig, p_gesamt, public.heute_berlin());
end;
$$;
revoke execute on function public.advent_runde(integer, integer, integer) from public, anon;
grant execute on function public.advent_runde(integer, integer, integer) to authenticated;
