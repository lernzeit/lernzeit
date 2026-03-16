-- Add p_absolute parameter to update_achievement_progress
-- When true, sets current_progress to the value instead of incrementing
CREATE OR REPLACE FUNCTION public.update_achievement_progress(
  p_user_id uuid, 
  p_category text, 
  p_type text, 
  p_increment integer DEFAULT 1,
  p_absolute boolean DEFAULT false
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
  v_new_progress integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot update achievements for another user';
  END IF;

  FOR v_achievement IN 
    SELECT * FROM public.achievements_template 
    WHERE category::text = p_category AND type::text = p_type
  LOOP
    SELECT current_progress, is_completed INTO v_current_progress, v_is_completed
    FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    IF NOT FOUND THEN
      v_new_progress := p_increment;
      
      INSERT INTO public.user_achievements (user_id, achievement_id, current_progress, is_completed)
      VALUES (p_user_id, v_achievement.id, v_new_progress, v_new_progress >= v_achievement.requirement_value)
      RETURNING current_progress, is_completed INTO v_current_progress, v_is_completed;
      
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
      IF p_absolute THEN
        v_new_progress := GREATEST(v_current_progress, p_increment);
      ELSE
        v_new_progress := v_current_progress + p_increment;
      END IF;
      
      UPDATE public.user_achievements 
      SET 
        current_progress = v_new_progress,
        is_completed = v_new_progress >= v_achievement.requirement_value,
        earned_at = CASE 
          WHEN v_new_progress >= v_achievement.requirement_value THEN now()
          ELSE earned_at
        END
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
      RETURNING current_progress, is_completed INTO v_current_progress, v_is_completed;
      
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
  
  v_result := json_build_object(
    'success', true,
    'new_achievements', to_json(v_new_achievements)
  );
  
  RETURN v_result;
END;
$$;