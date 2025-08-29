-- Phase 1: Reactivate high-quality deactivated templates  
UPDATE generated_templates 
SET is_active = true, updated_at = now()
WHERE is_active = false 
  AND quality_score > 0.7
  AND category = 'math';

-- Remove templates with defective placeholders that don't meet parser requirements
UPDATE generated_templates 
SET is_active = false, updated_at = now()
WHERE content LIKE '%{word1}%' 
   OR content LIKE '%{sechs}%' 
   OR content LIKE '%{sieben}%'
   OR content LIKE '%{acht}%'
   OR content LIKE '%{neun}%'
   OR content LIKE '%{zehn}%'
   OR content LIKE '%{Basic Exercise%'
   OR content LIKE '%Placeholder%';