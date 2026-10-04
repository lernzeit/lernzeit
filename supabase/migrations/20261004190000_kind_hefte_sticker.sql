-- Hefte und Sticker der Kinder (App-Redesign, 04.10.2026)
--
-- Jedes Fach erscheint auf dem Startbildschirm des Kindes als Heft. Das Kind
-- waehlt die Umschlagfarbe selbst und klebt bis zu drei Sticker darauf.
-- Sticker gewinnt es fuer eine Runde mit allen Aufgaben richtig (mindestens 5),
-- hoechstens drei am Tag. Keine personenbezogenen Daten, nur Gestaltung.

create table if not exists public.kind_hefte (
  child_id uuid not null references auth.users(id) on delete cascade,
  fach text not null check (fach in ('math','german','english','science','geography','history','physics','biology','chemistry','latin')),
  farbe text not null default 'blau' check (farbe ~ '^[a-z]{2,16}$'),
  -- Sticker-Kennungen in Reihenfolge der Plaetze (oben rechts, unten links, Mitte)
  sticker jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sticker) = 'array' and jsonb_array_length(sticker) <= 3),
  updated_at timestamptz not null default now(),
  primary key (child_id, fach)
);

alter table public.kind_hefte enable row level security;

drop policy if exists kind_hefte_lesen on public.kind_hefte;
drop policy if exists kind_hefte_anlegen on public.kind_hefte;
drop policy if exists kind_hefte_aendern on public.kind_hefte;
drop policy if exists kind_hefte_entfernen on public.kind_hefte;
create policy kind_hefte_lesen on public.kind_hefte for select using (auth.uid() = child_id);
create policy kind_hefte_anlegen on public.kind_hefte for insert with check (auth.uid() = child_id);
create policy kind_hefte_aendern on public.kind_hefte for update using (auth.uid() = child_id) with check (auth.uid() = child_id);
create policy kind_hefte_entfernen on public.kind_hefte for delete using (auth.uid() = child_id);

create table if not exists public.kind_sticker (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  sticker text not null check (sticker ~ '^[a-z0-9_]{2,24}$'),
  quelle text not null default 'alles_richtig' check (quelle in ('alles_richtig')),
  sitzung_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists kind_sticker_kind_idx on public.kind_sticker (child_id, created_at desc);
create unique index if not exists kind_sticker_sitzung_idx on public.kind_sticker (sitzung_id) where sitzung_id is not null;

alter table public.kind_sticker enable row level security;

-- Lesen darf das Kind seine Sticker; vergeben werden sie nur ueber sticker_vergeben()
drop policy if exists kind_sticker_lesen on public.kind_sticker;
create policy kind_sticker_lesen on public.kind_sticker for select using (auth.uid() = child_id);

-- Vergibt einen Sticker, wenn die letzte Runde des Kindes (hoechstens 15 Minuten
-- alt, mindestens 5 Aufgaben) ganz richtig war. Je Runde einer, hoechstens drei
-- am Tag (Berliner Zeit). Bevorzugt Sticker, die das Kind noch nicht hat.
-- Gibt die Kennung des neuen Stickers zurueck oder null.
create or replace function public.sticker_vergeben()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_kind uuid := auth.uid();
  v_sitzung record;
  v_katalog text[] := array[
    'fuchs','panda','einhorn','schildkroete','krake','eule','biene','schmetterling',
    'regenbogen','stern','rakete','ballon','erdbeere','pizza','gitarre','fussball',
    'pokal','diamant','sonnenblume','kleeblatt','delfin','dino','farben','puzzle'
  ];
  v_neu text;
begin
  if v_kind is null then
    return null;
  end if;

  select id, correct_answers, total_questions, created_at, question_source
    into v_sitzung
    from public.game_sessions
   where user_id = v_kind
   order by created_at desc nulls last
   limit 1;

  if v_sitzung.id is null
     or v_sitzung.total_questions < 5
     or v_sitzung.correct_answers < v_sitzung.total_questions
     or coalesce(v_sitzung.question_source, '') = 'streak-recovery'
     or v_sitzung.created_at < now() - interval '15 minutes' then
    return null;
  end if;

  if exists (select 1 from public.kind_sticker where sitzung_id = v_sitzung.id) then
    return null;
  end if;

  if (select count(*) from public.kind_sticker
       where child_id = v_kind
         and created_at >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')) >= 3 then
    return null;
  end if;

  select s into v_neu
    from unnest(v_katalog) as s
   where s not in (select sticker from public.kind_sticker where child_id = v_kind)
   order by random()
   limit 1;

  if v_neu is null then
    select s into v_neu from unnest(v_katalog) as s order by random() limit 1;
  end if;

  insert into public.kind_sticker (child_id, sticker, quelle, sitzung_id)
  values (v_kind, v_neu, 'alles_richtig', v_sitzung.id);

  return v_neu;
end;
$fn$;

revoke all on function public.sticker_vergeben() from public;
revoke all on function public.sticker_vergeben() from anon;
grant execute on function public.sticker_vergeben() to authenticated;
