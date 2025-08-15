-- Update template functions with simplified versions

-- Updated function to apply template statistics (plays and correct answers)
CREATE OR REPLACE FUNCTION public.apply_template_stat(tid uuid, is_correct boolean) 
RETURNS void AS $$
BEGIN
  UPDATE public.templates
  SET plays = plays + 1,
      correct = correct + CASE WHEN is_correct THEN 1 ELSE 0 END
  WHERE id = tid;
END;
$$ LANGUAGE plpgsql;

-- Updated function to apply template rating with clamped values
CREATE OR REPLACE FUNCTION public.apply_template_rating(tid uuid, stars int) 
RETURNS void AS $$
BEGIN
  UPDATE public.templates
  SET rating_sum = rating_sum + greatest(1, least(5, stars)),
      rating_count = rating_count + 1
  WHERE id = tid;
END;
$$ LANGUAGE plpgsql;