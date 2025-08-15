-- Create RPC functions for template metrics

-- Function to apply template statistics (plays and correct answers)
CREATE OR REPLACE FUNCTION public.apply_template_stat(tid uuid, is_correct boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update template statistics
  UPDATE public.templates 
  SET 
    plays = plays + 1,
    correct = correct + CASE WHEN is_correct THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = tid;
  
  -- If template doesn't exist, we could optionally log this
  IF NOT FOUND THEN
    RAISE LOG 'Template with id % not found for stat update', tid;
  END IF;
END;
$$;

-- Function to apply template rating
CREATE OR REPLACE FUNCTION public.apply_template_rating(tid uuid, stars integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Validate stars range (1-5)
  IF stars < 1 OR stars > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5, got %', stars;
  END IF;
  
  -- Update template rating statistics
  UPDATE public.templates 
  SET 
    rating_sum = rating_sum + stars,
    rating_count = rating_count + 1,
    updated_at = now()
  WHERE id = tid;
  
  -- If template doesn't exist, we could optionally log this
  IF NOT FOUND THEN
    RAISE LOG 'Template with id % not found for rating update', tid;
  END IF;
END;
$$;