-- Wann ein Kind auf dem Sperrbildschirm "Eltern fragen" gedrueckt hat.
--
-- Die ShieldAction-Erweiterung kann keine App oeffnen und keinen Netzaufruf
-- machen — sie merkt den Druck nur in der App Group. LernZeit holt ihn beim
-- naechsten Start ab und legt ihn hier ab, damit die Eltern ihn sehen.
--
-- Der Wert liegt in den Faellen, in denen das Kind danach KEINEN Antrag
-- stellt: Es wollte an die App, hat es aufgegeben, und die Eltern erfahren
-- sonst nie davon.
--
-- Bewusst KEIN Eintrag in screen_time_requests: Dort steht eine Bitte um eine
-- bestimmte Anzahl Minuten, die genehmigt oder abgelehnt wird. Ein Druck auf
-- den Sperrbildschirm ist etwas anderes — er nennt keine Minuten und laesst
-- sich nicht genehmigen. Beides zu vermischen wuerde die Antragsliste mit
-- Zeilen fuellen, auf die niemand antworten kann.
create table if not exists public.shield_attempts (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references auth.users(id) on delete cascade,
  -- Zeitpunkt vom Geraet, nicht vom Server: Der Druck kann Stunden vor dem
  -- naechsten App-Start liegen.
  attempted_at timestamptz not null,
  created_at   timestamptz not null default now()
);

comment on table public.shield_attempts is
  'Druecke auf "Eltern fragen" am Sperrbildschirm. Nur Zeitpunkte, nie eine App — welche App das Kind oeffnen wollte, erfaehrt unser Code nicht.';

create index if not exists shield_attempts_child_idx
  on public.shield_attempts (child_id, attempted_at desc);

-- Dieselbe Uhrzeit zweimal zu melden waere ein Doppeleintrag: Bricht der
-- Start ab, nachdem die Liste in der App Group geleert wurde, aber bevor das
-- Schreiben durch ist, versucht es der naechste Start erneut.
create unique index if not exists shield_attempts_eindeutig
  on public.shield_attempts (child_id, attempted_at);

alter table public.shield_attempts enable row level security;

-- Das Kind schreibt ausschliesslich eigene Zeilen.
create policy "Children record their own shield attempts"
  on public.shield_attempts for insert
  to authenticated
  with check (child_id = auth.uid());

create policy "Children can read their own shield attempts"
  on public.shield_attempts for select
  to authenticated
  using (child_id = auth.uid());

-- Eltern lesen die ihrer verknuepften Kinder. Die Verknuepfung ist die
-- Berechtigung — kein zusaetzliches parent_id-Feld, das auseinanderlaufen
-- koennte, wenn eine Verknuepfung geloest wird.
create policy "Parents can read their children's shield attempts"
  on public.shield_attempts for select
  to authenticated
  using (
    exists (
      select 1 from public.parent_child_relationships r
       where r.child_id = shield_attempts.child_id
         and r.parent_id = auth.uid()
    )
  );

-- Verhaltensdaten eines Kindes. Sie sind nach ein paar Wochen wertlos und
-- werden deshalb geloescht, statt sich anzusammeln.
create or replace function public.purge_shield_attempts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anzahl integer;
begin
  delete from public.shield_attempts where attempted_at < now() - interval '30 days';
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;

revoke all on function public.purge_shield_attempts() from public;

select cron.schedule(
  'shield-attempts-retention',
  '45 3 * * *',
  $job$ select public.purge_shield_attempts(); $job$
);
