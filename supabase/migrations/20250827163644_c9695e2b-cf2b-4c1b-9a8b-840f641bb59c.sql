-- Aktiviere RLS für curriculum_parameter_rules Tabelle
ALTER TABLE curriculum_parameter_rules ENABLE ROW LEVEL SECURITY;

-- Erstelle RLS Policies für curriculum_parameter_rules
CREATE POLICY "Anyone can read curriculum rules" 
ON curriculum_parameter_rules FOR SELECT 
USING (true);

-- System kann Curriculum-Regeln verwalten (für Edge Functions)
CREATE POLICY "System can manage curriculum rules" 
ON curriculum_parameter_rules FOR ALL
USING (true);