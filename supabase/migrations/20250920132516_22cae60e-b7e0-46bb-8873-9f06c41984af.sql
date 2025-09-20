-- Fix case inconsistency in question_type for sort questions
UPDATE templates 
SET question_type = 'SORT' 
WHERE LOWER(question_type) = 'sort';

-- Standardize solution format for sort questions to be consistent arrays
-- This will help with validation logic
UPDATE templates 
SET solution = jsonb_build_object(
  'value', 
  CASE 
    WHEN solution ? 'value' AND jsonb_typeof(solution->'value') = 'array' THEN solution->'value'
    WHEN solution ? 'value' AND jsonb_typeof(solution->'value') = 'string' THEN 
      to_jsonb(string_to_array(trim(both '"' from (solution->>'value')), ', '))
    WHEN jsonb_typeof(solution) = 'string' THEN 
      to_jsonb(string_to_array(trim(both '"' from solution::text), ', '))
    ELSE solution
  END
)
WHERE question_type = 'SORT' 
AND (
  (solution ? 'value' AND jsonb_typeof(solution->'value') = 'string') OR
  (jsonb_typeof(solution) = 'string')
);