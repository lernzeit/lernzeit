-- Push an die Eltern, wenn die LernZeit-Handysperre auf dem Kinder-Handy
-- nicht mehr eingerichtet ist (24.10.2026).
--
-- Befund: Auf Klaras iPhone war die Sperre seit dem 24.10. aus, ohne dass es
-- jemand merkte — sie lernte weiter und stellte Anfragen, die Freigaben
-- wirkten aber nicht. Das Kinder-Handy meldet den Stand über
-- `set_screen_time_managed` (ScreenTimeSetup/meldeHandyzeit). Wechselt er von
-- an auf aus, bekommen alle verknüpften Eltern eine Mitteilung — außer ein
-- Elternteil hat das Aufheben gerade selbst erlaubt (Gerät-Freigabe oder
-- Elterncode, dann kam schon eine eigene Mitteilung).

create or replace function public.notify_handysperre_aus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key text;
begin
  if not (coalesce(old.screen_time_managed, false) and not coalesce(new.screen_time_managed, false)) then
    return new;
  end if;
  if exists (select 1 from geraet_freigaben g
             where g.child_id = new.child_id and g.zweck = 'aufheben'
               and g.created_at > now() - interval '1 hour')
     or exists (select 1 from notfall_entsperrungen n
             where n.child_id = new.child_id and n.zweck = 'aufheben'
               and n.created_at > now() - interval '1 hour') then
    return new;
  end if;

  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if service_key is null or service_key = '' then
    raise log 'notify_handysperre_aus: service_role_key fehlt im Vault';
    return new;
  end if;

  perform net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || service_key),
    body := jsonb_build_object('event', 'handysperre_aus', 'child_id', new.child_id)
  );
  return new;
exception when others then
  raise log 'notify_handysperre_aus failed: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.notify_handysperre_aus() from public, anon, authenticated;

create trigger child_settings_handysperre_aus
  after update of screen_time_managed on public.child_settings
  for each row execute function public.notify_handysperre_aus();
