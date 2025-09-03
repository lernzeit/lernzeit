-- Phase 3: Corrected Quality Assurance - Delete old templates before 2025-09-02
-- This preserves the excellent Grade 4 Q4 templates from 02.09.2025
-- Since INACTIVE is not a valid status, we'll delete old templates instead

DELETE FROM public.templates 
WHERE created_at < '2025-09-02 00:00:00+00'::timestamptz;

-- Add comment for tracking
COMMENT ON TABLE public.templates IS 'Old templates before 2025-09-02 deleted to preserve high-quality templates from curriculum update';