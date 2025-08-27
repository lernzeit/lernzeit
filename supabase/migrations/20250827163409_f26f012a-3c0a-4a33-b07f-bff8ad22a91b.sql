-- Erweitere templates Tabelle für Parametrisierung
ALTER TABLE templates ADD COLUMN IF NOT EXISTS parameter_definitions JSONB DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS curriculum_rules JSONB DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_parametrized BOOLEAN DEFAULT false;

-- Erstelle Curriculum-Parameter-Mapping Tabelle
CREATE TABLE IF NOT EXISTS curriculum_parameter_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL,
  quarter TEXT NOT NULL,
  domain TEXT NOT NULL,
  zahlenraum_min INTEGER DEFAULT 1,
  zahlenraum_max INTEGER DEFAULT 10,
  operation_types TEXT[] DEFAULT '{}',
  allowed_contexts TEXT[] DEFAULT '{}',
  complexity_level TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basis-Curriculum-Parameter für Klassen 1-10 einfügen
INSERT INTO curriculum_parameter_rules (grade, quarter, domain, zahlenraum_min, zahlenraum_max, operation_types, allowed_contexts, complexity_level)
VALUES
  -- Klasse 1
  (1, 'Q1', 'Zahlen & Operationen', 1, 10, ARRAY['counting', 'comparison'], ARRAY['spielzeug', 'tiere', 'obst'], 'basic'),
  (1, 'Q2', 'Zahlen & Operationen', 1, 20, ARRAY['addition', 'subtraction'], ARRAY['spielzeug', 'tiere', 'familie'], 'basic'),
  (1, 'Q3', 'Zahlen & Operationen', 1, 20, ARRAY['addition_carry', 'subtraction_carry'], ARRAY['schule', 'spielplatz', 'natur'], 'basic'),
  (1, 'Q4', 'Zahlen & Operationen', 1, 100, ARRAY['multiplication_intro'], ARRAY['einkaufen', 'verkehr', 'sport'], 'basic'),
  
  -- Klasse 2
  (2, 'Q1', 'Zahlen & Operationen', 1, 100, ARRAY['addition', 'subtraction'], ARRAY['einkaufen', 'sport', 'musik'], 'basic'),
  (2, 'Q2', 'Zahlen & Operationen', 1, 100, ARRAY['multiplication_2_5_10'], ARRAY['küche', 'garten', 'werkstatt'], 'basic'),
  (2, 'Q3', 'Zahlen & Operationen', 1, 100, ARRAY['multiplication_tables', 'division_intro'], ARRAY['bibliothek', 'museum', 'park'], 'basic'),
  (2, 'Q4', 'Zahlen & Operationen', 1, 100, ARRAY['multiplication_all', 'division'], ARRAY['reisen', 'computer', 'wissenschaft'], 'basic'),
  
  -- Klasse 3
  (3, 'Q1', 'Zahlen & Operationen', 1, 1000, ARRAY['written_addition', 'written_subtraction'], ARRAY['architektur', 'technik', 'umwelt'], 'intermediate'),
  (3, 'Q2', 'Zahlen & Operationen', 1, 1000, ARRAY['multiplication_advanced', 'division_remainder'], ARRAY['industrie', 'landwirtschaft', 'handel'], 'intermediate'),
  (3, 'Q3', 'Zahlen & Operationen', 1, 1000, ARRAY['decimal_intro'], ARRAY['finanzen', 'messungen', 'experimente'], 'intermediate'),
  (3, 'Q4', 'Zahlen & Operationen', 1, 1000, ARRAY['decimal_operations'], ARRAY['astronomie', 'geologie', 'biologie'], 'intermediate'),
  
  -- Klasse 4
  (4, 'Q1', 'Zahlen & Operationen', 1, 1000000, ARRAY['large_numbers', 'estimation'], ARRAY['geographie', 'geschichte', 'weltraum'], 'intermediate'),
  (4, 'Q2', 'Zahlen & Operationen', 1, 1000000, ARRAY['fractions_basic'], ARRAY['kunst', 'literatur', 'philosophie'], 'intermediate'),
  (4, 'Q3', 'Zahlen & Operationen', 1, 1000000, ARRAY['fractions_operations'], ARRAY['medizin', 'psychologie', 'soziologie'], 'intermediate'),
  (4, 'Q4', 'Zahlen & Operationen', 1, 1000000, ARRAY['mixed_operations'], ARRAY['politik', 'wirtschaft', 'recht'], 'intermediate'),
  
  -- Klasse 5-10 (erweiterte Bereiche)
  (5, 'Q1', 'Zahlen & Operationen', -1000, 1000000, ARRAY['negative_numbers', 'fractions_advanced'], ARRAY['wissenschaft', 'technik', 'forschung'], 'advanced'),
  (6, 'Q1', 'Zahlen & Operationen', -1000000, 1000000, ARRAY['percentage', 'proportions'], ARRAY['statistik', 'wahrscheinlichkeit', 'analyse'], 'advanced'),
  (7, 'Q1', 'Zahlen & Operationen', -1000000, 1000000, ARRAY['algebra_intro', 'equations_linear'], ARRAY['mathematik', 'physik', 'ingenieurwesen'], 'advanced'),
  (8, 'Q1', 'Zahlen & Operationen', -1000000, 1000000, ARRAY['functions_linear', 'systems'], ARRAY['informatik', 'robotik', 'automation'], 'advanced'),
  (9, 'Q1', 'Zahlen & Operationen', -1000000, 1000000, ARRAY['quadratic_functions', 'trigonometry'], ARRAY['astrophysik', 'quantenphysik', 'biotechnologie'], 'expert'),
  (10, 'Q1', 'Zahlen & Operationen', -1000000, 1000000, ARRAY['exponential', 'logarithm'], ARRAY['nanotechnologie', 'genetik', 'künstliche_intelligenz'], 'expert');

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_curriculum_rules_grade_quarter ON curriculum_parameter_rules(grade, quarter);
CREATE INDEX IF NOT EXISTS idx_templates_parametrized ON templates(is_parametrized) WHERE is_parametrized = true;