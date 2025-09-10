-- Phase 1: Data Cleanup - Remove low-quality templates
-- First, let's see what we have
SELECT COUNT(*) as total_templates, 
       COUNT(CASE WHEN quality_score >= 0.7 THEN 1 END) as high_quality,
       COUNT(CASE WHEN explanation IS NULL OR explanation = '' THEN 1 END) as missing_explanations,
       COUNT(CASE WHEN created_at < '2024-09-02' THEN 1 END) as old_templates
FROM templates WHERE status = 'ACTIVE';

-- Delete templates with poor quality indicators
UPDATE templates 
SET status = 'ARCHIVED', 
    updated_at = now()
WHERE status = 'ACTIVE' 
AND (
    quality_score < 0.5 
    OR explanation IS NULL 
    OR explanation = '' 
    OR student_prompt LIKE '%undefined%'
    OR student_prompt LIKE '%null%'
    OR student_prompt LIKE '%NaN%'
    OR solution::text LIKE '%undefined%'
    OR solution::text LIKE '%null%'
);

-- Archive old templates that were likely parser-generated (before AI implementation)
UPDATE templates 
SET status = 'ARCHIVED',
    updated_at = now()  
WHERE status = 'ACTIVE' 
AND created_at < '2024-09-02'
AND (quality_score IS NULL OR quality_score < 0.7);

-- Create quality validation function for new templates
CREATE OR REPLACE FUNCTION validate_template_quality() 
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure high-quality AI-generated templates only
    IF NEW.student_prompt IS NULL 
       OR NEW.student_prompt = '' 
       OR NEW.explanation IS NULL 
       OR NEW.explanation = ''
       OR NEW.solution IS NULL
       OR NEW.student_prompt LIKE '%undefined%'
       OR NEW.student_prompt LIKE '%null%'
       OR NEW.student_prompt LIKE '%NaN%' THEN
        RAISE EXCEPTION 'Template quality validation failed: Missing required fields or contains error indicators';
    END IF;
    
    -- Set minimum quality score for new templates
    IF NEW.quality_score IS NULL THEN
        NEW.quality_score = 0.8;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quality validation
DROP TRIGGER IF EXISTS template_quality_check ON templates;
CREATE TRIGGER template_quality_check
    BEFORE INSERT OR UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION validate_template_quality();