-- Phase 1: Database Cleanup and Analysis
-- Create function to validate mathematical solutions using German math parser

-- First, let's analyze current solution formats
CREATE OR REPLACE FUNCTION analyze_template_solutions()
RETURNS TABLE (
  solution_format text,
  example_solution text,
  example_prompt text,
  count bigint
) AS $$
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
  FROM templates t 
  WHERE t.status = 'ACTIVE' 
    AND t.domain = 'Zahlen & Operationen'
  GROUP BY format_type, t.solution::text, t.student_prompt
  ORDER BY template_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate and fix template solutions
CREATE OR REPLACE FUNCTION validate_template_solution(
  template_id uuid,
  prompt text,
  current_solution jsonb
) RETURNS jsonb AS $$
DECLARE
  parsed_result jsonb;
  is_valid boolean := false;
BEGIN
  -- This will be enhanced with actual math parser validation
  -- For now, return the current solution format standardized
  
  IF current_solution ? 'value' THEN
    -- Already has correct format
    RETURN current_solution;
  ELSIF jsonb_typeof(current_solution) = 'string' THEN
    -- Convert string to object format
    RETURN jsonb_build_object('value', current_solution #>> '{}');
  ELSIF jsonb_typeof(current_solution) = 'number' THEN
    -- Convert number to object format  
    RETURN jsonb_build_object('value', current_solution);
  ELSE
    -- Invalid format, mark for regeneration
    RETURN jsonb_build_object('value', 'INVALID', 'needs_regeneration', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add quality score tracking
ALTER TABLE templates ADD COLUMN IF NOT EXISTS quality_score real DEFAULT 0.0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS last_validated timestamp with time zone;