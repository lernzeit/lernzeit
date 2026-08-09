-- Hintergrundjobs von kostenlosen auf guenstige bezahlte Modelle umstellen.
--
-- Vorgeschichte: Beide Jobs liefen auf :free-Modellen bei OpenRouter und
-- lieferten durchgehend HTTP 404. Die Datenschutz-Einstellungen des Kontos
-- waren korrekt (freie Endpunkte mit Trainingserlaubnis sind freigegeben) -
-- die Modell-IDs selbst existierten nicht. Sie stammten aus einer Websuche,
-- weil die OpenRouter-API aus der Entwicklungsumgebung nicht erreichbar ist.
--
-- Statt weitere IDs zu raten, laufen beide Jobs jetzt auf
-- google/gemini-3.1-flash-lite. Dieses Modell bedient bereits den Live-Pfad
-- (question_generator_live) und ist damit nachweislich erreichbar.
--
-- Kosten bei ~96 Aufrufen/Tag: rund 0,40 USD pro Monat. Das Tagesbudget in
-- _shared/job-budget.ts bleibt als Deckel bestehen und begrenzt jetzt echtes
-- Geld statt eines Gratis-Kontingents.
--
-- ABGRENZUNG UNVERAENDERT: Die Live-Use-Cases werden nicht angefasst.

UPDATE public.ai_model_config
SET primary_model     = 'google/gemini-3.5-flash',
    fallback_models   = '["openai/gpt-oss-120b"]'::jsonb,
    provider_order    = '["gemini_direct","openrouter"]'::jsonb,
    temperature       = 1.0,
    thinking_level    = 'medium',
    max_output_tokens = 2048,
    provider_routing  = '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb,
    notes             = 'Vorproduktion. Qualitaet vor Latenz, daher das groessere Flash-Modell. Tagesbudget in job-budget.ts deckelt die Kosten.'
WHERE use_case = 'question_generator_batch';

UPDATE public.ai_model_config
SET primary_model     = 'google/gemini-3.1-flash-lite',
    fallback_models   = '["openai/gpt-oss-120b"]'::jsonb,
    provider_order    = '["gemini_direct","openrouter"]'::jsonb,
    temperature       = 1.0,
    thinking_level    = 'low',
    max_output_tokens = 512,
    provider_routing  = '{"only":["groq"],"allow_fallbacks":false,"data_collection":"deny"}'::jsonb,
    notes             = 'Cache-Qualitaetspruefung. Deterministische Mathe-Pruefung ist vorgelagert und spart Aufrufe.'
WHERE use_case = 'quality_check';

-- Kontrolle: beide Zeilen muessen jetzt auf google/gemini-* zeigen.
DO $$
DECLARE bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.ai_model_config
  WHERE use_case IN ('question_generator_batch', 'quality_check')
    AND primary_model NOT LIKE 'google/gemini-%';
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Modellumstellung unvollstaendig: % Zeile(n) zeigen nicht auf ein Gemini-Modell', bad_count;
  END IF;
END $$;
