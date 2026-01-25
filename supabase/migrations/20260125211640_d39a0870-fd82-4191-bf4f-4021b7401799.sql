-- Add more long-term achievements for dedicated users

-- Ultra long-term total questions achievements
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'total_questions', 'Wissens-Titan', 'Löse insgesamt 5000 Aufgaben', 5000, 60, '🧠', '#8b5cf6'),
  ('general', 'total_questions', 'Lern-Legende', 'Löse insgesamt 10000 Aufgaben', 10000, 90, '👑', '#f59e0b'),
  ('general', 'total_questions', 'Unsterblicher Gelehrter', 'Löse insgesamt 25000 Aufgaben', 25000, 120, '🌟', '#ec4899')
ON CONFLICT DO NOTHING;

-- Additional subject-specific achievements for long-term learners
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  -- Math
  ('math', 'questions_solved', 'Zahlen-Titan', 'Löse 1000 Mathe-Aufgaben', 1000, 40, '🔢', '#3b82f6'),
  ('math', 'questions_solved', 'Mathematik-Legende', 'Löse 2500 Mathe-Aufgaben', 2500, 60, '📐', '#6366f1'),
  
  -- German
  ('german', 'questions_solved', 'Sprach-Titan', 'Löse 1000 Deutsch-Aufgaben', 1000, 40, '✍️', '#10b981'),
  ('german', 'questions_solved', 'Literatur-Legende', 'Löse 2500 Deutsch-Aufgaben', 2500, 60, '📖', '#059669'),
  
  -- English
  ('english', 'questions_solved', 'Language Titan', 'Löse 1000 Englisch-Aufgaben', 1000, 40, '🌐', '#f97316'),
  ('english', 'questions_solved', 'Polyglot Legend', 'Löse 2500 Englisch-Aufgaben', 2500, 60, '🏆', '#ea580c')
ON CONFLICT DO NOTHING;

-- More streak milestones
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'streak', 'Halb-Jahres-Held', 'Lerne 180 Tage hintereinander', 180, 35, '📅', '#8b5cf6'),
  ('general', 'streak', 'Zwei-Jahres-Legende', 'Lerne 1095 Tage hintereinander', 1095, 100, '🌈', '#ec4899')
ON CONFLICT DO NOTHING;

-- Perfect sessions milestones
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'perfect_sessions', 'Perfektion-Legende', 'Schaffe 200 perfekte Sessions', 200, 40, '💎', '#a855f7'),
  ('general', 'perfect_sessions', 'Perfektion-Unsterblicher', 'Schaffe 500 perfekte Sessions', 500, 60, '🏅', '#7c3aed')
ON CONFLICT DO NOTHING;

-- Consistency achievements
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'consistency', 'Verlässlicher Lerner', 'Lerne an 14 aufeinanderfolgenden Tagen', 14, 10, '📊', '#14b8a6'),
  ('general', 'consistency', 'Disziplin-Meister', 'Lerne an 30 aufeinanderfolgenden Tagen', 30, 20, '🎖️', '#0d9488'),
  ('general', 'consistency', 'Unerschütterlich', 'Lerne an 60 aufeinanderfolgenden Tagen', 60, 35, '🏔️', '#0f766e')
ON CONFLICT DO NOTHING;

-- Improvement milestones
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'improvement', 'Stetiger Aufstieg', 'Verbessere dich 100 Mal', 100, 30, '📈', '#22c55e'),
  ('general', 'improvement', 'Aufstiegs-Champion', 'Verbessere dich 250 Mal', 250, 50, '🚀', '#16a34a')
ON CONFLICT DO NOTHING;

-- Weekend warrior extended
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'weekend_warrior', 'Wochenend-Champion', 'Lerne an 25 Wochenenden', 25, 15, '🎮', '#a855f7'),
  ('general', 'weekend_warrior', 'Wochenend-Legende', 'Lerne an 50 Wochenenden', 50, 25, '🎯', '#7c3aed'),
  ('general', 'weekend_warrior', 'Ewiger Wochenend-Krieger', 'Lerne an 100 Wochenenden', 100, 40, '⚔️', '#6d28d9')
ON CONFLICT DO NOTHING;

-- Supernova achievements
INSERT INTO achievements_template (category, type, name, description, requirement_value, reward_minutes, icon, color)
VALUES 
  ('general', 'supernova', 'Supernova-Meister', 'Erreiche 50 Supernova-Sessions', 50, 30, '✨', '#fbbf24'),
  ('general', 'supernova', 'Supernova-Legende', 'Erreiche 100 Supernova-Sessions', 100, 50, '🌠', '#f59e0b')
ON CONFLICT DO NOTHING;