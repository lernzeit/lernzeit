-- Füge neue Achievement-Typen hinzu (kreative und versteckte Achievements)

-- Overtime Learning Achievements (Lernen über maximale Zeit hinaus)
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Extrazeit-Anfänger', 'Lerne 15 Minuten über deine erlaubte Zeit hinaus', 'general', 'overtime_learning', 15, 5, '⏰', '#10b981'),
('Extrazeit-Entdecker', 'Lerne 30 Minuten über deine erlaubte Zeit hinaus', 'general', 'overtime_learning', 30, 10, '🕐', '#059669'),
('Extrazeit-Meister', 'Lerne 60 Minuten über deine erlaubte Zeit hinaus', 'general', 'overtime_learning', 60, 15, '⏱️', '#047857'),
('Extrazeit-Champion', 'Lerne 120 Minuten über deine erlaubte Zeit hinaus', 'general', 'overtime_learning', 120, 25, '🏆', '#065f46');

-- Improvement Achievements (Versteckte Achievements für Verbesserung)
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Erste Verbesserung', 'Verbessere deine Fehlerquote um 10%', 'general', 'improvement', 10, 10, '📈', '#8b5cf6'),
('Stetige Verbesserung', 'Verbessere deine Fehlerquote um 25%', 'general', 'improvement', 25, 20, '⬆️', '#7c3aed'),
('Große Fortschritte', 'Verbessere deine Fehlerquote um 50%', 'general', 'improvement', 50, 35, '🚀', '#6d28d9'),
('Perfektionist', 'Erreiche eine 95%+ Erfolgsquote', 'general', 'accuracy_master', 95, 30, '💎', '#581c87');

-- Time-based Learning Achievements
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Früher Vogel', 'Lerne 5 mal vor 8 Uhr morgens', 'general', 'early_bird', 5, 8, '🐦', '#f59e0b'),
('Nachteule', 'Lerne 5 mal nach 20 Uhr abends', 'general', 'night_owl', 5, 8, '🦉', '#1f2937'),
('Wochenend-Krieger', 'Lerne an 10 Wochenenden', 'general', 'weekend_warrior', 10, 15, '⚔️', '#dc2626'),
('Marathon-Läufer', 'Absolviere 3 Sessions über 45 Minuten', 'general', 'marathon_sessions', 3, 20, '🏃', '#16a34a');

-- Speed and Consistency Achievements
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Blitzschnell', 'Beantworte 50 Fragen in unter 10 Sekunden pro Frage', 'general', 'speed_master', 50, 12, '⚡', '#eab308'),
('Konstanz-König', 'Lerne an 7 aufeinanderfolgenden Tagen', 'general', 'consistency', 7, 15, '👑', '#dc2626'),
('Comeback-Kid', 'Kehre nach 7 Tagen Pause zurück', 'general', 'comeback', 1, 10, '🎭', '#06b6d4'),
('Entdecker', 'Lerne in 5 verschiedenen Fächern', 'general', 'subject_explorer', 5, 18, '🗺️', '#8b5cf6');

-- Special Hidden Achievements
INSERT INTO public.achievements_template (name, description, category, type, requirement_value, reward_minutes, icon, color) VALUES
('Mitternachts-Gelehrter', 'Lerne einmal um Mitternacht', 'general', 'midnight_scholar', 1, 25, '🌙', '#1e293b'),
('Perfekte Woche', 'Erreiche 7 Tage in Folge 100% Genauigkeit', 'general', 'perfect_week', 7, 40, '✨', '#fbbf24'),
('Zeitreisender', 'Lerne in allen 4 Quartalen', 'general', 'time_traveler', 4, 30, '⏳', '#0ea5e9'),
('Wissensdurst', 'Löse 1000 Fragen korrekt', 'general', 'knowledge_thirst', 1000, 50, '🧠', '#7c3aed'),
('Supernova', 'Erreiche 30 Tage Streak mit 90%+ Genauigkeit', 'general', 'supernova', 30, 60, '⭐', '#f59e0b');