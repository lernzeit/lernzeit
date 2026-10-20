-- „Eltern fragen“ auf dem Sperrbildschirm → Push an die Eltern (20.10.2026).
-- Die Drücke landen in shield_attempts, sobald LernZeit auf dem Kinder-Handy
-- läuft (useSyncShieldAttempts). Bisher sahen Eltern sie nur als Karte auf
-- „Heute“. Jetzt geht je Kind höchstens alle 10 Minuten eine Mitteilung raus,
-- und nur für Drücke der letzten 12 Stunden (sonst käme am Morgen eine
-- veraltete Bitte vom Vorabend).

create table if not exists public.eltern_fragen_push (
  child_id uuid primary key references auth.users(id) on delete cascade,
  gesendet_am timestamptz not null
);
alter table public.eltern_fragen_push enable row level security;

create or replace function public.notify_eltern_fragen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key text;
  zeile record;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if service_key is null or service_key = '' then
    raise log 'notify_eltern_fragen: service_role_key fehlt im Vault';
    return null;
  end if;

  for zeile in
    select n.child_id, max(n.attempted_at) as zuletzt, count(*) as anzahl
    from neu n
    where n.attempted_at > now() - interval '12 hours'
    group by n.child_id
  loop
    -- höchstens alle 10 Minuten je Kind
    insert into eltern_fragen_push (child_id, gesendet_am) values (zeile.child_id, now())
    on conflict (child_id) do update set gesendet_am = now()
      where eltern_fragen_push.gesendet_am < now() - interval '10 minutes';
    if not found then
      continue;
    end if;

    perform net.http_post(
      url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || service_key),
      body := jsonb_build_object('event', 'eltern_fragen', 'child_id', zeile.child_id,
                                 'zuletzt', zeile.zuletzt, 'anzahl', zeile.anzahl)
    );
  end loop;
  return null;
exception when others then
  raise log 'notify_eltern_fragen failed: %', sqlerrm;
  return null;
end;
$$;
revoke execute on function public.notify_eltern_fragen() from public, anon, authenticated;

create trigger shield_attempts_eltern_fragen
  after insert on public.shield_attempts
  referencing new table as neu
  for each statement execute function public.notify_eltern_fragen();
