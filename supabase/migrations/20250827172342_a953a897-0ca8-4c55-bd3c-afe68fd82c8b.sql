-- Erstelle ein Beispiel-Template für parametrisierte Fragen
INSERT INTO templates (
  grade, grade_app, quarter_app, domain, subcategory, difficulty, question_type,
  student_prompt, solution, distractors, explanation_teacher,
  parameter_definitions, curriculum_rules, is_parametrized, status
) VALUES (
  2, 2, 'Q2', 'Zahlen & Operationen', 'Einmaleins (Aufbau)', 'AFB I', 'multiple-choice',
  '{name} sammelt {gegenstand}. {name} hat {zahl1} Gruppen mit jeweils {zahl2} {gegenstand}. Wie viele {gegenstand} hat {name} insgesamt?',
  '{zahl1} × {zahl2}',
  ARRAY['{zahl1} + {zahl2}', '{zahl1} - {zahl2}', '{zahl1} × {zahl2} + 1'],
  'Diese Aufgabe übt das Einmaleins mit realitätsnahen Kontexten für Klasse 2.',
  '{"zahl1": {"type": "number", "curriculum_rule": "zahlenraum_grade_quarter"}, "zahl2": {"type": "number", "curriculum_rule": "multiplication_range"}, "name": {"type": "word", "curriculum_rule": "age_appropriate_names"}, "gegenstand": {"type": "word", "curriculum_rule": "context_objects"}}',
  '{"grade": 2, "quarter": "Q2", "zahlenraum_max": 100, "operation_types": ["multiplication_2_5_10"], "contexts": ["küche", "garten", "werkstatt"]}',
  true, 'ACTIVE'
);