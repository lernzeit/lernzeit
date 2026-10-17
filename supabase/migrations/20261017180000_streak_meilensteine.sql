-- Mitteilung bei Meilensteinen der Lerntage (3, 7, 14, 30 … Tage), ab jetzt
-- vom Server ausgelöst (17.10.2026). Vorher rief die App send-push selbst
-- auf; seit der Absicherung nimmt send-push nur die Service-Rolle an, die
-- Mitteilung kam also nie an.
--
-- Bei der ersten Runde eines Tages (UTC, wie computeStreakInfo in send-push)
-- ruft ein Trigger send-push mit "streak_pruefen" auf. send-push rechnet die
-- Tage in Folge selbst und merkt sich gesendete Meilensteine hier.

create table if not exists public.streak_meilensteine (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  streak integer not null,
  gesendet_am timestamptz not null default now()
);
create index if not exists streak_meilensteine_kind on public.streak_meilensteine (child_id, streak, gesendet_am desc);
alter table public.streak_meilensteine enable row level security;

create index if not exists idx_game_sessions_user_datum on public.game_sessions (user_id, session_date desc);

create or replace function public.notify_streak_pruefen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key text;
begin
  -- Nur die erste Runde des Tages: Danach ändert sich die Zahl nicht mehr.
  if exists (
    select 1 from game_sessions g
    where g.user_id = new.user_id and g.id <> new.id
      and (g.session_date at time zone 'utc')::date = (new.session_date at time zone 'utc')::date
  ) then
    return new;
  end if;

  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if service_key is null or service_key = '' then
    raise log 'notify_streak_pruefen: service_role_key fehlt im Vault';
    return new;
  end if;

  perform net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || service_key),
    body := jsonb_build_object('event', 'streak_pruefen', 'child_id', new.user_id)
  );
  return new;
exception when others then
  raise log 'notify_streak_pruefen failed: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.notify_streak_pruefen() from public, anon, authenticated;

create trigger game_session_streak_pruefen after insert on public.game_sessions
  for each row execute function public.notify_streak_pruefen();
