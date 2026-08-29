-- Jeder Aufruf einer Edge Function AUS DER DATENBANK heraus lief in einen 401.
--
-- Fuenf Trigger-Funktionen und drei Cron-Auftraege hatten den anon-Schluessel
-- fest eingebaut (bzw. schickten ihn nur als "apikey" ohne Authorization).
-- send-push, annual-grade-upgrade, check-referral-activation und
-- auto-optimize-models verlangen aber alle exakt den Service-Role-Key und
-- antworten sonst mit {"error":"Unauthorized"}.
--
-- Gemerkt hat es niemand, weil beides schweigt: net.http_post reiht nur ein
-- (die Antwort landet in net._http_response, nicht in cron.job_run_details),
-- und die Trigger fangen jeden Fehler mit "EXCEPTION WHEN OTHERS" ab.
--
-- Praktische Folge: Es ist nie eine In-App-Benachrichtigung rausgegangen —
-- weder an Eltern bei einem Zeitantrag noch an Kinder bei der Antwort darauf.
-- Der jaehrliche Klassenwechsel am 01.08. ist ebenfalls ausgefallen.
--
-- Der Schluessel kommt jetzt ueberall aus dem Vault, wie bei den Cache-Jobs.
-- Bewusst inline statt ueber eine Hilfsfunktion: Eine aufrufbare Funktion, die
-- den Service-Role-Key zurueckgibt, waere eine neue Angriffsflaeche, sobald
-- jemand EXECUTE zu breit vergibt. Die Trigger sind SECURITY DEFINER und
-- gehoeren postgres, kommen also selbst an den Vault.

-- ── 1. Eltern benachrichtigen, wenn ein Kind Zeit beantragt ────────────────
CREATE OR REPLACE FUNCTION public.notify_new_screen_time_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  service_key text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE LOG 'notify_new_screen_time_request: service_role_key fehlt im Vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'event', 'screen_time_request_new',
      'request_id', NEW.id,
      'parent_id', NEW.parent_id,
      'child_id', NEW.child_id,
      'requested_minutes', NEW.requested_minutes
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_new_screen_time_request failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ── 2. Kind benachrichtigen, wenn die Eltern geantwortet haben ─────────────
CREATE OR REPLACE FUNCTION public.notify_screen_time_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  service_key text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'denied') THEN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF service_key IS NULL OR service_key = '' THEN
      RAISE LOG 'notify_screen_time_response: service_role_key fehlt im Vault';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'event', CASE WHEN NEW.status = 'approved' THEN 'screen_time_approved' ELSE 'screen_time_denied' END,
        'request_id', NEW.id,
        'child_id', NEW.child_id,
        'parent_id', NEW.parent_id,
        'requested_minutes', NEW.requested_minutes,
        'parent_response', NEW.parent_response
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_screen_time_response failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ── 3. Neuer Lernplan ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_learning_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  service_key text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE LOG 'notify_new_learning_plan: service_role_key fehlt im Vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'event', 'learning_plan_created',
      'plan_id', NEW.id,
      'child_id', NEW.child_id,
      'parent_id', NEW.parent_id,
      'subject', NEW.subject,
      'topic', NEW.topic
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_new_learning_plan failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ── 4. Schwerpunktfach gesetzt ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_subject_priority()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  should_notify boolean := false;
  service_key text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_priority = true THEN
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_priority = true AND COALESCE(OLD.is_priority, false) = false THEN
    should_notify := true;
  END IF;

  IF should_notify THEN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF service_key IS NULL OR service_key = '' THEN
      RAISE LOG 'notify_subject_priority: service_role_key fehlt im Vault';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'event', 'subject_priority_set',
        'child_id', NEW.child_id,
        'parent_id', NEW.parent_id,
        'subject', NEW.subject
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_subject_priority failed: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ── 5. Manueller Anstoss des Klassenwechsels (Testhilfe) ───────────────────
-- search_path ist hier leer, deshalb ist alles voll qualifiziert.
CREATE OR REPLACE FUNCTION public.trigger_grade_upgrade()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
DECLARE
  result json;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF service_key IS NULL OR service_key = '' THEN
    RETURN json_build_object('success', false, 'error', 'service_role_key fehlt im Vault');
  END IF;

  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/annual-grade-upgrade',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('time', 'Manual grade upgrade test')
  ) INTO result;

  RETURN json_build_object(
    'success', true,
    'message', 'Grade upgrade function triggered',
    'request_id', result
  );
END;
$fn$;

-- ── Cron-Auftraege: jaehrlicher Klassenwechsel ─────────────────────────────
SELECT cron.schedule(
  'annual-grade-upgrade',
  '0 6 1 8 *',
  $job$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/annual-grade-upgrade',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1), '')
    ),
    body := jsonb_build_object('time', 'Annual grade upgrade triggered'),
    timeout_milliseconds := 60000
  );
  $job$
);

-- ── Cron-Auftraege: Modellauswahl monatlich ────────────────────────────────
SELECT cron.schedule(
  'auto-optimize-ai-models-monthly',
  '0 3 1 * *',
  $job$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/auto-optimize-models',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1), '')
    ),
    body := jsonb_build_object('apply', true),
    timeout_milliseconds := 60000
  );
  $job$
);

-- ── Cron-Auftraege: Freischaltung von Empfehlungen taeglich ────────────────
SELECT cron.schedule(
  'check-referral-activation-daily',
  '0 3 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/check-referral-activation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
