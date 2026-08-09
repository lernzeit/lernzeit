-- Qualitaetspruefung fuer den Fragen-Cache.
--
-- Bisher pruefte nichts den Bestand: Eine einmal falsch generierte Frage blieb
-- dauerhaft drin und wurde immer wieder ausgeliefert. Der neue Job
-- `cache-quality-check` rechnet Aufgaben nach und beurteilt Theoriefragen
-- fachlich; was durchfaellt, wird deaktiviert statt geloescht, damit ein
-- Fehlurteil des Pruefmodells korrigierbar bleibt.

ALTER TABLE public.ai_question_cache
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_status text,
  ADD COLUMN IF NOT EXISTS quality_issues text,
  ADD COLUMN IF NOT EXISTS quality_model text;

ALTER TABLE public.ai_question_cache
  DROP CONSTRAINT IF EXISTS ai_question_cache_quality_status_check;
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

-- Pruefreihenfolge: ungeprueft zuerst, danach am laengsten nicht geprueft.
-- NULLS FIRST bildet genau das im Index ab.
CREATE INDEX IF NOT EXISTS idx_aqc_quality_queue
  ON public.ai_question_cache (quality_checked_at NULLS FIRST);

-- Der Auslieferungspfad filtert kuenftig zusaetzlich auf is_active.
DROP INDEX IF EXISTS idx_ai_question_cache_lookup;
CREATE INDEX IF NOT EXISTS idx_ai_question_cache_lookup
  ON public.ai_question_cache (grade, subject, difficulty, category, is_active, times_served);
