-- ============================================
-- PHASE 1: Neue vereinfachte Datenbank-Struktur
-- ============================================

-- 1. Topics Tabelle (Themen pro Klassenstufe und Fach)
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL CHECK (grade >= 1 AND grade <= 10),
  subject text NOT NULL, -- 'math', 'german', 'english', etc.
  title text NOT NULL, -- 'Umrechnen von Einheiten', 'Bruchrechnung', etc.
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade, subject, title)
);

-- 2. Questions Tabelle (Vereinfachte Fragenstruktur)
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  
  -- Frage-Inhalt
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH')),
  
  -- Antworten/Optionen als JSON
  correct_answer jsonb NOT NULL, -- Format abhängig von question_type
  options jsonb, -- Für MULTIPLE_CHOICE: Array von Optionen, für MATCH: {leftItems, rightItems, correctMatches}
  
  -- Qualität und Status
  quality_score real DEFAULT 0.8,
  is_active boolean DEFAULT true,
  
  -- Statistik
  plays integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS Policies für Topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active topics"
  ON public.topics FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage topics"
  ON public.topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. RLS Policies für Questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active questions"
  ON public.questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Indices für Performance
CREATE INDEX idx_topics_grade_subject ON public.topics(grade, subject) WHERE is_active = true;
CREATE INDEX idx_questions_topic_active ON public.questions(topic_id) WHERE is_active = true;
CREATE INDEX idx_questions_quality ON public.questions(quality_score DESC) WHERE is_active = true;

-- 6. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Initial Topics (Beispiele für Klasse 1-5, Mathematik)
INSERT INTO public.topics (grade, subject, title, description) VALUES
  -- Klasse 1
  (1, 'math', 'Zahlen bis 10', 'Zählen, Vergleichen und erste Rechenoperationen im Zahlenraum bis 10'),
  (1, 'math', 'Addition und Subtraktion bis 20', 'Erste Plus- und Minusaufgaben ohne Zehnerübergang'),
  (1, 'math', 'Formen erkennen', 'Kreis, Dreieck, Quadrat und Rechteck unterscheiden'),
  
  -- Klasse 2
  (2, 'math', 'Addition und Subtraktion bis 100', 'Rechnen im Zahlenraum bis 100'),
  (2, 'math', 'Einmaleins', 'Das kleine Einmaleins lernen und üben'),
  (2, 'math', 'Zeit und Uhr', 'Uhr lesen (volle und halbe Stunde)'),
  
  -- Klasse 3
  (3, 'math', 'Schriftliche Addition und Subtraktion', 'Schriftliche Rechenverfahren im Zahlenraum bis 1000'),
  (3, 'math', 'Division', 'Teilen mit und ohne Rest'),
  (3, 'math', 'Geometrie', 'Flächen und Körper, Umfang berechnen'),
  
  -- Klasse 4
  (4, 'math', 'Große Zahlen', 'Zahlenraum bis 1 Million, Stellenwerte'),
  (4, 'math', 'Schriftliche Multiplikation und Division', 'Alle schriftlichen Rechenverfahren'),
  (4, 'math', 'Brüche', 'Bruchvorstellung und erste Bruchrechnungen'),
  
  -- Klasse 5
  (5, 'math', 'Umrechnen von Einheiten', 'Längen, Gewichte, Zeiteinheiten umrechnen'),
  (5, 'math', 'Bruchrechnung', 'Erweitern, Kürzen, Addition und Subtraktion von Brüchen'),
  (5, 'math', 'Dezimalzahlen', 'Dezimalbrüche verstehen und rechnen'),
  (5, 'math', 'Prozentrechnung Grundlagen', 'Prozente verstehen und berechnen')
ON CONFLICT (grade, subject, title) DO NOTHING;

-- 8. Kommentare für Dokumentation
COMMENT ON TABLE public.topics IS 'Vereinfachte Themen-Struktur: Klassenstufe -> Fach -> Thema';
COMMENT ON TABLE public.questions IS 'Vollständig von KI generierte Fragen mit allen Antworten. Keine Erklärung gespeichert (wird on-demand generiert).';
COMMENT ON COLUMN public.questions.correct_answer IS 'Format: FREETEXT: {"value": "42"}, MULTIPLE_CHOICE: {"value": "A"}, SORT: {"order": ["a","b","c"]}, MATCH: {"pairs": [["item1","match1"]]}';
COMMENT ON COLUMN public.questions.options IS 'Format: MULTIPLE_CHOICE: ["Option A", "Option B", ...], MATCH: {"leftItems": [...], "rightItems": [...], "correctMatches": {...}}';