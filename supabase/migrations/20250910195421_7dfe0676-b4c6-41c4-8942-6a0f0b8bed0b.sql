-- First, drop the constraint temporarily to allow updates
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_difficulty_check;

-- Update ALL existing data, handling any possible values
UPDATE public.templates 
SET difficulty = CASE 
  WHEN difficulty IN ('AFB I', 'easy') THEN 'easy'
  WHEN difficulty IN ('AFB II', 'medium') THEN 'medium' 
  WHEN difficulty IN ('AFB III', 'hard') THEN 'hard'
  ELSE 'easy'  -- Default fallback for any other values
END;

-- Now add the new constraint
ALTER TABLE public.templates ADD CONSTRAINT templates_difficulty_check 
CHECK (difficulty IN ('easy', 'medium', 'hard'));