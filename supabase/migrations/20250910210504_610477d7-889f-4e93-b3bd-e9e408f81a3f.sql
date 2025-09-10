-- Archive problematic templates from September 10th (keep Sep 2nd templates active)
UPDATE templates 
SET status = 'ARCHIVED'
WHERE DATE(created_at) = '2025-09-10' 
  AND status = 'ACTIVE';

-- Ensure Sep 2nd templates remain active
UPDATE templates 
SET status = 'ACTIVE'
WHERE DATE(created_at) = '2025-09-02';