-- Phase 1: SOFORTIGE Template-Datenbank-Bereinigung
-- Delete all fraction templates (Brüche) that are causing curriculum violations
DELETE FROM public.templates 
WHERE domain = 'Zahlen & Operationen' 
  AND (subcategory LIKE '%Bruch%' OR student_prompt LIKE '%Bruch%' OR student_prompt LIKE '%Nenner%' OR student_prompt LIKE '%Zähler%');

-- Delete templates with Grade 5+ content that shouldn't exist yet  
DELETE FROM public.templates 
WHERE grade >= 5 
  AND (student_prompt LIKE '%negative%' OR student_prompt LIKE '%Vorzeichen%' OR student_prompt LIKE '%Dezimal%');

-- Delete templates with wrong curriculum assignment (Grade 4 Q4 content assigned to other grades/quarters)
DELETE FROM public.templates 
WHERE NOT (grade = 4 AND quarter_app = 'Q4') 
  AND (student_prompt LIKE '%Komma%' OR student_prompt LIKE '%€%' OR subcategory LIKE '%Dezimal%');