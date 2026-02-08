
-- ============================================
-- REBALANCE ACHIEVEMENT REWARDS
-- Scale from 2 to 30 minutes based on difficulty
-- ============================================

-- TIER 1: Easy/Starter Achievements (2-5 minutes)
-- First steps, low requirement values
UPDATE achievements_template SET reward_minutes = 2 WHERE type = 'questions_solved' AND requirement_value <= 10;
UPDATE achievements_template SET reward_minutes = 2 WHERE type = 'total_questions' AND requirement_value <= 25;
UPDATE achievements_template SET reward_minutes = 2 WHERE type = 'streak' AND requirement_value <= 3;
UPDATE achievements_template SET reward_minutes = 3 WHERE type = 'questions_solved' AND requirement_value > 10 AND requirement_value <= 25;
UPDATE achievements_template SET reward_minutes = 3 WHERE type = 'total_questions' AND requirement_value > 25 AND requirement_value <= 50;
UPDATE achievements_template SET reward_minutes = 3 WHERE type = 'streak' AND requirement_value > 3 AND requirement_value <= 7;
UPDATE achievements_template SET reward_minutes = 3 WHERE type = 'perfect_sessions' AND requirement_value <= 5;

-- TIER 2: Moderate Achievements (5-10 minutes)
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'questions_solved' AND requirement_value > 25 AND requirement_value <= 100;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'total_questions' AND requirement_value > 50 AND requirement_value <= 100;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'streak' AND requirement_value > 7 AND requirement_value <= 14;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'perfect_sessions' AND requirement_value > 5 AND requirement_value <= 10;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'improvement' AND requirement_value <= 10;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'accuracy_master' AND requirement_value <= 80;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'weekend_warrior' AND requirement_value <= 5;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'consistency' AND requirement_value <= 7;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'supernova' AND requirement_value <= 5;
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'knowledge_thirst' AND requirement_value <= 50;

UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'questions_solved' AND requirement_value > 100 AND requirement_value <= 250;
UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'total_questions' AND requirement_value > 100 AND requirement_value <= 250;
UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'streak' AND requirement_value > 14 AND requirement_value <= 30;
UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'perfect_sessions' AND requirement_value > 10 AND requirement_value <= 25;
UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'improvement' AND requirement_value > 10 AND requirement_value <= 25;

-- TIER 3: Challenging Achievements (10-15 minutes)
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'questions_solved' AND requirement_value > 250 AND requirement_value <= 500;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'total_questions' AND requirement_value > 250 AND requirement_value <= 500;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'streak' AND requirement_value > 30 AND requirement_value <= 60;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'perfect_sessions' AND requirement_value > 25 AND requirement_value <= 50;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'improvement' AND requirement_value > 25 AND requirement_value <= 50;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'accuracy_master' AND requirement_value > 80 AND requirement_value <= 90;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'weekend_warrior' AND requirement_value > 5 AND requirement_value <= 20;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'consistency' AND requirement_value > 7 AND requirement_value <= 30;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'supernova' AND requirement_value > 5 AND requirement_value <= 15;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'knowledge_thirst' AND requirement_value > 50 AND requirement_value <= 200;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'subjects_mastered' AND requirement_value <= 3;

UPDATE achievements_template SET reward_minutes = 12 WHERE type = 'questions_solved' AND requirement_value > 500 AND requirement_value <= 750;
UPDATE achievements_template SET reward_minutes = 12 WHERE type = 'total_questions' AND requirement_value > 500 AND requirement_value <= 1000;
UPDATE achievements_template SET reward_minutes = 12 WHERE type = 'streak' AND requirement_value > 60 AND requirement_value <= 90;
UPDATE achievements_template SET reward_minutes = 12 WHERE type = 'perfect_sessions' AND requirement_value > 50 AND requirement_value <= 100;

-- TIER 4: Hard Achievements (15-20 minutes)
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'questions_solved' AND requirement_value > 750 AND requirement_value <= 1000;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'total_questions' AND requirement_value > 1000 AND requirement_value <= 2500;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'streak' AND requirement_value > 90 AND requirement_value <= 180;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'perfect_sessions' AND requirement_value > 100 AND requirement_value <= 200;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'improvement' AND requirement_value > 50 AND requirement_value <= 100;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'accuracy_master' AND requirement_value > 90 AND requirement_value <= 95;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'weekend_warrior' AND requirement_value > 20 AND requirement_value <= 50;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'consistency' AND requirement_value > 30 AND requirement_value <= 60;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'supernova' AND requirement_value > 15 AND requirement_value <= 30;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'knowledge_thirst' AND requirement_value > 200 AND requirement_value <= 500;
UPDATE achievements_template SET reward_minutes = 15 WHERE type = 'subjects_mastered' AND requirement_value > 3 AND requirement_value <= 5;

UPDATE achievements_template SET reward_minutes = 18 WHERE type = 'questions_solved' AND requirement_value > 1000 AND requirement_value <= 1500;
UPDATE achievements_template SET reward_minutes = 18 WHERE type = 'streak' AND requirement_value > 180 AND requirement_value <= 365;

-- TIER 5: Epic Achievements (20-25 minutes)
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'questions_solved' AND requirement_value > 1500 AND requirement_value <= 2500;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'total_questions' AND requirement_value > 2500 AND requirement_value <= 5000;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'streak' AND requirement_value > 365 AND requirement_value <= 730;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'perfect_sessions' AND requirement_value > 200 AND requirement_value <= 500;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'improvement' AND requirement_value > 100 AND requirement_value <= 250;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'accuracy_master' AND requirement_value > 95;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'weekend_warrior' AND requirement_value > 50 AND requirement_value <= 100;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'consistency' AND requirement_value > 60;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'supernova' AND requirement_value > 30 AND requirement_value <= 50;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'knowledge_thirst' AND requirement_value > 500 AND requirement_value <= 1000;
UPDATE achievements_template SET reward_minutes = 20 WHERE type = 'subjects_mastered' AND requirement_value > 5;

-- TIER 6: Legendary Achievements (25-30 minutes)
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'questions_solved' AND requirement_value > 2500;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'total_questions' AND requirement_value > 5000 AND requirement_value <= 10000;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'streak' AND requirement_value > 730;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'perfect_sessions' AND requirement_value > 500;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'improvement' AND requirement_value > 250;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'weekend_warrior' AND requirement_value > 100;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'supernova' AND requirement_value > 50 AND requirement_value <= 100;
UPDATE achievements_template SET reward_minutes = 25 WHERE type = 'knowledge_thirst' AND requirement_value > 1000;

UPDATE achievements_template SET reward_minutes = 30 WHERE type = 'total_questions' AND requirement_value > 10000;
UPDATE achievements_template SET reward_minutes = 30 WHERE type = 'supernova' AND requirement_value > 100;

-- Special one-time achievements (scale appropriately)
UPDATE achievements_template SET reward_minutes = 5 WHERE type = 'midnight_scholar';
UPDATE achievements_template SET reward_minutes = 8 WHERE type = 'time_traveler' AND requirement_value <= 2;
UPDATE achievements_template SET reward_minutes = 12 WHERE type = 'time_traveler' AND requirement_value > 2 AND requirement_value <= 4;
UPDATE achievements_template SET reward_minutes = 18 WHERE type = 'time_traveler' AND requirement_value > 4;
UPDATE achievements_template SET reward_minutes = 10 WHERE type = 'perfect_week';

-- Ensure no achievement exceeds 30 minutes
UPDATE achievements_template SET reward_minutes = 30 WHERE reward_minutes > 30;

-- Ensure no achievement is below 2 minutes
UPDATE achievements_template SET reward_minutes = 2 WHERE reward_minutes < 2;
