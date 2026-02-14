-- Enable German for Greta
UPDATE public.child_subject_visibility 
SET is_visible = true, updated_at = NOW()
WHERE child_id = 'b477ea84-1797-4452-a056-4145f8c4a005' 
AND subject = 'german';