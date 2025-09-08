-- Manual test of controller function
SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/test-api',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"test": "cron_debug"}'::jsonb
  ) as test_result;

-- Direct template generation test  
INSERT INTO templates (
  student_prompt, 
  solution, 
  distractors, 
  explanation,
  question_type,
  difficulty,
  grade,
  grade_app,
  quarter_app,
  domain,
  subcategory,
  tags,
  variables,
  status
) VALUES (
  'Testfrage: Wie viel ist 2 + 3?',
  '{"value": 5}',
  '["3", "4", "6", "7"]',
  'Addition von zwei einstelligen Zahlen',
  'MultipleChoice',
  'AFB I',
  1,
  1,
  'Q2',
  'Zahlen & Operationen',
  'Addition',
  ARRAY['Addition', 'ZR_10'],
  '{"a": 2, "b": 3}',
  'ACTIVE'
);