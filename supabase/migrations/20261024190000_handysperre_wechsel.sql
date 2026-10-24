-- Protokoll, wann die LernZeit-Handysperre auf einem Kinder-Handy an- oder
-- ausgeht (24.10.2026). Klaras Sperre war unbemerkt aus; um zu sehen, ob das
-- wieder passiert und warum, merkt sich der Server jeden Wechsel von
-- `child_settings.screen_time_managed`. Ab dem nächsten App-Build meldet das
-- Handy beim Wechsel auf „aus“ zusätzlich den technischen Stand (Apple-
-- Erlaubnis, Probelauf, Tagesbudget) über `handysperre_stand_melden`.
-- Nur für die Auswertung durch den Betreiber (Service-Rolle), keine Policies.

create table if not exists public.handysperre_wechsel (
  id bigint generated always as identity primary key,
  child_id uuid not null references auth.users(id) on delete cascade,
  an boolean not null,
  app_stand integer,
  grund jsonb,
  zeit timestamptz not null default now()
);
create index if not exists handysperre_wechsel_kind on public.handysperre_wechsel (child_id, zeit desc);
alter table public.handysperre_wechsel enable row level security;
revoke all on public.handysperre_wechsel from anon, authenticated;
grant all on public.handysperre_wechsel to service_role;

create or replace function public.handysperre_wechsel_merken()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.screen_time_managed, false) is distinct from coalesce(new.screen_time_managed, false) then
    insert into handysperre_wechsel (child_id, an, app_stand)
    values (new.child_id, coalesce(new.screen_time_managed, false),
            (select app_stand from profiles where id = new.child_id));
  end if;
  return new;
exception when others then
  raise log 'handysperre_wechsel_merken failed: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.handysperre_wechsel_merken() from public, anon, authenticated;

create trigger child_settings_handysperre_wechsel
  after update of screen_time_managed on public.child_settings
  for each row execute function public.handysperre_wechsel_merken();

-- Wie set_screen_time_managed, mit technischem Stand des Geräts. Nur bekannte
-- Schlüssel, keine Inhalte (keine Apps, keine Namen).
create or replace function public.handysperre_stand_melden(ist_verwaltet boolean, p_grund jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vorher boolean;
  v_grund jsonb;
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  select screen_time_managed into v_vorher from child_settings where child_id = auth.uid();
  update child_settings set screen_time_managed = ist_verwaltet, updated_at = now()
   where child_id = auth.uid();
  if coalesce(v_vorher, false) and not ist_verwaltet and p_grund is not null then
    select jsonb_object_agg(key, value) into v_grund
      from jsonb_each(p_grund)
     where key in ('authorization', 'trialUntil', 'budgetEingestellt', 'shieldedCount', 'zaehltNutzung',
                   'shieldAll', 'appStand', 'ort');
    update handysperre_wechsel set grund = v_grund
     where id = (select id from handysperre_wechsel
                  where child_id = auth.uid() and not an and zeit > now() - interval '1 minute'
                  order by zeit desc limit 1);
  end if;
end;
$$;
revoke execute on function public.handysperre_stand_melden(boolean, jsonb) from public, anon;
grant execute on function public.handysperre_stand_melden(boolean, jsonb) to authenticated;
