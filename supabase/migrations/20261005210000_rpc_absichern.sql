-- Sicherheitspruefung Release 2.0 (05.10.2026): SECURITY-DEFINER-Funktionen,
-- die jeder ueber /rest/v1/rpc aufrufen konnte, auch ohne Anmeldung.
--
-- apply_premium_grant   schrieb beliebigen Konten Premium-Monate gut
-- cap_referral_grant    verriet die Empfehlungsmonate fremder Konten
-- claim_annual_job      konnte den Klassenwechsel eines Jahres vorab "belegen"
--                       (dann laeuft er im August nicht)
-- trigger_grade_upgrade loeste den Klassenwechsel sofort aus (alle Kinder +1)
-- cleanup_/purge_       Aufraeumarbeiten des Cron
--
-- Aufrufer sind ausschliesslich Edge Functions mit Service-Rolle und pg_cron
-- (Nutzer postgres); beide sind von REVOKE nicht betroffen.

revoke execute on function public.apply_premium_grant(uuid, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.cap_referral_grant(uuid, integer) from public, anon, authenticated;
revoke execute on function public.claim_annual_job(text, integer) from public, anon, authenticated;
revoke execute on function public.trigger_grade_upgrade() from public, anon, authenticated;
revoke execute on function public.cleanup_expired_screen_time_requests() from public, anon, authenticated;
revoke execute on function public.purge_ad_attribution() from public, anon, authenticated;
revoke execute on function public.purge_shield_attempts() from public, anon, authenticated;

grant execute on function public.apply_premium_grant(uuid, integer, text, uuid) to service_role;
grant execute on function public.cap_referral_grant(uuid, integer) to service_role;
grant execute on function public.claim_annual_job(text, integer) to service_role;
grant execute on function public.trigger_grade_upgrade() to service_role;
grant execute on function public.cleanup_expired_screen_time_requests() to service_role;
grant execute on function public.purge_ad_attribution() to service_role;
grant execute on function public.purge_shield_attempts() to service_role;

-- Nur angemeldet noetig (App ruft sie mit Sitzung auf)
revoke execute on function public.cleanup_expired_codes() from public, anon;
revoke execute on function public.get_cache_stats() from public, anon;
grant execute on function public.cleanup_expired_codes() to authenticated, service_role;
grant execute on function public.get_cache_stats() to authenticated, service_role;

-- Einladungscode: Ein angemeldetes Kind darf nur sich selbst verknuepfen.
-- Vorher konnte, wer einen gueltigen Code kannte, ein beliebiges Konto
-- (claiming_child_id) an die Eltern haengen, auch ohne Anmeldung.
create or replace function public.claim_invitation_code(code_to_claim text, claiming_child_id uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  code_record record;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or auth.uid() <> claiming_child_id) then
    return json_build_object('success', false, 'error', 'Nicht erlaubt');
  end if;

  -- Find and validate code (bypasses RLS due to SECURITY DEFINER)
  select * into code_record
  from public.invitation_codes
  where code = code_to_claim
    and is_used = false
    and expires_at > now()
    and child_id is null;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Code nicht gefunden oder ungültig'
    );
  end if;

  -- Claim the code
  update public.invitation_codes
  set child_id = claiming_child_id, is_used = true, used_at = now()
  where id = code_record.id;

  -- Create parent-child relationship
  insert into public.parent_child_relationships (parent_id, child_id)
  values (code_record.parent_id, claiming_child_id)
  on conflict do nothing;

  return json_build_object(
    'success', true,
    'parent_id', code_record.parent_id,
    'child_id', claiming_child_id
  );

exception
  when others then
    return json_build_object(
      'success', false,
      'error', sqlerrm
    );
end;
$function$;

-- Nicht hier: Der doppelte Cron-Auftrag "push-hourly-dispatch" (Nutzer
-- supabase_read_only_user, oeffentlicher anon-Schluessel) wird von send-push
-- jede Stunde mit 401 abgelehnt. Loeschen nur im Supabase-Dashboard
-- (Integrations → Cron); Migrationen duerfen cron.job nicht aendern.
