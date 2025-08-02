-- Add achievement templates for the new long-term achievement types
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
-- Monthly Active achievements
('Monatlicher Lernender', 'Lerne einen ganzen Monat lang täglich', 'general', 'monthly_active', 1, 60, '🗓️', '#8b5cf6'),
('Dreimonatiger Champion', 'Bleibe drei Monate lang aktiv', 'general', 'monthly_active', 3, 120, '🏆', '#a855f7'),
('Halbjähriger Meister', 'Sechs Monate kontinuierliches Lernen', 'general', 'monthly_active', 6, 180, '👑', '#9333ea'),

-- Weekly Consistency achievements
('Wöchentliche Routine', 'Lerne eine Woche lang jeden Tag', 'general', 'weekly_consistency', 1, 30, '📅', '#06b6d4'),
('Monatsroutine', 'Vier Wochen konsequent gelernt', 'general', 'weekly_consistency', 4, 90, '🎯', '#0891b2'),
('Quartalsroutine', 'Zwölf Wochen ohne Unterbrechung', 'general', 'weekly_consistency', 12, 240, '⭐', '#0e7490'),

-- Seasonal achievements
('Frühlingslerner', 'Lerne den ganzen Frühling über', 'general', 'seasonal_learner', 90, 150, '🌸', '#10b981'),
('Sommerschüler', 'Auch im Sommer fleißig gelernt', 'general', 'seasonal_learner', 90, 150, '☀️', '#059669'),
('Herbststudent', 'Den ganzen Herbst über gelernt', 'general', 'seasonal_learner', 90, 150, '🍂', '#dc2626'),
('Winterkämpfer', 'Auch im Winter nicht aufgegeben', 'general', 'seasonal_learner', 90, 150, '❄️', '#2563eb'),

-- Time-based consistency
('Früher Vogel', 'Lerne regelmäßig am Morgen', 'general', 'early_bird', 30, 90, '🐦', '#f59e0b'),
('Nachteule', 'Abends fleißig am Lernen', 'general', 'night_owl', 30, 90, '🦉', '#7c3aed'),
('Wochenendkrieger', 'Auch am Wochenende aktiv', 'general', 'weekend_warrior', 20, 120, '⚔️', '#dc2626'),

-- Long-term dedication
('Langzeit-Lerner', 'Ein ganzes Jahr kontinuierlich gelernt', 'general', 'long_term_dedication', 365, 500, '🎓', '#059669'),
('Lebenslanges Lernen', 'Zwei Jahre kontinuierliches Lernen', 'general', 'long_term_dedication', 730, 1000, '📚', '#7c3aed'),

-- Accuracy improvement
('Präzisionssteigerung', 'Verbessere deine Genauigkeit um 25%', 'general', 'accuracy_improvement', 25, 60, '🎯', '#059669'),
('Perfektion erreicht', 'Erreiche 90% Genauigkeit', 'general', 'accuracy_improvement', 90, 120, '💎', '#7c3aed'),

-- Knowledge accumulator
('Wissenssammler', 'Sammle Wissen in 5 verschiedenen Fächern', 'general', 'knowledge_accumulator', 5, 100, '📖', '#0891b2'),
('Universalgelehrter', 'Meistere alle verfügbaren Fächer', 'general', 'knowledge_accumulator', 10, 300, '🎓', '#7c3aed'),

-- Progress tracker
('Fortschrittsverfolger', 'Verfolge deinen Fortschritt über 30 Tage', 'general', 'progress_tracker', 30, 90, '📈', '#10b981'),
('Langzeit-Tracker', 'Verfolge deinen Fortschritt über 90 Tage', 'general', 'progress_tracker', 90, 180, '📊', '#059669'),

-- Milestone months
('Erster Meilenstein', 'Erreiche deinen ersten Monats-Meilenstein', 'general', 'milestone_months', 1, 60, '🚀', '#f59e0b'),
('Halbjahres-Held', 'Sechs Monate voller Erfolge', 'general', 'milestone_months', 6, 240, '🌟', '#7c3aed'),

-- Comeback achievements
('Comeback-Kid', 'Kehre nach einer Pause zurück zum Lernen', 'general', 'comeback_kid', 1, 60, '💪', '#dc2626'),
('Phoenix-Aufstieg', 'Starke Rückkehr nach längerer Pause', 'general', 'comeback_kid', 3, 120, '🔥', '#ea580c')
ON CONFLICT DO NOTHING;