-- Steuerung des Theoriefragen-Anteils pro Fach und Klassenstufe.
--
-- Hintergrund: Ab Klasse 4/5 werden reine Rechenaufgaben zunehmend zu schwer,
-- um sie im Kopf zu lösen. Ein konfigurierbarer Anteil an Theoriefragen
-- (Fachbegriffe, Definitionen, Eigenschaften) hält den Spielfluss aufrecht,
-- ohne die fachliche Tiefe zu senken.
--
-- Die Werte sind im Admin-Dashboard editierbar; die Edge Functions lesen sie
-- mit kurzem In-Memory-Cache.

CREATE TABLE IF NOT EXISTS public.question_category_mix (
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

-- RLS nach dem Muster von prompt_rules
ALTER TABLE public.question_category_mix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read category mix" ON public.question_category_mix;
CREATE POLICY "Authenticated users can read category mix"
  ON public.question_category_mix FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages category mix" ON public.question_category_mix;
CREATE POLICY "Service role manages category mix"
  ON public.question_category_mix FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage category mix" ON public.question_category_mix;
CREATE POLICY "Admins can manage category mix"
  ON public.question_category_mix FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── Didaktische Default-Werte ───────────────────────────────────────────────
--
-- Mathematik ab Klasse 3: dort werden die ersten Fachbegriffe eingefuehrt
-- (Summand, Differenz, Produkt, Quotient, Faktor). Klasse 1-2 bleibt bei 0,
-- weil die Fachsprache dort noch nicht Lehrplaninhalt ist.
--
-- Physik und Chemie liegen hoeher: beide Faecher sind begriffslastiger, in
-- Chemie ist ein grosser Teil des Lehrplans reine Nomenklatur.

INSERT INTO public.question_category_mix (subject, grade, theory_percentage) VALUES
  -- Mathematik (Klasse 1-10)
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
  -- Physik (Klasse 5-10)
  ('physics', 5, 30),
  ('physics', 6, 30),
  ('physics', 7, 35),
  ('physics', 8, 35),
  ('physics', 9, 40),
  ('physics', 10, 40),
  -- Chemie (Klasse 7-10)
  ('chemistry', 7, 35),
  ('chemistry', 8, 40),
  ('chemistry', 9, 40),
  ('chemistry', 10, 45)
ON CONFLICT (subject, grade) DO NOTHING;

-- updated_at automatisch pflegen
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

DROP TRIGGER IF EXISTS question_category_mix_touch ON public.question_category_mix;
CREATE TRIGGER question_category_mix_touch
  BEFORE UPDATE ON public.question_category_mix
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_question_category_mix();
