-- Conversion „Registrierung abgeschlossen“ erst nach bestätigter E-Mail (31.10.2026).
-- Der Browser fragt nach jeder Anmeldung eines Elternkontos (nur mit Einwilligung
-- und offenem Notaus). Genau beim ersten Mal bekommt er eine transaction_id und
-- meldet; jeder weitere Aufruf (Neuladen, erneute Anmeldung, Bestätigungslink
-- noch einmal) liefert null. Nur Konten ab dem 31.10.2026, nie Testkonten
-- (lz_testkonten(): admin_testkonten, Test-Domains, Admins und deren Kinder),
-- und nur bis 30 Tage nach der Bestätigung.
create table if not exists public.werbe_conversions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  transaction_id uuid not null default gen_random_uuid(),
  gemeldet_am timestamptz not null default now()
);
alter table public.werbe_conversions enable row level security;
revoke all on table public.werbe_conversions from public, anon, authenticated;
grant select, insert, update, delete on table public.werbe_conversions to service_role;

create or replace function public.werbe_conversion_beanspruchen()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then return null; end if;
  if not exists (select 1 from profiles p where p.id = v_uid and p.role = 'parent') then return null; end if;
  if not exists (
    select 1 from auth.users u
    where u.id = v_uid
      and u.email_confirmed_at is not null
      and u.created_at >= timestamptz '2026-10-31 00:00:00+01'
      and u.email_confirmed_at > now() - interval '30 days'
  ) then return null; end if;
  if exists (select 1 from lz_testkonten() t where t.user_id = v_uid) then return null; end if;
  -- Notaus: aus = nichts beanspruchen (sonst wäre die Meldung später verloren)
  if not coalesce((select tags_enabled from ad_settings limit 1), false) then return null; end if;

  insert into werbe_conversions (user_id) values (v_uid)
  on conflict (user_id) do nothing
  returning transaction_id into v_id;
  return v_id;  -- null, wenn schon gemeldet
end;
$$;
revoke execute on function public.werbe_conversion_beanspruchen() from public, anon;
grant execute on function public.werbe_conversion_beanspruchen() to authenticated;
