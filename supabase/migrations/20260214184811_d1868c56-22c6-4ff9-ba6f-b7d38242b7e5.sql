ALTER TABLE public.child_subject_visibility 
ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false;