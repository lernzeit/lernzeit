-- Reaktiviere alle archivierten Templates wieder
UPDATE public.templates 
SET status = 'ACTIVE', updated_at = now()
WHERE status = 'ARCHIVED' AND quality_score >= 0.8;