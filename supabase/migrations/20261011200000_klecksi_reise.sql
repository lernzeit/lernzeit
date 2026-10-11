-- Klecksi und die Heftrand-Reise (11.10.2026), Plan: docs/plan-motivation-kinder.md
--
-- Tinte (Spielgeld, nie Bildschirmzeit), Felder und Seiten der Reise,
-- Figuren gegen Tinte. Vergeben wird nur hier nach einer gespeicherten Runde
-- (runde_belohnen); das Kind kann keine dieser Zeilen selbst schreiben.
-- Nacht-Erfolge: siehe 20261011201000_nacht_erfolge_entfernen.sql.

-- 1. Tinte: Buchungen (positiv verdient, negativ ausgegeben)
create table if not exists public.kind_tinte (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  menge integer not null,
  grund text not null check (grund in ('runde', 'alles_richtig', 'berichtigung', 'seite', 'bunte_seite', 'kauf')),
  sitzung_id uuid,
  bezug text,
  created_at timestamptz not null default now()
);
create index if not exists kind_tinte_kind_idx on public.kind_tinte (child_id, created_at desc);
alter table public.kind_tinte enable row level security;
create policy kind_tinte_lesen on public.kind_tinte for select using (auth.uid() = child_id);

-- 2. Reise: 12 Felder je Seite, Fach = Heftfarbe
create table if not exists public.kind_reise_felder (
  child_id uuid not null references auth.users(id) on delete cascade,
  seite integer not null check (seite >= 1),
  feld smallint not null check (feld between 1 and 12),
  fach text not null,
  quelle text not null check (quelle in ('runde', 'lernplan', 'schwerpunkt', 'berichtigung')),
  sitzung_id uuid,
  created_at timestamptz not null default now(),
  primary key (child_id, seite, feld)
);
alter table public.kind_reise_felder enable row level security;
create policy kind_reise_felder_lesen on public.kind_reise_felder for select using (
  auth.uid() = child_id
  or exists (select 1 from public.parent_child_relationships p
              where p.parent_id = auth.uid() and p.child_id = kind_reise_felder.child_id)
);

create table if not exists public.kind_reise_seiten (
  child_id uuid not null references auth.users(id) on delete cascade,
  seite integer not null,
  faltung text not null,
  bunt boolean not null default false,
  bonus_minuten integer not null default 0,
  fertig_am timestamptz not null default now(),
  primary key (child_id, seite)
);
alter table public.kind_reise_seiten enable row level security;
create policy kind_reise_seiten_lesen on public.kind_reise_seiten for select using (
  auth.uid() = child_id
  or exists (select 1 from public.parent_child_relationships p
              where p.parent_id = auth.uid() and p.child_id = kind_reise_seiten.child_id)
);

-- Ergebnis je Runde: genau eine Belohnung, ein zweiter Aufruf liefert dieselbe
create table if not exists public.kind_runden_belohnung (
  sitzung_id uuid primary key references public.game_sessions(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  ergebnis jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.kind_runden_belohnung enable row level security;
create policy kind_runden_belohnung_lesen on public.kind_runden_belohnung for select using (auth.uid() = child_id);

-- 3. Figuren gegen Tinte
create table if not exists public.kind_freigeschaltet (
  child_id uuid not null references auth.users(id) on delete cascade,
  art text not null check (art in ('avatar')),
  ding text not null,
  created_at timestamptz not null default now(),
  primary key (child_id, art, ding)
);
alter table public.kind_freigeschaltet enable row level security;
create policy kind_freigeschaltet_lesen on public.kind_freigeschaltet for select using (auth.uid() = child_id);

-- 4. Eltern-Bonus: Extra-Minuten je fertiger Reise-Seite (0 = aus)
alter table public.child_settings
  add column if not exists reise_bonus_minuten smallint not null default 0
  check (reise_bonus_minuten between 0 and 30);

-- Preise der Figuren (muss zu src/lib/federmaeppchen.ts passen). null = unbekannt.
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
    else null
  end;
$$;

-- Bereits gewaehlte Figuren bleiben: als freigeschaltet eintragen
insert into public.kind_freigeschaltet (child_id, art, ding)
select p.id, 'avatar', p.avatar_id
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role = 'child' and coalesce(public.avatar_preis(p.avatar_id), 0) > 0
on conflict do nothing;

-- Ein Kind kann nur freie oder freigeschaltete Figuren waehlen
create or replace function public.avatar_pruefen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.avatar_id is distinct from old.avatar_id
     and new.role = 'child'
     and auth.uid() = new.id
     and coalesce(public.avatar_preis(new.avatar_id), 0) > 0
     and not exists (select 1 from public.kind_freigeschaltet
                      where child_id = new.id and art = 'avatar' and ding = new.avatar_id) then
    raise exception 'Figur noch nicht freigeschaltet' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.avatar_pruefen() from public, anon, authenticated;
create trigger avatar_pruefen before update of avatar_id on public.profiles
  for each row execute function public.avatar_pruefen();

-- Stand der Tinte (eigene Buchungen, RLS)
create or replace function public.tinte_stand()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(menge), 0)::integer from public.kind_tinte where child_id = auth.uid();
$$;
revoke execute on function public.tinte_stand() from public, anon;
grant execute on function public.tinte_stand() to authenticated;

-- Figur mit Tinte freischalten
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

-- Belohnung einer gespeicherten Runde: Tinte, Felder der Reise, fertige Seite.
-- Regeln (auch in src/lib/reise.ts beschrieben):
--   Tinte: 1 je richtige Aufgabe (Berichtigung 2), alles richtig +5,
--          Seite fertig +30, bunte Seite (3 Faecher) +20
--   Feld:  ab 60 % richtig; Lernplan oder Schwerpunkt-Fach zwei Felder;
--          hoechstens 24 Felder am Tag
create or replace function public.runde_belohnen(p_sitzung uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind uuid := auth.uid();
  s record;
  v_vorhanden jsonb;
  v_tinte integer := 0;
  v_richtig integer;
  v_geschafft boolean := false;
  v_berichtigung boolean;
  v_quelle text := null;
  v_schritte integer := 0;
  v_heute integer;
  v_fach text;
  v_seite integer;
  v_feld integer;
  v_felder jsonb := '[]'::jsonb;
  v_fertig jsonb := null;
  v_faecher integer;
  v_bunt boolean;
  v_bonus integer;
  v_faltung text;
  v_faltungen text[] := array['papierflieger', 'hund', 'becher', 'hut', 'papierschiff', 'katze',
                              'himmel_hoelle', 'tulpe'];
  v_ergebnis jsonb;
begin
  if v_kind is null or p_sitzung is null then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('tinte:' || v_kind::text));

  select ergebnis into v_vorhanden from public.kind_runden_belohnung
   where sitzung_id = p_sitzung and child_id = v_kind;
  if found then
    return v_vorhanden;
  end if;

  select id, category, correct_answers, total_questions, question_source, learning_plan_id, created_at
    into s
    from public.game_sessions
   where id = p_sitzung and user_id = v_kind;
  if not found or s.created_at < now() - interval '15 minutes' then
    return null;
  end if;
  if not exists (select 1 from public.profiles where id = v_kind and role = 'child') then
    return null;
  end if;

  v_fach := coalesce(nullif(s.category, ''), 'math');
  v_richtig := greatest(0, least(coalesce(s.correct_answers, 0), coalesce(s.total_questions, 0)));
  v_berichtigung := coalesce(s.question_source, '') = 'berichtigung';

  -- Tinte fuer die Runde
  if v_richtig > 0 then
    insert into public.kind_tinte (child_id, menge, grund, sitzung_id)
    values (v_kind, v_richtig * case when v_berichtigung then 2 else 1 end,
            case when v_berichtigung then 'berichtigung' else 'runde' end, p_sitzung);
    v_tinte := v_richtig * case when v_berichtigung then 2 else 1 end;
  end if;
  if s.total_questions >= 5 and v_richtig >= s.total_questions then
    insert into public.kind_tinte (child_id, menge, grund, sitzung_id) values (v_kind, 5, 'alles_richtig', p_sitzung);
    v_tinte := v_tinte + 5;
  end if;

  -- Felder der Reise
  v_geschafft := coalesce(s.total_questions, 0) >= 3 and v_richtig * 5 >= s.total_questions * 3;
  if v_geschafft then
    if v_berichtigung then
      v_quelle := 'berichtigung'; v_schritte := 1;
    elsif s.learning_plan_id is not null
          and exists (select 1 from public.learning_plans where id = s.learning_plan_id and child_id = v_kind) then
      v_quelle := 'lernplan'; v_schritte := 2;
    elsif exists (select 1 from public.child_subject_visibility
                   where child_id = v_kind and subject = v_fach and is_priority) then
      v_quelle := 'schwerpunkt'; v_schritte := 2;
    else
      v_quelle := 'runde'; v_schritte := 1;
    end if;

    select count(*) into v_heute from public.kind_reise_felder
     where child_id = v_kind
       and created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin');
    v_schritte := least(v_schritte, greatest(0, 24 - v_heute));
  end if;

  for i in 1..v_schritte loop
    v_seite := null;
    select f.seite, count(*) into v_seite, v_feld
      from public.kind_reise_felder f
     where f.child_id = v_kind
     group by f.seite
     order by f.seite desc
     limit 1;
    if v_seite is null then
      v_seite := 1; v_feld := 0;
    elsif v_feld >= 12 then
      v_seite := v_seite + 1; v_feld := 0;
    end if;
    v_feld := v_feld + 1;

    insert into public.kind_reise_felder (child_id, seite, feld, fach, quelle, sitzung_id)
    values (v_kind, v_seite, v_feld, v_fach, v_quelle, p_sitzung);
    v_felder := v_felder || jsonb_build_object('seite', v_seite, 'feld', v_feld, 'fach', v_fach, 'quelle', v_quelle);

    if v_feld = 12 then
      select count(distinct fach) into v_faecher from public.kind_reise_felder
       where child_id = v_kind and seite = v_seite;
      v_bunt := v_faecher >= 3;
      select coalesce(max(reise_bonus_minuten), 0) into v_bonus from public.child_settings where child_id = v_kind;
      v_faltung := v_faltungen[1 + ((v_seite - 1) % array_length(v_faltungen, 1))];

      insert into public.kind_reise_seiten (child_id, seite, faltung, bunt, bonus_minuten)
      values (v_kind, v_seite, v_faltung, v_bunt, v_bonus);
      insert into public.kind_tinte (child_id, menge, grund, sitzung_id, bezug)
      values (v_kind, 30, 'seite', p_sitzung, v_seite::text);
      v_tinte := v_tinte + 30;
      if v_bunt then
        insert into public.kind_tinte (child_id, menge, grund, sitzung_id, bezug)
        values (v_kind, 20, 'bunte_seite', p_sitzung, v_seite::text);
        v_tinte := v_tinte + 20;
      end if;
      v_fertig := jsonb_build_object('seite', v_seite, 'faltung', v_faltung, 'bunt', v_bunt, 'bonus_minuten', v_bonus);
    end if;
  end loop;

  v_ergebnis := jsonb_build_object(
    'tinte', v_tinte,
    'stand', (select coalesce(sum(menge), 0) from public.kind_tinte where child_id = v_kind),
    'geschafft', v_geschafft,
    'quelle', v_quelle,
    'felder', v_felder,
    'seite_fertig', v_fertig
  );
  insert into public.kind_runden_belohnung (sitzung_id, child_id, ergebnis) values (p_sitzung, v_kind, v_ergebnis);
  return v_ergebnis;
end;
$$;
revoke execute on function public.runde_belohnen(uuid) from public, anon;
grant execute on function public.runde_belohnen(uuid) to authenticated;
