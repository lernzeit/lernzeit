-- Grundzeit, Probelauf und der Weg ohne Edge Function.
--
-- Drei Dinge in einem Zug, weil sie dieselbe Tabelle betreffen.
--
-- 1. GRUNDZEIT. Apples Bildschirmzeit geht von einem Tagesbudget aus: Das
--    Handy funktioniert erst einmal, und die Sperre greift, wenn das Budget
--    aufgebraucht ist. Bei LernZeit war das Budget bisher null — ohne
--    verdiente und genehmigte Zeit war das Telefon rund um die Uhr zu.
--    Strenger als alles, was Apple anbietet.
--
--    Apples eigener Mechanismus (DeviceActivityEvent mit Nutzungsschwelle)
--    laesst sich nicht nachbauen: Er verlangt ApplicationTokens, und die gibt
--    es nur aus dem Auswahldialog. Deshalb hier die Variante, die ohne
--    Auswahl auskommt: ein taegliches Freikontingent, das das Kind selbst
--    startet. Der Unterschied ist ehrlich zu nennen — die Minuten laufen ab
--    Start, nicht nur waehrend der Nutzung.
--
-- 2. EINLOESEN OHNE EDGE FUNCTION. Der Weg ueber screen-time-request haette
--    bedeutet, eine 864-Zeilen-Datei neu auszuliefern, um zwei Aktionen zu
--    ergaenzen. Als Datenbankfunktionen ist dasselbe kuerzer, atomar und
--    sofort wirksam — kein Deploy, kein Zeitfenster, in dem die App etwas
--    ruft, das es noch nicht gibt.
--
-- 3. Alle drei Funktionen sind SECURITY DEFINER und schreiben ausschliesslich
--    fuer auth.uid(). Duerfte das Kind selbst in screen_time_unlocks
--    schreiben, waere die ganze Sperre eine Empfehlung.

-- ── Grundzeit je Kind ─────────────────────────────────────────────────────
ALTER TABLE public.child_settings
  ADD COLUMN IF NOT EXISTS screen_time_base_minutes integer NOT NULL DEFAULT 30;

ALTER TABLE public.child_settings
  DROP CONSTRAINT IF EXISTS child_settings_base_minutes_check;

ALTER TABLE public.child_settings
  ADD CONSTRAINT child_settings_base_minutes_check
  CHECK (screen_time_base_minutes >= 0 AND screen_time_base_minutes <= 480);

COMMENT ON COLUMN public.child_settings.screen_time_base_minutes IS
  'Minuten, die dem Kind taeglich ohne Lernen und ohne Genehmigung zustehen. '
  '0 heisst: alles muss verdient werden. Entspricht Apples App-Limit, aber '
  'als Wanduhr ab Start, nicht als Nutzungsdauer — Apples Mechanismus '
  'verlangt ApplicationTokens aus dem Auswahldialog.';

-- ── Genehmigte Zeit einloesen ─────────────────────────────────────────────
--
-- Gibt die erteilte Freigabe zurueck, oder nichts, wenn es nichts zu
-- erteilen gab. Der eindeutige Index auf request_id macht den zweiten
-- Versuch zu einem stillen Nichts statt zu doppelter Zeit.
--
-- Das Zeitfenster von 24 Stunden ist nicht "bis Mitternacht": Eine um 23:50
-- genehmigte Anfrage waere sonst zehn Minuten spaeter wertlos.
CREATE OR REPLACE FUNCTION public.claim_approved_time(p_request_id uuid)
RETURNS TABLE (unlock_id uuid, minutes integer, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes integer;
BEGIN
  SELECT r.requested_minutes INTO v_minutes
    FROM public.screen_time_requests r
   WHERE r.id = p_request_id
     AND r.child_id = auth.uid()
     AND r.status = 'approved'
     AND r.responded_at IS NOT NULL
     AND r.responded_at > now() - interval '24 hours';

  IF v_minutes IS NULL OR v_minutes < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.screen_time_unlocks (child_id, minutes, starts_at, expires_at, source, request_id)
  VALUES (auth.uid(), v_minutes, now(), now() + make_interval(mins => v_minutes), 'parent_approval', p_request_id)
  ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING
  RETURNING id, screen_time_unlocks.minutes, screen_time_unlocks.expires_at;
END;
$$;

COMMENT ON FUNCTION public.claim_approved_time(uuid) IS
  'Das Kindgeraet loest eine genehmigte Anfrage ein und bekommt die Freigabe '
  'zurueck. Leeres Ergebnis heisst: nicht genehmigt, zu alt oder schon '
  'eingeloest — in allen drei Faellen darf nicht entsperrt werden.';

-- ── Grundzeit einloesen ───────────────────────────────────────────────────
--
-- Einmal je Tag. Der Tag beginnt um Mitternacht UTC, wie ueberall sonst in
-- diesem Projekt (getUtcDayRange in der Edge Function) — in Deutschland also
-- um 1 beziehungsweise 2 Uhr nachts. Fuer ein Kontingent, das ein Kind
-- verbraucht, ist das eher richtig als ein Wechsel um Mitternacht.
CREATE OR REPLACE FUNCTION public.claim_base_time()
RETURNS TABLE (unlock_id uuid, minutes integer, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes integer;
  v_schon_benutzt boolean;
BEGIN
  SELECT s.screen_time_base_minutes INTO v_minutes
    FROM public.child_settings s
   WHERE s.child_id = auth.uid()
   LIMIT 1;

  IF v_minutes IS NULL OR v_minutes < 1 THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.screen_time_unlocks u
     WHERE u.child_id = auth.uid()
       AND u.source = 'auto'
       AND u.starts_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc'
  ) INTO v_schon_benutzt;

  IF v_schon_benutzt THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.screen_time_unlocks (child_id, minutes, starts_at, expires_at, source, request_id)
  VALUES (auth.uid(), v_minutes, now(), now() + make_interval(mins => v_minutes), 'auto', NULL)
  RETURNING id, screen_time_unlocks.minutes, screen_time_unlocks.expires_at;
END;
$$;

COMMENT ON FUNCTION public.claim_base_time() IS
  'Das Kind startet sein taegliches Freikontingent. Einmal je UTC-Tag; '
  'leeres Ergebnis heisst, dass es heute schon lief oder auf 0 steht.';

-- ── Eine gerade erteilte Freigabe zuruecknehmen ───────────────────────────
--
-- Gebraucht wird das genau einmal: Das Geraet hat eingeloest, und danach hat
-- das Entsperren nicht geklappt. Bliebe die Zeile stehen, waere die Zeit
-- verbraucht, ohne dass das Telefon je aufgegangen ist — das Kind haette
-- gelernt und nichts dafuer bekommen.
--
-- Eng begrenzt auf die eigene, frische Zeile. Sonst waere es ein Weg, eine
-- laufende Freigabe verschwinden zu lassen und danach erneut einzuloesen.
CREATE OR REPLACE FUNCTION public.revoke_unlock(p_unlock_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.screen_time_unlocks
   WHERE id = p_unlock_id
     AND child_id = auth.uid()
     AND created_at > now() - interval '5 minutes';
$$;

COMMENT ON FUNCTION public.revoke_unlock(uuid) IS
  'Nimmt eine Freigabe zurueck, deren Entsperren auf dem Geraet scheiterte. '
  'Nur die eigene und nur innerhalb von fuenf Minuten.';

REVOKE ALL ON FUNCTION public.claim_approved_time(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.claim_base_time() FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_unlock(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_approved_time(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_base_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_unlock(uuid) TO authenticated;

-- ── Die Grundzeit gehoert in die Faktenpruefung ───────────────────────────
--
-- `npm run verify-claims` liest claim_facts() und vergleicht die Zahlen mit
-- docs/faktenpruefung.md. Eine Zahl, die in der Oberflaeche steht, aber
-- nirgends gegengeprueft wird, ist genau die Sorte, die irgendwann still
-- falsch wird.
--
-- Die Funktion wird hier in voller Laenge neu geschrieben, weil Postgres kein
-- "eine Zeile ergaenzen" kennt. Einziger Unterschied zur vorigen Fassung:
-- die Zeile 'grundzeit_minuten'.

CREATE OR REPLACE FUNCTION public.claim_facts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_trial_tage       integer;
  v_code_tage        integer;
  v_quelle           text;
begin
  select pg_get_functiondef(p.oid) into v_quelle
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'handle_new_user'
   limit 1;
  v_trial_tage := nullif(substring(v_quelle from $re$interval\s*'(\d+)\s*days'$re$), '')::integer;

  select nullif(substring(pg_get_expr(d.adbin, d.adrelid) from $re$'(\d+)\s*days'$re$), '')::integer
    into v_code_tage
    from pg_attribute a
    join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = 'public.invitation_codes'::regclass
     and a.attname  = 'expires_at';

  return jsonb_build_object(
    'trial_tage',        v_trial_tage,
    'einladungscode_tage', v_code_tage,
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
    'grundzeit_minuten', public.spalten_vorgabe('child_settings', 'screen_time_base_minutes'),
    'bildschirmzeit_verwaltet', public.spalten_vorgabe('child_settings', 'screen_time_managed'),
    'bildschirmzeit_auto_freigabe', public.spalten_vorgabe('child_settings', 'screen_time_auto_release'),
    'kinderprofile_gesamt', (select count(*) from public.profiles where role = 'child'),
    'geprueft_am', now()
  );
end;
$function$;
