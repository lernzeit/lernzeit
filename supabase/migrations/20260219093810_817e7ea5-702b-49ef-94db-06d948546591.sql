
-- Drop old template feedback stats function (references deleted templates table)
DROP FUNCTION IF EXISTS public.get_template_feedback_stats();

-- Create new cache stats function
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE(
  grade INTEGER,
  subject TEXT,
  total_questions BIGINT,
  avg_times_served NUMERIC,
  last_added_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aqc.grade,
    aqc.subject,
    COUNT(*) AS total_questions,
    ROUND(AVG(aqc.times_served), 2) AS avg_times_served,
    MAX(aqc.created_at) AS last_added_at
  FROM public.ai_question_cache aqc
  GROUP BY aqc.grade, aqc.subject
  ORDER BY aqc.grade, aqc.subject;
END;
$$;
