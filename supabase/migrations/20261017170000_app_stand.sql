-- Welchen Stand der App ein Kind zuletzt geöffnet hat (17.10.2026).
-- send-push wählt danach die Wörter: Ältere App-Versionen zeigen noch die
-- Lernpflanze, neuere Klecksi (seit Stand 20261013). Die App meldet eine
-- feste Zahl aus src/lib/appStand.ts, keine Geräte- oder Versionsdaten.
alter table public.profiles add column if not exists app_stand integer;

create or replace function public.app_stand_melden(p_stand integer)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles
     set app_stand = p_stand
   where id = auth.uid()
     and p_stand between 20260101 and 20991231
     and app_stand is distinct from p_stand;
$$;
revoke execute on function public.app_stand_melden(integer) from public, anon;
grant execute on function public.app_stand_melden(integer) to authenticated;
