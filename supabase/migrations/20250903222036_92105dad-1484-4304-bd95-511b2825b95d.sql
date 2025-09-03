-- Phase 3: Corrected Quality Assurance - Deactivate templates BEFORE 2025-09-02
-- This preserves the excellent Grade 4 Q4 templates from 02.09.2025

UPDATE public.templates 
SET 
    status = 'INACTIVE',
    updated_at = now()
WHERE created_at < '2025-09-02 00:00:00+00'::timestamptz
  AND status = 'ACTIVE';

-- Add comment for tracking
COMMENT ON TABLE public.templates IS 'Templates before 2025-09-02 deactivated to preserve high-quality templates from curriculum update';