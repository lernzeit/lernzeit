-- Adventskalender mit gemischten Überraschungen (Wunsch des Betreibers, 01.11.2026)
--
-- Hinter den 24 Türchen stecken nicht mehr nur Sticker, sondern gemischt:
--   10 × Weihnachts-Sticker, 5 × Weihnachts-Figur (6. Nikolaus, 24. Heiligabend),
--    6 × Tinte (zusammen 300), 3 × 5 Frei-Minuten (zusammen 15, nie mehr als 5 je Türchen).
-- Der Plan ist für alle Kinder gleich (wie vorher), steht hier und in
-- src/lib/weihnachten.ts (ADVENT_PLAN, npm run test:reise vergleicht beide).
-- Frei-Minuten zählen am Tag des Öffnens zur verdienten Zeit (wie früher der
-- Reise-Bonus): Das Kind fragt sie an, die Eltern genehmigen wie immer.
-- Hat ein Kind die Figur schon (z. B. mit Tinte gekauft), gibt es 50 Tinte.

alter table public.advent_tueren add column if not exists art text;
alter table public.advent_tueren add column if not exists menge integer;
alter table public.advent_tueren alter column sticker drop not null;
update public.advent_tueren set art = 'sticker' where art is null;
alter table public.advent_tueren alter column art set default 'sticker';
alter table public.advent_tueren alter column art set not null;

alter table public.kind_tinte drop constraint if exists kind_tinte_grund_check;
alter table public.kind_tinte add constraint kind_tinte_grund_check
  check (grund = any (array['runde', 'alles_richtig', 'berichtigung', 'seite', 'bunte_seite', 'kauf', 'advent']));

-- Was hinter einem Türchen steckt: art (sticker | avatar | tinte | minuten), ding, menge
create or replace function public.advent_ueberraschung(p_tuer integer)
returns table (art text, ding text, menge integer)
language sql
immutable
set search_path = public
as $$
  select x.art, x.ding, x.menge from (values
    ( 1, 'sticker', 'schneeflocke',   null::integer),
    ( 2, 'tinte',   null,             30),
    ( 3, 'sticker', 'plaetzchen',     null),
    ( 4, 'minuten', null,             5),
    ( 5, 'sticker', 'kerze',          null),
    ( 6, 'avatar',  'weihnachtsmann', null),
    ( 7, 'tinte',   null,             40),
    ( 8, 'sticker', 'socke',          null),
    ( 9, 'avatar',  'rentier',        null),
    (10, 'sticker', 'glocke',         null),
    (11, 'minuten', null,             5),
    (12, 'tinte',   null,             50),
    (13, 'sticker', 'schleife',       null),
    (14, 'avatar',  'schneemann',     null),
    (15, 'tinte',   null,             40),
    (16, 'sticker', 'bonbon',         null),
    (17, 'minuten', null,             5),
    (18, 'sticker', 'engel',          null),
    (19, 'tinte',   null,             60),
    (20, 'avatar',  'elf',            null),
    (21, 'sticker', 'schlitten',      null),
    (22, 'tinte',   null,             80),
    (23, 'sticker', 'weihnachtsbaum', null),
    (24, 'avatar',  'tannenbaum',     null)
  ) as x(tuer, art, ding, menge)
  where x.tuer = p_tuer;
$$;

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
  v_u record;
  v_art text;
  v_ding text;
  v_menge integer;
  v_ersatz boolean := false;
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

  select art, sticker, avatar, menge into v_tuer from public.advent_tueren
   where child_id = p_kind and jahr = v_jahr and tag = p_tag;
  if found then
    return jsonb_build_object('ok', true, 'offen', true, 'schon', true, 'tag', p_tag, 'art', v_tuer.art,
                              'sticker', v_tuer.sticker, 'avatar', v_tuer.avatar, 'menge', v_tuer.menge);
  end if;

  if p_gesamt is distinct from 5 or p_richtig is null or p_richtig not between 0 and 5 then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  if p_richtig < 4 then
    return jsonb_build_object('ok', true, 'offen', false, 'tag', p_tag, 'richtig', p_richtig);
  end if;

  select * into v_u from public.advent_ueberraschung(p_tag);
  v_art := v_u.art; v_ding := v_u.ding; v_menge := v_u.menge;

  -- Figur schon im Federmäppchen: Tinte statt doppelter Figur
  if v_art = 'avatar' and exists (select 1 from public.kind_freigeschaltet
       where child_id = p_kind and art = 'avatar' and ding = v_ding) then
    v_art := 'tinte'; v_menge := 50; v_ersatz := true;
  end if;

  insert into public.advent_tueren (child_id, jahr, tag, art, sticker, avatar, menge)
  values (p_kind, v_jahr, p_tag, v_art,
          case when v_art = 'sticker' then v_ding end,
          case when v_art = 'avatar' then v_ding end,
          case when v_art in ('tinte', 'minuten') then v_menge end)
  on conflict do nothing;
  if not found then
    -- gleichzeitig schon geöffnet (zweites Gerät): nichts doppelt vergeben
    return jsonb_build_object('ok', true, 'offen', true, 'schon', true, 'tag', p_tag);
  end if;

  if v_art = 'avatar' then
    insert into public.kind_freigeschaltet (child_id, art, ding) values (p_kind, 'avatar', v_ding)
    on conflict do nothing;
  elsif v_art = 'tinte' then
    insert into public.kind_tinte (child_id, menge, grund, bezug)
    values (p_kind, v_menge, 'advent', v_jahr || '-' || p_tag);
  end if;

  return jsonb_build_object('ok', true, 'offen', true, 'schon', false, 'tag', p_tag, 'richtig', p_richtig,
                            'art', v_art,
                            'sticker', case when v_art = 'sticker' then v_ding end,
                            'avatar', case when v_art = 'avatar' then v_ding end,
                            'menge', case when v_art in ('tinte', 'minuten') then v_menge end,
                            'ersatz', v_ersatz);
end;
$$;
revoke execute on function public.advent_runde_werten(uuid, integer, integer, integer, date)
  from public, anon, authenticated;
