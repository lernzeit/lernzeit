-- Reset Klara's inflated streak achievements to correct values (actual streak = 11 days)
-- Reset all streak achievements for Klara
UPDATE public.user_achievements ua
SET 
  current_progress = 11,
  is_completed = (11 >= at.requirement_value),
  earned_at = CASE 
    WHEN 11 >= at.requirement_value AND ua.is_completed = true THEN ua.earned_at
    WHEN 11 >= at.requirement_value THEN now()
    ELSE ua.earned_at
  END
FROM public.achievements_template at
WHERE ua.achievement_id = at.id
AND ua.user_id = '8c79781e-5d14-4ddd-9de8-fa419bbf2ea3'
AND at.type = 'streak';

-- Also check and fix subjects_mastered, subject_explorer, consistency, time_traveler for ALL users
-- These had the same absolute-value-as-increment bug