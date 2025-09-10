-- Change difficulty constraint from AFB to easy/medium/hard system
-- First drop the existing constraint
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_difficulty_check;

-- Add new constraint with easy/medium/hard
ALTER TABLE public.templates ADD CONSTRAINT templates_difficulty_check 
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Update existing data from AFB to new system
UPDATE public.templates 
SET difficulty = CASE 
  WHEN difficulty = 'AFB I' THEN 'easy'
  WHEN difficulty = 'AFB II' THEN 'medium' 
  WHEN difficulty = 'AFB III' THEN 'hard'
  ELSE difficulty
END;