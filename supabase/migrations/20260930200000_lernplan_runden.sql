-- Welche Runde gehoert zu welchem Lernplan?
--
-- Befund 30.09.2026: Ein frisch erstellter Lernplan fuer Klara zeigte
-- "1/5 Tage geuebt" und 2/5 (40 %), obwohl sie ihn nie geoeffnet hatte. Die
-- Fortschrittsanzeige zaehlte JEDE Mathe-Runde ab Mitternacht des
-- Erstellungstags — hier eine freie Mathe-Runde um 16:33, fuenf Stunden
-- bevor der Plan angelegt wurde.
--
-- Runden, die ueber die Lernplan-Karte gestartet werden, tragen ab jetzt die
-- ID des Plans; nur sie zaehlen als Fortschritt. Aeltere Runden bleiben
-- ohne Bezug (NULL) — rueckwirkend laesst sich nicht sagen, welche davon aus
-- dem Plan kamen.
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS learning_plan_id uuid
  REFERENCES public.learning_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_game_sessions_learning_plan_id
  ON public.game_sessions (learning_plan_id)
  WHERE learning_plan_id IS NOT NULL;

COMMENT ON COLUMN public.game_sessions.learning_plan_id IS
  'Lernplan, aus dem die Runde gestartet wurde (Lernplan-Karte). NULL = freie Runde.';
