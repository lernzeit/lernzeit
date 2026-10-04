-- Lernplan startet, wenn das Kind ihn zum ersten Mal oeffnet (Wunsch 04.10.2026):
-- Eltern erstellen Plaene oft abends; vorher war Tag 1 dann schon vorbei.
alter table public.learning_plans add column if not exists gestartet_am date;

-- Bestehende Plaene: erster Uebungstag ueber die Lernplan-Karte, falls vorhanden.
update public.learning_plans lp
   set gestartet_am = s.erster
  from (select learning_plan_id, min(session_date)::date as erster
          from public.game_sessions
         where learning_plan_id is not null
         group by learning_plan_id) s
 where s.learning_plan_id = lp.id and lp.gestartet_am is null;

-- Setzt den Starttag einmalig (Tag in deutscher Zeit). Nur das Kind des Plans.
create or replace function public.lernplan_starten(p_plan_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_tag date;
begin
  update public.learning_plans
     set gestartet_am = coalesce(gestartet_am, (now() at time zone 'Europe/Berlin')::date)
   where id = p_plan_id and child_id = auth.uid()
  returning gestartet_am into v_tag;
  return v_tag;
end;
$fn$;

revoke all on function public.lernplan_starten(uuid) from public, anon;
grant execute on function public.lernplan_starten(uuid) to authenticated;
