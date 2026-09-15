-- Liefert die Werte, auf denen docs/faktenpruefung.md steht — aus dem
-- Katalog, nicht aus einer Erinnerung.
--
-- Zweck: Die Faktenpruefung war eine Handarbeit vom 08.09.2026. Aendert
-- jemand den Standardwert einer Spalte oder die Dauer der Testphase, wird ein
-- Werbetext still falsch, ohne dass es auffaellt. `npm run verify-claims`
-- vergleicht die hier gemeldeten Werte mit den dokumentierten.
--
-- Bewusst eine Funktion und keine Sicht: Spalten-Vorgabewerte und
-- Funktionsquelltexte stehen im Systemkatalog, und der ist ueber die
-- REST-Schnittstelle nicht erreichbar. SECURITY DEFINER holt sie; gelesen
-- werden darf nur mit dem Service-Role-Schluessel.
-- Kleiner Helfer, damit die Abfrage oben lesbar bleibt.
create or replace function public.spalten_vorgabe(p_tabelle text, p_spalte text)
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select pg_get_expr(d.adbin, d.adrelid)
    from pg_attribute a
    join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = ('public.' || p_tabelle)::regclass
     and a.attname  = p_spalte;
$$;

create or replace function public.claim_facts()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_trial_tage       integer;
  v_code_tage        integer;
  v_quelle           text;
begin
  -- Dauer der Testphase aus dem Quelltext von handle_new_user.
  select pg_get_functiondef(p.oid) into v_quelle
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'handle_new_user'
   limit 1;
  v_trial_tage := nullif(substring(v_quelle from $re$interval\s*'(\d+)\s*days'$re$), '')::integer;

  -- Gueltigkeit des Einladungscodes aus dem Vorgabewert der Spalte.
  select nullif(substring(pg_get_expr(d.adbin, d.adrelid) from $re$'(\d+)\s*days'$re$), '')::integer
    into v_code_tage
    from pg_attribute a
    join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = 'public.invitation_codes'::regclass
     and a.attname  = 'expires_at';

  return jsonb_build_object(
    'trial_tage',        v_trial_tage,
    'einladungscode_tage', v_code_tage,
    -- Vorgabewerte aus child_settings. coalesce auf -1, damit ein fehlender
    -- Wert als Abweichung auffaellt statt als null durchzurutschen.
    'sekunden_je_aufgabe', (
      select coalesce(min(substring(pg_get_expr(d.adbin, d.adrelid) from '\d+')::integer), -1)
        from pg_attribute a
        join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = 'public.child_settings'::regclass
         and a.attname like '%\_seconds\_per\_task'
    ),
    'sekunden_je_aufgabe_uneinheitlich', (
      select count(distinct substring(pg_get_expr(d.adbin, d.adrelid) from '\d+')) > 1
        from pg_attribute a
        join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = 'public.child_settings'::regclass
         and a.attname like '%\_seconds\_per\_task'
    ),
    'minuten_werktags', public.spalten_vorgabe('child_settings', 'weekday_max_minutes'),
    'minuten_wochenende', public.spalten_vorgabe('child_settings', 'weekend_max_minutes'),
    'bildschirmzeit_verwaltet', public.spalten_vorgabe('child_settings', 'screen_time_managed'),
    'bildschirmzeit_auto_freigabe', public.spalten_vorgabe('child_settings', 'screen_time_auto_release'),
    'kinderprofile_gesamt', (select count(*) from public.profiles where role = 'child'),
    'geprueft_am', now()
  );
end;
$$;

revoke all on function public.claim_facts() from public;
revoke all on function public.spalten_vorgabe(text, text) from public;
