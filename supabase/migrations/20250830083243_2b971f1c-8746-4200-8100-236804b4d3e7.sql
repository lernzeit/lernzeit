-- Remove all visual/drawing templates from the database
UPDATE templates 
SET status = 'INACTIVE'
WHERE status = 'ACTIVE' 
AND (
  student_prompt ILIKE '%zeichn%' OR 
  student_prompt ILIKE '%mal %' OR 
  student_prompt ILIKE '%konstruier%' OR 
  student_prompt ILIKE '%entwirf%' OR 
  student_prompt ILIKE '%bild%' OR 
  student_prompt ILIKE '%skizz%' OR 
  student_prompt ILIKE '%zeich%' OR 
  student_prompt ILIKE '%draw%' OR 
  student_prompt ILIKE '%paint%' OR
  student_prompt ILIKE '%verbind%' OR
  student_prompt ILIKE '%ordne%' OR
  student_prompt ILIKE '%netz%' OR
  student_prompt ILIKE '%diagramm%' OR
  student_prompt ILIKE '%grafik%' OR
  student_prompt ILIKE '%figur%zeichn%' OR
  student_prompt ILIKE '%körper%zeichn%' OR
  student_prompt ILIKE '%winkel%zeichn%' OR
  student_prompt ILIKE '%gerade%zeichn%'
);

-- Log the removal for tracking
INSERT INTO template_events (type, payload)
VALUES ('visual_templates_removed', json_build_object(
  'timestamp', now(),
  'reason', 'UI does not support drawing/visual tasks',
  'action', 'Set visual templates to INACTIVE status'
));