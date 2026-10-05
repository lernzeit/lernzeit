-- Sticker selbst aussuchen (Wunsch des Betreibers 05.10.2026): Nach einer
-- Runde mit allen Aufgaben richtig waehlt das Kind seinen Sticker, statt
-- einen zufaelligen zu bekommen. Regeln wie bei sticker_vergeben(): letzte
-- Runde hoechstens 15 Minuten alt, mindestens 5 Aufgaben, alle richtig, keine
-- Rettungsrunde, je Runde einer, hoechstens drei am Tag (Berliner Zeit).
--
-- sticker_vergeben() bleibt fuer aeltere App-Versionen (zufaelliger Sticker).

-- Die Runde, fuer die das angemeldete Kind gerade einen Sticker bekommen darf, sonst null.
create or replace function public.sticker_sitzung()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_kind uuid := auth.uid();
  v_sitzung record;
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

  return v_sitzung.id;
end;
$fn$;

-- Darf das Kind jetzt einen Sticker aussuchen?
create or replace function public.sticker_darf_waehlen()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select public.sticker_sitzung() is not null;
$fn$;

-- Gewaehlten Sticker vergeben. Gibt die Kennung zurueck oder null.
create or replace function public.sticker_waehlen(p_sticker text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_kind uuid := auth.uid();
  v_sitzung uuid;
  v_katalog text[] := array[
    'fuchs','panda','einhorn','schildkroete','krake','eule','biene','schmetterling',
    'regenbogen','stern','rakete','ballon','erdbeere','pizza','gitarre','fussball',
    'pokal','diamant','sonnenblume','kleeblatt','delfin','dino','farben','puzzle'
  ];
begin
  if v_kind is null or p_sticker is null or not (p_sticker = any (v_katalog)) then
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

revoke all on function public.sticker_sitzung() from public, anon, authenticated;
revoke all on function public.sticker_darf_waehlen() from public, anon;
revoke all on function public.sticker_waehlen(text) from public, anon;
grant execute on function public.sticker_darf_waehlen() to authenticated;
grant execute on function public.sticker_waehlen(text) to authenticated;
