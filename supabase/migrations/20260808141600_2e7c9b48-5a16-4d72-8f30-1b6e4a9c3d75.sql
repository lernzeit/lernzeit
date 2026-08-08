-- Hintergrundjobs auf kostenlose Modelle umstellen.
--
-- ABGRENZUNG: Nur `question_generator_batch` (Vorproduktion) und der neue
-- `quality_check` laufen kostenlos. Alle Use-Cases, bei denen jemand auf eine
-- Antwort wartet - question_generator_live, validate_answer, ai_explain,
-- ai_tutor, analyze_feedback, learning_plan - bleiben unveraendert auf Gemini.
-- Kostenlose Modelle sind langsam und hart rate-limitiert; im Live-Pfad waere
-- das nicht vertretbar.
--
-- Zwei bewusste Abweichungen von den Live-Konfigurationen:
--
--   1. provider_order = ["openrouter"] OHNE gemini_direct. Ein Fallback auf ein
--      bezahltes Modell wuerde den Zweck der Uebung aufheben. Ist das freie
--      Modell nicht erreichbar, bricht der Lauf ab - der naechste holt es nach.
--      Das ist folgenlos, weil der Zeitpunkt dieser Jobs unerheblich ist.
--
--   2. provider_routing = NULL statt {"only":["groq"]}. Groq liefert die
--      :free-Varianten nicht aus; die Groq-Fixierung wuerde jeden Aufruf
--      scheitern lassen.

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
