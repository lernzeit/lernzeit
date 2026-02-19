-- Phase 2A: Create ai_question_cache table for smart caching & deduplication
CREATE TABLE public.ai_question_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  correct_answer JSONB NOT NULL,
  options JSONB,
  hint TEXT,
  task TEXT,
  times_served INTEGER NOT NULL DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for difficulty
CREATE OR REPLACE FUNCTION public.validate_ai_question_cache_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'difficulty must be easy, medium, or hard';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ai_question_cache_difficulty_check
  BEFORE INSERT OR UPDATE ON public.ai_question_cache
  FOR EACH ROW EXECUTE FUNCTION public.validate_ai_question_cache_difficulty();

-- Fast lookup by grade+subject+difficulty
CREATE INDEX idx_ai_question_cache_lookup
  ON public.ai_question_cache(grade, subject, difficulty);

-- Round-robin rotation index
CREATE INDEX idx_ai_question_cache_rotation
  ON public.ai_question_cache(grade, subject, last_served_at NULLS FIRST);

-- RLS
ALTER TABLE public.ai_question_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
  ON public.ai_question_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages cache"
  ON public.ai_question_cache FOR ALL
  TO service_role
  USING (true);

-- Drop legacy tables no longer needed
DROP TABLE IF EXISTS public.curriculum_parameter_rules CASCADE;
DROP TABLE IF EXISTS public.scenario_families CASCADE;
DROP TABLE IF EXISTS public.user_context_history CASCADE;
DROP TABLE IF EXISTS public.question_quality_metrics CASCADE;