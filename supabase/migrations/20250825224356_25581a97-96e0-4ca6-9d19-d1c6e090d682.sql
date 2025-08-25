-- Erstelle erste Test-Templates für Klasse 1, Mathematik
INSERT INTO templates (
  grade, grade_app, quarter_app, domain, subcategory, difficulty, question_type,
  student_prompt, variables, solution, distractors, unit, explanation_teacher,  
  source_skill_id, tags, status
) VALUES 
(1, 1, 'Q2', 'Zahlen & Operationen', 'Zahlvorstellung/Zählen', 'AFB I', 'multiple_choice',
 'Wie viele Äpfel siehst du? 🍎🍎🍎🍎🍎', '{"count": 5, "objects": "Äpfel"}', 
 '5', '["3", "4", "6", "7"]', '', 'Die Schüler zählen die Äpfel und wählen die richtige Anzahl.',
 'G1-Q1-ZA-ab13a721', '["Zählen", "ZR_10"]', 'ACTIVE'),

(1, 1, 'Q2', 'Zahlen & Operationen', 'Add/Sub (mental)', 'AFB I', 'text_input',
 'Rechne: 3 + 2 = ?', '{"a": 3, "b": 2}', '5', '[]', '', 
 'Einfache Addition im Zahlenraum bis 10 ohne Übergang.',
 'G1-Q1-ZA-23f6f2c9', '["Addition", "ZR_10"]', 'ACTIVE'),

(1, 1, 'Q2', 'Raum & Form', 'Formen erkennen', 'AFB I', 'multiple_choice',  
 'Welche Form ist ein Kreis?', '{"shapes": ["Kreis", "Dreieck", "Quadrat"]}',
 'Kreis', '["Dreieck", "Quadrat", "Rechteck"]', '', 
 'Grundformen erkennen und unterscheiden.',
 'G1-Q1-RA-cd1c87a1', '["Formen", "Eigenschaften"]', 'ACTIVE'),

(1, 1, 'Q2', 'Größen & Messen', 'Messen/Schätzen', 'AFB I', 'multiple_choice',
 'Was ist länger: ein Stift oder ein Tisch?', '{"objects": ["Stift", "Tisch"]}',
 'Tisch', '["Stift", "beide gleich", "kann man nicht sagen"]', '',
 'Längenvergleich durch Alltagserfahrung.',
 'G1-Q1-GR-31ade5b6', '["Länge", "Schätzen"]', 'ACTIVE'),

(1, 1, 'Q2', 'Daten & Zufall', 'Daten erfassen', 'AFB I', 'text_input',
 'Zähle die Striche: ||||', '{"tally_marks": 4}', '4', '[]', '',
 'Strichlisten lesen und auswerten.',
 'G1-Q1-DA-bea86e75', '["Diagramm", "Strichliste"]', 'ACTIVE')