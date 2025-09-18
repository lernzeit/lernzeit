-- Analyze duplicate templates in the database
WITH duplicates AS (
  SELECT 
    TRIM(LOWER(REPLACE(REPLACE(student_prompt, ' plus ', ' + '), '  ', ' '))) as normalized_prompt,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as all_ids,
    MIN(created_at) as earliest_created,
    STRING_AGG(DISTINCT student_prompt, ' | ') as original_prompts
  FROM public.templates 
  WHERE status = 'ACTIVE' 
  GROUP BY TRIM(LOWER(REPLACE(REPLACE(student_prompt, ' plus ', ' + '), '  ', ' ')))
  HAVING COUNT(*) > 1 
  ORDER BY COUNT(*) DESC
  LIMIT 10
)
SELECT * FROM duplicates;