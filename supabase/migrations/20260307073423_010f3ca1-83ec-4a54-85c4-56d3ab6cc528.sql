-- Reduce overpowered achievement bonuses
-- Vielseitig: 2 subjects mastered, 10min → 2min
UPDATE public.achievements_template SET reward_minutes = 2 WHERE id = '9351f881-1931-4e4e-b2ff-593d3d35ce2d';

-- Allrounder: 3 subjects mastered, 10min → 3min
UPDATE public.achievements_template SET reward_minutes = 3 WHERE id = '496d61a3-687f-40e4-a32d-3a6c02302e91';

-- Universalgenie: 4 subjects mastered, 15min → 5min
UPDATE public.achievements_template SET reward_minutes = 5 WHERE id = '4ee2a02b-049b-4db7-9b50-d4566bbba559';

-- Wissens-Titan (subjects_mastered): 5 subjects, 15min → 7min
UPDATE public.achievements_template SET reward_minutes = 7 WHERE id = '908f720a-d54c-4f20-adc8-e65787e54724';

-- Zeitreisender: 4 unique hours, 12min → 3min
UPDATE public.achievements_template SET reward_minutes = 3 WHERE id = 'e79f6b7d-3e40-4021-804c-48c4d1567643';

-- Entdecker: 5 subject_explorer, 18min → 5min
UPDATE public.achievements_template SET reward_minutes = 5 WHERE id = '6c55aefa-bb0e-477a-b205-f251ba649f7f';

-- Wissensdurst: 1000 knowledge_thirst, 20min → 8min
UPDATE public.achievements_template SET reward_minutes = 8 WHERE id = '40a19315-c785-45bc-b149-41944e478f45';

-- Wissens-Titan (total_questions 5000): 20min → 10min (this one is harder, so keep reasonable)
UPDATE public.achievements_template SET reward_minutes = 10 WHERE id = '7f3c2510-2179-4d08-8c09-d64c5fdeea1c';