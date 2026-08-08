-- Kategorie am Fragen-Cache, damit das Theorie/Rechnen-Verhaeltnis auch bei
-- Cache-Treffern eingehalten wird.
--
-- Ohne diese Spalte wuerde der konfigurierte Anteil nur bei frisch generierten
-- Fragen greifen; aus dem Cache kaeme weiterhin eine zufaellige Mischung.

ALTER TABLE public.ai_question_cache
  ADD COLUMN category text NOT NULL DEFAULT 'calculation';

COMMENT ON COLUMN public.ai_question_cache.category IS
  'calculation = Rechenaufgabe, theory = Fachbegriff/Definition.';

-- Bestandszeilen sind durchweg Rechenaufgaben und behalten den Default.

ALTER TABLE public.ai_question_cache
  ADD CONSTRAINT ai_question_cache_category_check
  CHECK (category IN ('calculation', 'theory'));

-- Der Cache-First-Pfad selektiert kuenftig ueber grade+subject+difficulty+category
-- und sortiert nach times_served.
CREATE INDEX IF NOT EXISTS idx_ai_question_cache_lookup
  ON public.ai_question_cache (grade, subject, difficulty, category, times_served);
