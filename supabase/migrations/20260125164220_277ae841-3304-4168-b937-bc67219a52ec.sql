-- Fix 1: Update the update_achievement_progress function to validate user authorization
-- This prevents any authenticated user from manipulating another user's achievements

CREATE OR REPLACE FUNCTION public.update_achievement_progress(
  p_user_id uuid,
  p_category text,
  p_type text,
  p_increment integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result json;
  v_achievement record;
  v_new_achievements json[] := '{}';
  v_current_progress integer;
  v_is_completed boolean;
BEGIN
  -- SECURITY: Verify the calling user is updating their own achievements
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot update achievements for another user';
  END IF;

  -- Find all matching achievement templates
  FOR v_achievement IN 
    SELECT * FROM public.achievements_template 
    WHERE category::text = p_category AND type::text = p_type
  LOOP
    -- Get or create user achievement record
    SELECT current_progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    IF NOT FOUND THEN
      -- Create new record
      INSERT INTO public.user_achievements (user_id, achievement_id, current_progress, is_completed)
      VALUES (p_user_id, v_achievement.id, p_increment, p_increment >= v_achievement.requirement_value)
      RETURNING current_progress, is_completed INTO v_current_progress, v_is_completed;
      
      -- Check if newly completed
      IF v_is_completed THEN
        v_new_achievements := array_append(v_new_achievements, json_build_object(
          'name', v_achievement.name,
          'description', v_achievement.description,
          'reward_minutes', v_achievement.reward_minutes,
          'icon', v_achievement.icon,
          'color', v_achievement.color
        ));
      END IF;
    ELSIF NOT v_is_completed THEN
      -- Update existing record
      UPDATE public.user_achievements 
      SET 
        current_progress = current_progress + p_increment,
        is_completed = (current_progress + p_increment) >= v_achievement.requirement_value,
        earned_at = CASE 
          WHEN (current_progress + p_increment) >= v_achievement.requirement_value THEN now()
          ELSE earned_at
        END
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
      RETURNING current_progress, is_completed INTO v_current_progress, v_is_completed;
      
      -- Check if newly completed
      IF v_is_completed THEN
        v_new_achievements := array_append(v_new_achievements, json_build_object(
          'name', v_achievement.name,
          'description', v_achievement.description,
          'reward_minutes', v_achievement.reward_minutes,
          'icon', v_achievement.icon,
          'color', v_achievement.color
        ));
      END IF;
    END IF;
  END LOOP;
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'new_achievements', to_json(v_new_achievements)
  );
  
  RETURN v_result;
END;
$$;

-- Fix 2: Remove the overly permissive public access policy on templates
-- This protects intellectual property by requiring authentication
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.templates;