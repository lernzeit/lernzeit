-- Archive problematic templates (keep Sep 2nd templates active)
UPDATE templates 
SET status = 'LEGACY'
WHERE created_at >= '2025-09-03' 
  AND (status IS NULL OR status != 'LEGACY');

-- Ensure Sep 2nd templates remain active
UPDATE templates 
SET status = 'ACTIVE'
WHERE DATE(created_at) = '2025-09-02';