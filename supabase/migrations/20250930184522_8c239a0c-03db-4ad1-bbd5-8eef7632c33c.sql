-- Add template_id to question_feedback table
ALTER TABLE public.question_feedback
ADD COLUMN IF NOT EXISTS template_id uuid;

-- Create index for faster feedback lookups
CREATE INDEX IF NOT EXISTS idx_question_feedback_template_id 
ON public.question_feedback(template_id);

CREATE INDEX IF NOT EXISTS idx_question_feedback_type 
ON public.question_feedback(feedback_type);

-- Create function to get feedback statistics per template
CREATE OR REPLACE FUNCTION get_template_feedback_stats()
RETURNS TABLE (
  template_id uuid,
  total_feedback bigint,
  thumbs_up_count bigint,
  thumbs_down_count bigint,
  too_hard_count bigint,
  too_easy_count bigint,
  negative_ratio numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qf.template_id,
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE qf.feedback_type = 'thumbs_up') as thumbs_up_count,
    COUNT(*) FILTER (WHERE qf.feedback_type = 'thumbs_down') as thumbs_down_count,
    COUNT(*) FILTER (WHERE qf.feedback_type = 'too_hard') as too_hard_count,
    COUNT(*) FILTER (WHERE qf.feedback_type = 'too_easy') as too_easy_count,
    (COUNT(*) FILTER (WHERE qf.feedback_type IN ('thumbs_down', 'too_hard'))::numeric / 
     NULLIF(COUNT(*), 0)::numeric) as negative_ratio
  FROM public.question_feedback qf
  WHERE qf.template_id IS NOT NULL
  GROUP BY qf.template_id
  HAVING COUNT(*) >= 3
  ORDER BY negative_ratio DESC;
END;
$$;