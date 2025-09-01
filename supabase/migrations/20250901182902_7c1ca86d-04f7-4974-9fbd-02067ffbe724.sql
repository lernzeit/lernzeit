-- Phase 1: Clean up incorrect templates (fractions not in curriculum)
-- Delete all fraction-related templates that don't belong in curriculum

-- First, let's see what we have
-- DELETE templates with fraction content that shouldn't exist for Grade 4 Q4
DELETE FROM public.templates 
WHERE grade = 4 
  AND quarter_app = 'Q4'
  AND (
    student_prompt ILIKE '%bruch%' 
    OR student_prompt ILIKE '%nenner%'
    OR student_prompt ILIKE '%zähler%'
    OR student_prompt ILIKE '%/%'
    OR student_prompt LIKE '%1/2%'
    OR student_prompt LIKE '%2/3%'
    OR student_prompt LIKE '%3/4%'
    OR solution::text ILIKE '%/%'
  );

-- Also clean up templates for other grades that have incorrect content
-- This is a broader cleanup of non-curriculum content
DELETE FROM public.templates 
WHERE (
  -- Remove fraction content from grades 1-4 (fractions start in grade 5)
  (grade BETWEEN 1 AND 4 AND (
    student_prompt ILIKE '%bruch%' 
    OR student_prompt ILIKE '%nenner%'
    OR student_prompt ILIKE '%zähler%'
    OR student_prompt ILIKE '%/%'
    OR solution::text ILIKE '%/%'
  ))
);