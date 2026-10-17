-- Meldungen von Inhalten (17.10.2026, Apple 1.2): KI-Antworten (Tutor) und
-- Beiträge im Ideen-Forum. Melden geht nur über inhalt_melden(); lesen und
-- bearbeiten nur der Betreiber (Dashboard/Service-Rolle). Bearbeitung:
-- docs/support/leitfaden.md.
create table if not exists public.inhalt_meldungen (
  id uuid primary key default gen_random_uuid(),
  art text not null check (art in ('ki_tutor', 'idee', 'kommentar')),
  -- ID des Forum-Beitrags; beim Tutor leer (Antworten werden nicht gespeichert)
  bezug_id uuid,
  -- Wortlaut zum Zeitpunkt der Meldung (KI-Antwort bzw. Beitrag), gekürzt
  inhalt text not null,
  -- Bei der KI: Aufgabe und Frage des Kindes, damit die Antwort einzuordnen ist
  kontext text,
  melder_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'offen' check (status in ('offen', 'erledigt', 'unbegruendet')),
  created_at timestamptz not null default now()
);

alter table public.inhalt_meldungen enable row level security;
-- keine Policies: Nutzer lesen und schreiben nie direkt

create index if not exists inhalt_meldungen_offen on public.inhalt_meldungen (created_at) where status = 'offen';

create or replace function public.inhalt_melden(p_art text, p_inhalt text, p_bezug_id uuid default null, p_kontext text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nutzer uuid := auth.uid();
begin
  if v_nutzer is null or p_art not in ('ki_tutor', 'idee', 'kommentar') or coalesce(trim(p_inhalt), '') = '' then
    return false;
  end if;
  -- Schutz vor Massenmeldungen: höchstens 30 am Tag je Konto
  if (select count(*) from public.inhalt_meldungen
       where melder_id = v_nutzer and created_at > now() - interval '1 day') >= 30 then
    return false;
  end if;
  -- Dieselbe Sache meldet ein Konto nur einmal
  if p_bezug_id is not null and exists (
       select 1 from public.inhalt_meldungen where melder_id = v_nutzer and bezug_id = p_bezug_id) then
    return true;
  end if;
  insert into public.inhalt_meldungen (art, bezug_id, inhalt, kontext, melder_id)
  values (p_art, p_bezug_id, left(p_inhalt, 4000), left(p_kontext, 2000), v_nutzer);
  return true;
end;
$$;

revoke execute on function public.inhalt_melden(text, text, uuid, text) from public, anon;
grant execute on function public.inhalt_melden(text, text, uuid, text) to authenticated;
