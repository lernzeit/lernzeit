-- Template Consolidation Migration: Merge generated_templates into templates
-- This migration consolidates all template data into a single 'templates' table

-- First, ensure templates table has all necessary columns from generated_templates
-- Add missing columns if they don't exist
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS quality_score REAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Update templates table structure to match both schemas
-- Ensure all existing columns are compatible
ALTER TABLE public.templates 
ALTER COLUMN student_prompt SET NOT NULL,
ALTER COLUMN grade SET NOT NULL,
ALTER COLUMN domain SET NOT NULL;

-- Migrate data from generated_templates to templates
-- Map generated_templates fields to templates fields
INSERT INTO public.templates (
  grade,
  grade_app,
  quarter_app,
  domain,
  subcategory,
  difficulty,
  question_type,
  student_prompt,
  variables,
  solution,
  distractors,
  explanation_teacher,
  tags,
  status,
  content,
  content_hash,
  quality_score,
  usage_count,
  plays,
  correct,
  created_at,
  updated_at
)
SELECT 
  gt.grade,
  gt.grade as grade_app, -- Use same grade for grade_app
  'Q1'::text as quarter_app, -- Default quarter
  gt.category as domain,
  'Generated'::text as subcategory, -- Default subcategory
  CASE 
    WHEN gt.quality_score >= 0.8 THEN 'AFB I'
    WHEN gt.quality_score >= 0.6 THEN 'AFB II'
    ELSE 'AFB III'
  END as difficulty,
  gt.question_type,
  gt.content as student_prompt,
  '{}'::jsonb as variables, -- Default empty variables
  ''::jsonb as solution, -- Default empty solution
  '[]'::jsonb as distractors, -- Default empty distractors
  'Generated template'::text as explanation_teacher,
  '{"generated"}'::text[] as tags,
  CASE WHEN gt.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status,
  gt.content,
  gt.content_hash,
  gt.quality_score,
  gt.usage_count,
  gt.usage_count as plays, -- Map usage_count to plays
  COALESCE(ROUND(gt.usage_count * gt.quality_score), 0) as correct, -- Estimate correct answers
  gt.created_at,
  gt.updated_at
FROM public.generated_templates gt
WHERE NOT EXISTS (
  -- Avoid duplicates by checking content_hash
  SELECT 1 FROM public.templates t 
  WHERE t.content_hash = gt.content_hash 
  OR t.student_prompt = gt.content
);

-- Create indexes for better performance on the consolidated table
CREATE INDEX IF NOT EXISTS idx_templates_content_hash 
ON public.templates(content_hash) WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_templates_category_grade_active 
ON public.templates(domain, grade, status) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_templates_quality_score 
ON public.templates(quality_score DESC) WHERE status = 'ACTIVE';

-- Update any foreign key references before dropping generated_templates
-- Update template_metrics table to reference templates instead
UPDATE public.template_metrics 
SET template_id = (
  SELECT t.id FROM public.templates t 
  WHERE t.content_hash = (
    SELECT gt.content_hash FROM public.generated_templates gt 
    WHERE gt.id = template_metrics.template_id
  )
  LIMIT 1
)
WHERE template_id IN (SELECT id FROM public.generated_templates);

-- Drop the generated_templates table
DROP TABLE IF EXISTS public.generated_templates CASCADE;

-- Clean up any orphaned template_metrics
DELETE FROM public.template_metrics 
WHERE template_id NOT IN (SELECT id FROM public.templates);