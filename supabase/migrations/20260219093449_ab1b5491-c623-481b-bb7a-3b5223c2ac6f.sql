
-- Drop legacy tables
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.topics CASCADE;

-- Drop legacy DB functions that call deleted edge functions
DROP FUNCTION IF EXISTS public.trigger_template_generation();
DROP FUNCTION IF EXISTS public.trigger_curriculum_template_generation();
DROP FUNCTION IF EXISTS public.trigger_auto_question_generation();
DROP FUNCTION IF EXISTS public.trigger_batch_generation();
DROP FUNCTION IF EXISTS public.trigger_cleanup_faulty_questions();
DROP FUNCTION IF EXISTS public.trigger_duplicate_cleanup();
DROP FUNCTION IF EXISTS public.trigger_math_curriculum_seeder();

-- Drop legacy functions that queried the now-deleted templates table
DROP FUNCTION IF EXISTS public.find_duplicate_templates();
DROP FUNCTION IF EXISTS public.analyze_template_solutions();
DROP FUNCTION IF EXISTS public.validate_template_solution(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.apply_template_stat(uuid, boolean);
DROP FUNCTION IF EXISTS public.apply_template_rating(uuid, integer);
DROP FUNCTION IF EXISTS public.validate_template_quality();
DROP FUNCTION IF EXISTS public.cleanup_old_question_history();
DROP FUNCTION IF EXISTS public.update_context_updated_at();
