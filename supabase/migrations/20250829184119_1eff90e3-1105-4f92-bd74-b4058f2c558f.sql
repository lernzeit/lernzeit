-- Phase 1 CORRECTED: Reactivate German math templates
UPDATE generated_templates 
SET is_active = true, updated_at = now()
WHERE is_active = false 
  AND quality_score > 0.7
  AND category = 'Mathematik'; -- CORRECT German category name

-- Check status after reactivation  
SELECT 
  category,
  COUNT(*) as total,
  SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN quality_score > 0.7 THEN 1 ELSE 0 END) as high_quality,
  AVG(quality_score) as avg_quality
FROM generated_templates 
WHERE category = 'Mathematik'
GROUP BY category;