-- Phase 1: Fix existing achievement calculations for streak, perfect_sessions, and fast_sessions
CREATE OR REPLACE FUNCTION public.update_achievement_progress(p_user_id uuid, p_category text, p_type text, p_increment integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  achievement_record RECORD;
  user_achievement_record RECORD;
  new_achievements JSON[] := '{}';
  normalized_category text;
  result JSON;
  achievement_count integer := 0;
  total_questions_count integer := 0;
  subjects_count integer := 0;
  current_streak integer := 0;
  perfect_sessions_count integer := 0;
  fast_sessions_count integer := 0;
  session_data RECORD;
BEGIN
  -- Normalize category names to match database
  normalized_category := CASE 
    WHEN p_category IN ('mathematik', 'math') THEN 'math'
    WHEN p_category IN ('deutsch', 'german') THEN 'german'
    WHEN p_category = 'englisch' THEN 'english'
    WHEN p_category = 'geographie' THEN 'geography'
    WHEN p_category = 'geschichte' THEN 'history'
    WHEN p_category = 'physik' THEN 'physics'
    WHEN p_category = 'biologie' THEN 'biology'
    WHEN p_category = 'chemie' THEN 'chemistry'
    WHEN p_category = 'latein' THEN 'latin'
    ELSE p_category
  END;
  
  -- Log the achievement update attempt
  RAISE LOG 'Achievement update: user_id=%, category=% (normalized=%), type=%, increment=%', 
    p_user_id, p_category, normalized_category, p_type, p_increment;
  
  -- For total_questions achievements, calculate total across all subjects
  IF p_type = 'total_questions' THEN
    SELECT COALESCE(SUM(correct_answers), 0) INTO total_questions_count
    FROM public.learning_sessions 
    WHERE user_id = p_user_id;
    
    RAISE LOG 'Total questions solved by user: %', total_questions_count;
  END IF;
  
  -- For subjects_mastered achievements, count distinct NORMALIZED subjects
  IF p_type = 'subjects_mastered' THEN
    SELECT COUNT(DISTINCT 
      CASE 
        WHEN category IN ('mathematik', 'math') THEN 'math'
        WHEN category IN ('deutsch', 'german') THEN 'german'
        WHEN category = 'englisch' THEN 'english'
        WHEN category = 'geographie' THEN 'geography'
        WHEN category = 'geschichte' THEN 'history'
        WHEN category = 'physik' THEN 'physics'
        WHEN category = 'biologie' THEN 'biology'
        WHEN category = 'chemie' THEN 'chemistry'
        WHEN category = 'latein' THEN 'latin'
        ELSE category
      END
    ) INTO subjects_count
    FROM public.learning_sessions 
    WHERE user_id = p_user_id AND correct_answers > 0;
    
    RAISE LOG 'Normalized subjects mastered by user: %', subjects_count;
  END IF;
  
  -- For streak achievements, calculate current streak
  IF p_type = 'streak' THEN
    WITH daily_sessions AS (
      SELECT DISTINCT DATE(session_date) as session_day
      FROM (
        SELECT session_date FROM public.learning_sessions WHERE user_id = p_user_id
        UNION
        SELECT session_date FROM public.game_sessions WHERE user_id = p_user_id
      ) combined_sessions
      ORDER BY session_day DESC
    ),
    streak_calc AS (
      SELECT session_day,
             ROW_NUMBER() OVER (ORDER BY session_day DESC) as row_num,
             session_day + INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY session_day DESC) - 1) as expected_date
      FROM daily_sessions
    )
    SELECT COUNT(*) INTO current_streak
    FROM streak_calc
    WHERE session_day = expected_date AND session_day >= CURRENT_DATE - INTERVAL '365 days';
    
    RAISE LOG 'Current streak calculated: %', current_streak;
  END IF;
  
  -- For perfect_sessions achievements, count sessions where correct_answers = total_questions
  IF p_type = 'perfect_sessions' THEN
    SELECT COUNT(*) INTO perfect_sessions_count
    FROM (
      SELECT 1 FROM public.learning_sessions 
      WHERE user_id = p_user_id AND correct_answers = total_questions AND total_questions > 0
      UNION ALL
      SELECT 1 FROM public.game_sessions 
      WHERE user_id = p_user_id AND correct_answers = total_questions AND total_questions > 0
    ) perfect_sessions;
    
    RAISE LOG 'Perfect sessions count: %', perfect_sessions_count;
  END IF;
  
  -- For fast_sessions achievements, count sessions completed under average time
  IF p_type = 'fast_sessions' THEN
    -- Calculate sessions where time per question is less than 20 seconds
    SELECT COUNT(*) INTO fast_sessions_count
    FROM (
      SELECT 1 FROM public.learning_sessions 
      WHERE user_id = p_user_id 
        AND total_questions > 0 
        AND (time_spent / total_questions) < 20
      UNION ALL
      SELECT 1 FROM public.game_sessions 
      WHERE user_id = p_user_id 
        AND total_questions > 0 
        AND (time_spent / total_questions) < 20
    ) fast_sessions;
    
    RAISE LOG 'Fast sessions count: %', fast_sessions_count;
  END IF;
  
  -- Count available achievement templates
  SELECT COUNT(*) INTO achievement_count
  FROM public.achievements_template 
  WHERE (category::text = normalized_category OR category::text = 'general') 
    AND type::text = p_type;
  
  RAISE LOG 'Found % achievement templates for category=%, type=%', 
    achievement_count, normalized_category, p_type;
  
  -- Find all relevant Achievement-Templates
  FOR achievement_record IN 
    SELECT * FROM public.achievements_template 
    WHERE (category::text = normalized_category OR category::text = 'general') 
      AND type::text = p_type
    ORDER BY requirement_value ASC
  LOOP
    RAISE LOG 'Processing achievement: % (req: %)', achievement_record.name, achievement_record.requirement_value;
    
    -- Check if user already has this achievement
    SELECT * INTO user_achievement_record
    FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = achievement_record.id;
    
    -- Determine progress value based on achievement type
    DECLARE
      progress_value integer := p_increment;
    BEGIN
      IF p_type = 'total_questions' THEN
        progress_value := total_questions_count + p_increment;
      ELSIF p_type = 'subjects_mastered' THEN
        progress_value := subjects_count;
      ELSIF p_type = 'streak' THEN
        progress_value := current_streak;
      ELSIF p_type = 'perfect_sessions' THEN
        progress_value := perfect_sessions_count;
      ELSIF p_type = 'fast_sessions' THEN
        progress_value := fast_sessions_count;
      END IF;
      
      IF user_achievement_record IS NULL THEN
        -- Achievement doesn't exist yet, create it
        INSERT INTO public.user_achievements (user_id, achievement_id, current_progress, is_completed)
        VALUES (p_user_id, achievement_record.id, LEAST(progress_value, achievement_record.requirement_value), 
                progress_value >= achievement_record.requirement_value);
                
        RAISE LOG 'Created new achievement progress: % with progress=%', 
          achievement_record.name, LEAST(progress_value, achievement_record.requirement_value);
                
        -- If immediately completed, add to new achievements
        IF progress_value >= achievement_record.requirement_value THEN
          new_achievements := new_achievements || json_build_object(
            'name', achievement_record.name,
            'description', achievement_record.description,
            'reward_minutes', achievement_record.reward_minutes,
            'icon', achievement_record.icon,
            'color', achievement_record.color
          );
          RAISE LOG 'New achievement completed immediately: %', achievement_record.name;
        END IF;
      ELSIF NOT user_achievement_record.is_completed THEN
        -- Achievement exists but not completed
        DECLARE
          new_progress integer := CASE 
            WHEN p_type IN ('total_questions', 'subjects_mastered', 'streak', 'perfect_sessions', 'fast_sessions') THEN progress_value
            ELSE user_achievement_record.current_progress + p_increment
          END;
        BEGIN
          UPDATE public.user_achievements 
          SET 
            current_progress = LEAST(new_progress, achievement_record.requirement_value),
            is_completed = new_progress >= achievement_record.requirement_value,
            earned_at = CASE 
              WHEN new_progress >= achievement_record.requirement_value 
              THEN now() 
              ELSE earned_at 
            END
          WHERE id = user_achievement_record.id;
          
          RAISE LOG 'Updated achievement progress: % from % to %', 
            achievement_record.name, 
            user_achievement_record.current_progress, 
            LEAST(new_progress, achievement_record.requirement_value);
          
          -- If newly completed, add to new achievements
          IF new_progress >= achievement_record.requirement_value THEN
            new_achievements := new_achievements || json_build_object(
              'name', achievement_record.name,
              'description', achievement_record.description,
              'reward_minutes', achievement_record.reward_minutes,
              'icon', achievement_record.icon,
              'color', achievement_record.color
            );
            RAISE LOG 'Achievement newly completed: %', achievement_record.name;
          END IF;
        END;
      ELSE
        RAISE LOG 'Achievement already completed: %', achievement_record.name;
      END IF;
    END;
  END LOOP;
  
  RAISE LOG 'Achievement update completed. New achievements: %', array_length(new_achievements, 1);
  
  RETURN json_build_object(
    'success', true,
    'new_achievements', new_achievements,
    'processed_category', normalized_category,
    'templates_found', achievement_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Achievement update error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;