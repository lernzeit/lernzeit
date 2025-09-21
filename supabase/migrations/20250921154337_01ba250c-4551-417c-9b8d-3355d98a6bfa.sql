-- Fix problematic first-grade templates
-- 1. Archive templates with subjective content
UPDATE public.templates 
SET status = 'ARCHIVED', 
    validation_status = 'invalid',
    quality_score = 0.1
WHERE grade = 1 
  AND status = 'ACTIVE'
  AND (
    student_prompt ILIKE '%lieblings%' 
    OR student_prompt ILIKE '%schönst%'
    OR student_prompt ILIKE '%best%'
    OR student_prompt ILIKE '%miss dein%'
    OR student_prompt ILIKE '%länge dein%'
    OR student_prompt ILIKE '%größe dein%'
    OR student_prompt ILIKE '%sortier%welch%'
  );

-- 2. Archive MATCH/SORT templates for grade 1 (until we have better structured data)
UPDATE public.templates 
SET status = 'ARCHIVED',
    validation_status = 'invalid',
    quality_score = 0.2
WHERE grade = 1 
  AND status = 'ACTIVE'
  AND question_type IN ('MATCH', 'SORT');

-- 3. Fix malformed solutions for remaining grade 1 templates
UPDATE public.templates 
SET solution = jsonb_build_object('value', CASE 
  WHEN solution::text ~ '^\d+$' THEN solution::text
  WHEN solution::text ~ '^"\d+"$' THEN trim(both '"' from solution::text)
  ELSE '1'
END)
WHERE grade = 1 
  AND status = 'ACTIVE'
  AND (
    solution IS NULL 
    OR solution::text = 'null'
    OR solution::text = '""'
    OR solution::text ILIKE '%undefined%'
  );

-- 4. Archive templates with insufficient distractors for MULTIPLE_CHOICE
UPDATE public.templates 
SET status = 'ARCHIVED',
    validation_status = 'invalid',
    quality_score = 0.1
WHERE grade = 1 
  AND status = 'ACTIVE'
  AND question_type = 'MULTIPLE_CHOICE'
  AND (
    distractors IS NULL 
    OR jsonb_array_length(distractors) < 2
    OR distractors::text = '[]'
  );

-- 5. Create log entry for this cleanup
INSERT INTO public.templates (
  grade, domain, subcategory, difficulty, question_type, 
  student_prompt, solution, status, quarter_app
) VALUES (
  1, 'System', 'Maintenance', 'info', 'TEXT',
  'Cleanup durchgeführt: Problematische Erstklässler-Templates archiviert',
  '{"value": "completed"}', 'ARCHIVED', 'Q1'
);