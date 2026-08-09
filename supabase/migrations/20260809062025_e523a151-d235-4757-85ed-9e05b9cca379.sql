CREATE TABLE public.question_category_mix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  grade integer NOT NULL CHECK (grade BETWEEN 1 AND 10),
  theory_percentage integer NOT NULL DEFAULT 0
    CHECK (theory_percentage BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, grade)
);

COMMENT ON TABLE public.question_category_mix IS
  'Prozentualer Anteil an Theoriefragen (statt Rechenaufgaben) je Fach und Klasse.';
COMMENT ON COLUMN public.question_category_mix.theory_percentage IS
  '0 = ausschliesslich Rechenaufgaben, 100 = ausschliesslich Theoriefragen.';

GRANT SELECT ON public.question_category_mix TO authenticated;
GRANT ALL ON public.question_category_mix TO service_role;

ALTER TABLE public.question_category_mix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read category mix"
  ON public.question_category_mix FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages category mix"
  ON public.question_category_mix FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage category mix"
  ON public.question_category_mix FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.question_category_mix (subject, grade, theory_percentage) VALUES
  ('math', 1, 0),
  ('math', 2, 0),
  ('math', 3, 15),
  ('math', 4, 20),
  ('math', 5, 25),
  ('math', 6, 30),
  ('math', 7, 30),
  ('math', 8, 35),
  ('math', 9, 40),
  ('math', 10, 40),
  ('physics', 5, 30),
  ('physics', 6, 30),
  ('physics', 7, 35),
  ('physics', 8, 35),
  ('physics', 9, 40),
  ('physics', 10, 40),
  ('chemistry', 7, 35),
  ('chemistry', 8, 40),
  ('chemistry', 9, 40),
  ('chemistry', 10, 45);

CREATE OR REPLACE FUNCTION public.touch_question_category_mix()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER question_category_mix_touch
  BEFORE UPDATE ON public.question_category_mix
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_question_category_mix();

ALTER TABLE public.ai_question_cache
  ADD COLUMN category text NOT NULL DEFAULT 'calculation';

COMMENT ON COLUMN public.ai_question_cache.category IS
  'calculation = Rechenaufgabe, theory = Fachbegriff/Definition.';

ALTER TABLE public.ai_question_cache
  ADD CONSTRAINT ai_question_cache_category_check
  CHECK (category IN ('calculation', 'theory'));

CREATE INDEX IF NOT EXISTS idx_ai_question_cache_lookup
  ON public.ai_question_cache (grade, subject, difficulty, category, times_served);

ALTER TABLE public.ai_question_cache
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN quality_checked_at timestamptz,
  ADD COLUMN quality_status text,
  ADD COLUMN quality_issues text,
  ADD COLUMN quality_model text;

ALTER TABLE public.ai_question_cache
  ADD CONSTRAINT ai_question_cache_quality_status_check
  CHECK (quality_status IS NULL OR quality_status IN ('ok', 'failed'));

COMMENT ON COLUMN public.ai_question_cache.is_active IS
  'false = wird nicht mehr ausgeliefert (Qualitaetspruefung nicht bestanden).';
COMMENT ON COLUMN public.ai_question_cache.quality_checked_at IS
  'Zeitpunkt der letzten Pruefung. NULL = noch nie geprueft.';
COMMENT ON COLUMN public.ai_question_cache.quality_issues IS
  'Befund bei quality_status = failed, z. B. "erwartet 19, angegeben 21".';
COMMENT ON COLUMN public.ai_question_cache.quality_model IS
  'Welches Modell geurteilt hat - bzw. math-validator bei deterministischer Pruefung.';

CREATE INDEX idx_aqc_quality_queue
  ON public.ai_question_cache (quality_checked_at NULLS FIRST);

DROP INDEX IF EXISTS idx_ai_question_cache_lookup;
CREATE INDEX idx_ai_question_cache_lookup
  ON public.ai_question_cache (grade, subject, difficulty, category, is_active, times_served);

INSERT INTO public.ai_model_config
  (use_case, display_name, primary_model, fallback_models, provider_order, temperature,
   thinking_level, max_output_tokens, provider_routing, deprecation_date, is_active, notes)
VALUES
  ('question_generator_batch', 'Fragengenerator (Batch / Vorgenerierung)',
   'qwen/qwen-2.5-72b-instruct:free',
   '["deepseek/deepseek-chat-v3-0324:free","meta-llama/llama-3.3-70b-instruct:free"]'::jsonb,
   '["openrouter"]'::jsonb, 0.8,
   NULL, 2048, NULL, NULL, true,
   'Kostenlos. Kein bezahlter Fallback - bei Nichtverfuegbarkeit bricht der Lauf ab.'),

  ('quality_check', 'Cache-Qualitaetspruefung',
   'deepseek/deepseek-chat-v3-0324:free',
   '["qwen/qwen-2.5-72b-instruct:free"]'::jsonb,
   '["openrouter"]'::jsonb, 0.1,
   NULL, 512, NULL, NULL, true,
   'Kostenlos. Deterministische Mathe-Pruefung ist vorgelagert und spart Aufrufe.')

ON CONFLICT (use_case) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  primary_model     = EXCLUDED.primary_model,
  fallback_models   = EXCLUDED.fallback_models,
  provider_order    = EXCLUDED.provider_order,
  temperature       = EXCLUDED.temperature,
  thinking_level    = EXCLUDED.thinking_level,
  max_output_tokens = EXCLUDED.max_output_tokens,
  provider_routing  = EXCLUDED.provider_routing,
  is_active         = EXCLUDED.is_active,
  notes             = EXCLUDED.notes;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'cache-prefill-regular',
      'cache-quality-check-regular',
      'cache-cleanup-daily'
    )
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'cache-prefill-regular',
  '0 0,8,16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-prefill',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron","maxQuestions":12}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'cache-quality-check-regular',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-quality-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron","maxChecks":20}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'cache-cleanup-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cache-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);