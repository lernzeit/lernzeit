-- First, remove all user achievements to allow template updates
DELETE FROM user_achievements;

-- Update achievement reward structure with properly scaled rewards
-- Maximum 60 minutes for hardest achievements (2 years daily = 730 days)

-- Delete all existing achievement templates to start fresh
DELETE FROM achievements_template;

-- Insert new properly scaled achievement templates

----------------------------------------
-- SUBJECT-SPECIFIC ACHIEVEMENTS (Math, German, English)
----------------------------------------

-- Math Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Erste Rechnung', 'Löse deine erste Mathe-Aufgabe', 'math', 'questions_solved', 1, 2, '🧮', '#3b82f6'),
('Mathe-Entdecker', 'Löse 10 Mathe-Aufgaben', 'math', 'questions_solved', 10, 5, '📐', '#3b82f6'),
('Zahlen-Profi', 'Löse 50 Mathe-Aufgaben', 'math', 'questions_solved', 50, 10, '🎯', '#3b82f6'),
('Rechen-Meister', 'Löse 100 Mathe-Aufgaben', 'math', 'questions_solved', 100, 15, '👑', '#3b82f6'),
('Mathe-Genie', 'Löse 500 Mathe-Aufgaben', 'math', 'questions_solved', 500, 25, '🧠', '#3b82f6');

-- German Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Erste Worte', 'Löse deine erste Deutsch-Aufgabe', 'german', 'questions_solved', 1, 2, '📚', '#ef4444'),
('Sprach-Talent', 'Löse 10 Deutsch-Aufgaben', 'german', 'questions_solved', 10, 5, '✍️', '#ef4444'),
('Wort-Experte', 'Löse 50 Deutsch-Aufgaben', 'german', 'questions_solved', 50, 10, '📖', '#ef4444'),
('Sprach-Meister', 'Löse 100 Deutsch-Aufgaben', 'german', 'questions_solved', 100, 15, '🎭', '#ef4444'),
('Dichter-Seele', 'Löse 500 Deutsch-Aufgaben', 'german', 'questions_solved', 500, 25, '🎨', '#ef4444');

-- English Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Hello World', 'Löse deine erste Englisch-Aufgabe', 'english', 'questions_solved', 1, 2, '🇬🇧', '#10b981'),
('Word Explorer', 'Löse 10 Englisch-Aufgaben', 'english', 'questions_solved', 10, 5, '🌍', '#10b981'),
('Language Expert', 'Löse 50 Englisch-Aufgaben', 'english', 'questions_solved', 50, 10, '🎓', '#10b981'),
('English Master', 'Löse 100 Englisch-Aufgaben', 'english', 'questions_solved', 100, 15, '👑', '#10b981'),
('Globe Trotter', 'Löse 500 Englisch-Aufgaben', 'english', 'questions_solved', 500, 25, '✈️', '#10b981');

----------------------------------------
-- GENERAL CROSS-SUBJECT ACHIEVEMENTS
----------------------------------------

-- Total Questions Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Wissenshunger', 'Löse insgesamt 25 Aufgaben', 'general', 'total_questions', 25, 5, '🎯', '#fbbf24'),
('Lern-Enthusiast', 'Löse insgesamt 100 Aufgaben', 'general', 'total_questions', 100, 10, '🚀', '#fbbf24'),
('Aufgaben-Held', 'Löse insgesamt 250 Aufgaben', 'general', 'total_questions', 250, 15, '🏆', '#fbbf24'),
('Wissens-Champion', 'Löse insgesamt 500 Aufgaben', 'general', 'total_questions', 500, 20, '🌟', '#fbbf24'),
('Super-Lerner', 'Löse insgesamt 1000 Aufgaben', 'general', 'total_questions', 1000, 30, '💫', '#fbbf24'),
('Mega-Gehirn', 'Löse insgesamt 2500 Aufgaben', 'general', 'total_questions', 2500, 45, '🧠', '#fbbf24');

-- Streak Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Erster Schritt', 'Lerne 2 Tage hintereinander', 'general', 'streak', 2, 3, '🔥', '#f97316'),
('Früh-Starter', 'Lerne 5 Tage hintereinander', 'general', 'streak', 5, 5, '⚡', '#f97316'),
('Wochen-Krieger', 'Lerne 7 Tage hintereinander', 'general', 'streak', 7, 8, '💪', '#f97316'),
('Monats-Held', 'Lerne 30 Tage hintereinander', 'general', 'streak', 30, 15, '🏅', '#f97316'),
('Quartals-Champion', 'Lerne 90 Tage hintereinander', 'general', 'streak', 90, 25, '🏆', '#f97316'),
('Jahres-Legende', 'Lerne 365 Tage hintereinander', 'general', 'streak', 365, 40, '👑', '#f97316'),
('Ewiger Lerner', 'Lerne 730 Tage hintereinander', 'general', 'streak', 730, 60, '💎', '#f97316');

-- Perfect Session Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Perfektionist', 'Schaffe 1 perfekte Session (100% richtig)', 'general', 'perfect_sessions', 1, 2, '💯', '#22c55e'),
('Fehlerlos', 'Schaffe 5 perfekte Sessions', 'general', 'perfect_sessions', 5, 5, '🎯', '#22c55e'),
('Präzisions-Meister', 'Schaffe 15 perfekte Sessions', 'general', 'perfect_sessions', 15, 8, '⭐', '#22c55e'),
('Genauigkeits-Held', 'Schaffe 50 perfekte Sessions', 'general', 'perfect_sessions', 50, 15, '🌟', '#22c55e'),
('Perfektion-Champion', 'Schaffe 100 perfekte Sessions', 'general', 'perfect_sessions', 100, 25, '✨', '#22c55e');

-- Fast Session Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Schnell-Denker', 'Schaffe 3 schnelle Sessions (unter 20s pro Aufgabe)', 'general', 'fast_sessions', 3, 3, '⚡', '#8b5cf6'),
('Blitz-Gehirn', 'Schaffe 10 schnelle Sessions', 'general', 'fast_sessions', 10, 5, '🏃', '#8b5cf6'),
('Speed-Master', 'Schaffe 25 schnelle Sessions', 'general', 'fast_sessions', 25, 10, '🚀', '#8b5cf6'),
('Tempo-Champion', 'Schaffe 50 schnelle Sessions', 'general', 'fast_sessions', 50, 15, '💨', '#8b5cf6');

-- Subject Mastery Achievements
INSERT INTO achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Vielseitig', 'Meistere 2 verschiedene Fächer', 'general', 'subjects_mastered', 2, 5, '🎨', '#06b6d4'),
('Allrounder', 'Meistere 3 verschiedene Fächer', 'general', 'subjects_mastered', 3, 10, '🌈', '#06b6d4'),
('Universalgenie', 'Meistere 4 verschiedene Fächer', 'general', 'subjects_mastered', 4, 20, '🎓', '#06b6d4'),
('Wissens-Titan', 'Meistere 5 oder mehr Fächer', 'general', 'subjects_mastered', 5, 30, '🌍', '#06b6d4');