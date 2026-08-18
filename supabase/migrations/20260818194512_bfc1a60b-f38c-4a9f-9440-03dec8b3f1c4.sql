CREATE OR REPLACE FUNCTION public.get_demo_questions(p_grade integer, p_subject text, p_limit integer DEFAULT 5)
RETURNS TABLE (
  question_text text,
  question_type text,
  correct_answer jsonb,
  options jsonb,
  hint text,
  difficulty text,
  grade integer,
  subject text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.question_text,
         q.question_type,
         q.correct_answer,
         q.options,
         q.hint,
         q.difficulty,
         q.grade,
         q.subject
  FROM public.ai_question_cache q
  WHERE q.grade = p_grade
    AND q.subject = p_subject
    AND q.is_active = true
    AND (q.quality_status IS NULL OR q.quality_status <> 'rejected')
    AND q.question_type IN ('FREETEXT', 'MULTIPLE_CHOICE')
  ORDER BY random()
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
$$;

REVOKE ALL ON FUNCTION public.get_demo_questions(integer, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_demo_questions(integer, text, integer) TO anon, authenticated, service_role;