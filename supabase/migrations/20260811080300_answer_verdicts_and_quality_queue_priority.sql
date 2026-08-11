-- Antwortpruefung nachvollziehbar machen und die Pruefreihenfolge nach
-- tatsaechlicher Auslieferung priorisieren.
--
-- Anlass: Eine Frage mit falscher Musterloesung ("Addiere 450 und 230 …",
-- hinterlegt 158, richtig 20) wurde ausgeliefert und als falsch bewertet,
-- obwohl das Kind richtig gerechnet hatte. Weder validate-answer noch die
-- Cache-Qualitaetspruefung haben das aufgefangen.
--
-- Beim Nachstellen fiel auf: Das Urteil der Pruefinstanzen wird nirgends
-- gespeichert. Ob im Einzelfall "user_correct" oder "stated_correct" entschieden
-- wurde, laesst sich nachtraeglich nicht feststellen - ein Sicherheitsnetz, das
-- man nicht beobachten kann, kann man nicht bewerten. Genau das aendert diese
-- Migration.

-- ── 1) Urteile protokollieren ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.answer_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Welche Instanz geurteilt hat: 'validate_answer' (sofort beim Absenden)
  -- oder 'ai_explain' (nur wenn das Kind auf "Erklaerung" tippt).
  source text NOT NULL,
  -- Wie entschieden wurde: 'math-validator' (nachgerechnet, kostenlos),
  -- 'llm' (Modellurteil) oder 'unparsed' (Antwort nicht lesbar).
  decided_by text NOT NULL,
  verdict text NOT NULL,
  accepted boolean NOT NULL,
  model text,
  grade integer,
  subject text,
  question_text text NOT NULL,
  stated_answer text,
  user_answer text,
  verified_correct_answer text,
  reason text
);

COMMENT ON TABLE public.answer_verdicts IS
  'Urteile der Antwortpruefung. Macht nachvollziehbar, warum eine Antwort als richtig oder falsch gewertet wurde.';

CREATE INDEX IF NOT EXISTS idx_answer_verdicts_created
  ON public.answer_verdicts (created_at DESC);

-- Faelle, in denen die hinterlegte Antwort widerlegt wurde - die Liste der
-- kaputten Fragen, nach Haeufigkeit.
CREATE INDEX IF NOT EXISTS idx_answer_verdicts_user_correct
  ON public.answer_verdicts (created_at DESC)
  WHERE verdict = 'user_correct';

ALTER TABLE public.answer_verdicts ENABLE ROW LEVEL SECURITY;

-- Kein Lesezugriff fuer normale Nutzer: Die Tabelle enthaelt Aufgabentexte
-- samt Loesungen. Schreiben ausschliesslich ueber die Edge Functions.
DROP POLICY IF EXISTS "Service role manages answer verdicts" ON public.answer_verdicts;
CREATE POLICY "Service role manages answer verdicts"
  ON public.answer_verdicts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read answer verdicts" ON public.answer_verdicts;
CREATE POLICY "Admins can read answer verdicts"
  ON public.answer_verdicts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 2) Pruefreihenfolge: haeufig ausgelieferte Fragen zuerst ────────────────
--
-- Bisher war die Reihenfolge unter den ungeprueften Fragen unbestimmt: Es wurde
-- nur nach quality_checked_at sortiert, und dort stehen bei allen ungeprueften
-- Zeilen NULL-Werte. Welche 50 ein Lauf erwischt, war damit Zufall.
--
-- Fragen, die schon oft ausgeliefert wurden, richten den groessten Schaden an -
-- sie gehoeren zuerst geprueft.
CREATE INDEX IF NOT EXISTS idx_aqc_quality_queue_served
  ON public.ai_question_cache (quality_checked_at NULLS FIRST, times_served DESC);

-- ── 3) Die konkret gemeldete Frage aus der Auslieferung nehmen ─────────────
--
-- 450 + 230 = 680; 3 * (450 - 230) = 660; 680 - 660 = 20. Hinterlegt war 158.
-- Sie wird nicht geloescht, damit die Qualitaetspruefung sie regulaer bewertet
-- und ein Fehlurteil korrigierbar bleibt.
UPDATE public.ai_question_cache
SET is_active = false,
    quality_status = 'failed',
    quality_issues = 'Falsche Musterloesung: hinterlegt "158", korrekt "20" (450+230=680; 3*(450-230)=660; 680-660=20). Zusaetzlich mehrschrittig und damit nicht kopfrechenbar.',
    quality_model = 'manual-review',
    quality_checked_at = now()
WHERE id = '6b65c018-fdfd-495b-8c29-064629444e5d';
