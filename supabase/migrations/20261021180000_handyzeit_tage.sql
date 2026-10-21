-- Handyzeit je Tag für die Eltern-Übersicht (21.10.2026).
--
-- `handyzeit_stand` hält nur den Stand von heute (eine Zeile je Kind). Für
-- „Letzte 7 Tage“ beim Kind merkt sich `handyzeit_stand_melden` jetzt auch
-- jeden Tag, höchstens 31 Tage lang: 31 feste Plätze je Kind (`platz` =
-- Tagnummer mod 31), ein neuer Tag überschreibt den Platz von vor 31 Tagen.
-- So bleibt die Tabelle klein, ohne dass etwas gelöscht werden muss.
-- Nur Summen des Tages, keine Apps — die liefert Apple an LernZeit nicht.

create table if not exists public.handyzeit_tage (
  child_id uuid not null references auth.users(id) on delete cascade,
  platz smallint not null check (platz between 0 and 30),
  tag date not null,
  genutzt smallint not null default 0,
  budget smallint,
  aufgebraucht boolean not null default false,
  aktualisiert timestamptz not null default now(),
  primary key (child_id, platz)
);
alter table public.handyzeit_tage enable row level security;
create policy handyzeit_tage_lesen on public.handyzeit_tage for select to authenticated
  using (auth.uid() = child_id or exists (
    select 1 from public.parent_child_relationships r
    where r.parent_id = auth.uid() and r.child_id = handyzeit_tage.child_id));

insert into public.handyzeit_tage (child_id, platz, tag, genutzt, budget, aufgebraucht, aktualisiert)
select child_id, ((tag - date '2000-01-01') % 31)::smallint, tag, genutzt, budget, aufgebraucht, aktualisiert
from public.handyzeit_stand
on conflict (child_id, platz) do nothing;

create or replace function public.handyzeit_stand_melden(
  p_tag date, p_genutzt integer, p_budget integer, p_aufgebraucht boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_genutzt smallint;
  v_budget smallint;
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  if p_tag is null or p_tag < current_date - 2 or p_tag > current_date + 2 then
    raise exception 'ungültiger Tag';
  end if;
  v_genutzt := least(greatest(coalesce(p_genutzt, 0), 0), 1440);
  v_budget := case when p_budget is null then null else least(greatest(p_budget, 0), 32767) end;

  insert into handyzeit_stand (child_id, tag, genutzt, budget, aufgebraucht, aktualisiert)
  values (auth.uid(), p_tag, v_genutzt, v_budget, coalesce(p_aufgebraucht, false), now())
  on conflict (child_id) do update
    set tag = excluded.tag, genutzt = excluded.genutzt, budget = excluded.budget,
        aufgebraucht = excluded.aufgebraucht, aktualisiert = now();

  insert into handyzeit_tage (child_id, platz, tag, genutzt, budget, aufgebraucht, aktualisiert)
  values (auth.uid(), ((p_tag - date '2000-01-01') % 31)::smallint, p_tag, v_genutzt, v_budget,
          coalesce(p_aufgebraucht, false), now())
  on conflict (child_id, platz) do update
    set tag = excluded.tag, genutzt = excluded.genutzt, budget = excluded.budget,
        aufgebraucht = excluded.aufgebraucht, aktualisiert = now()
    -- Ein verspäteter Bericht von gestern überschreibt nicht den Platz von heute in einem Monat
    where handyzeit_tage.tag <= excluded.tag;
end;
$$;
revoke execute on function public.handyzeit_stand_melden(date, integer, integer, boolean) from public, anon;
grant execute on function public.handyzeit_stand_melden(date, integer, integer, boolean) to authenticated;
