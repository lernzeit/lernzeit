-- Fix security warnings by adding search_path to functions
DROP FUNCTION IF EXISTS analyze_template_solutions();
DROP FUNCTION IF EXISTS validate_template_solution(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION analyze_template_solutions()
RETURNS TABLE (
  solution_format text,
  example_solution text,
  example_prompt text,
  count bigint
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN t.solution::text LIKE '{"value":%' THEN 'object_with_value'
      WHEN t.solution::text ~ '^\d+(\.\d+)?$' THEN 'direct_number'
      WHEN t.solution::text ~ '^"\d+(\.\d+)?"$' THEN 'quoted_number'
      WHEN t.solution::text LIKE '%map[value:%' THEN 'map_format'
      ELSE 'other'
    END as format_type,
    t.solution::text as example,
    t.student_prompt as prompt_example,
    COUNT(*) as template_count
  FROM public.templates t 
  WHERE t.status = 'ACTIVE' 
    AND t.domain = 'Zahlen & Operationen'
  GROUP BY format_type, t.solution::text, t.student_prompt
  ORDER BY template_count DESC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION validate_template_solution(
  template_id uuid,
  prompt text,
  current_solution jsonb
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parsed_result jsonb;
  is_valid boolean := false;
BEGIN
  IF current_solution ? 'value' THEN
    RETURN current_solution;
  ELSIF jsonb_typeof(current_solution) = 'string' THEN
    RETURN jsonb_build_object('value', current_solution #>> '{}');
  ELSIF jsonb_typeof(current_solution) = 'number' THEN
    RETURN jsonb_build_object('value', current_solution);
  ELSE
    RETURN jsonb_build_object('value', 'INVALID', 'needs_regeneration', true);
  END IF;
END;
$$;