-- Phase 3: Delete generated_templates table and clean up foreign keys

-- First, check if template_metrics references generated_templates
-- If so, update to reference templates table instead
ALTER TABLE template_metrics 
DROP CONSTRAINT IF EXISTS template_metrics_template_id_fkey;

-- Add proper foreign key to templates table
ALTER TABLE template_metrics 
ADD CONSTRAINT template_metrics_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Drop the generated_templates table completely
DROP TABLE IF EXISTS generated_templates;

-- Drop generation_sessions table as it was also only used with generated_templates
DROP TABLE IF EXISTS generation_sessions;

-- Clean up any indexes or constraints that might reference the old table
DROP INDEX IF EXISTS idx_generated_templates_category_grade;
DROP INDEX IF EXISTS idx_generated_templates_content_hash;
DROP INDEX IF EXISTS idx_generated_templates_quality_score;

-- Add useful indexes to the templates table for better performance
CREATE INDEX IF NOT EXISTS idx_templates_domain_grade_status 
ON templates(domain, grade, status);

CREATE INDEX IF NOT EXISTS idx_templates_grade_quarter_status 
ON templates(grade, quarter_app, status);

CREATE INDEX IF NOT EXISTS idx_templates_status_qscore 
ON templates(status, qscore) 
WHERE status = 'ACTIVE';

-- Log the cleanup
INSERT INTO template_events (type, payload) 
VALUES ('table_cleanup', jsonb_build_object(
  'action', 'dropped_generated_templates_table',
  'timestamp', now(),
  'message', 'Consolidated to single templates table'
));