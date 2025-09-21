-- Deactivate problematic first-grade templates with malformed JSON solutions
-- Focus on SORT and MATCH questions where solution should be JSON but is string

UPDATE public.templates 
SET status = 'INACTIVE',
    updated_at = now()
WHERE grade = 1 
  AND status = 'ACTIVE'
  AND (
    -- SORT questions with string solutions instead of JSON objects
    (question_type = 'SORT' AND jsonb_typeof(solution) = 'string')
    OR
    -- MATCH questions with string solutions instead of JSON objects  
    (question_type = 'MATCH' AND jsonb_typeof(solution) = 'string')
    OR
    -- Inconsistent question_type capitalization (should be uppercase)
    question_type IN ('sort', 'match', 'multiple-choice', 'text', 'freetext')
  );