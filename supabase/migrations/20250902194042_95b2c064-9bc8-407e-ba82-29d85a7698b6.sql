-- PHASE 3: Generate missing Grade 4 Q4 templates for correct curriculum compliance
-- Target: 60+ templates across 4 domains with proper balance

SELECT net.http_post(
  url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/template-generator',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
  body := json_build_object(
    'grade', 4,
    'domain', 'Zahlen & Operationen', 
    'quarter', 'Q4',
    'count', 20,
    'difficulty', 'medium'
  )::jsonb
),
net.http_post(
  url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/template-generator',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
  body := json_build_object(
    'grade', 4,
    'domain', 'Größen & Messen', 
    'quarter', 'Q4',
    'count', 15,
    'difficulty', 'medium'
  )::jsonb
),
net.http_post(
  url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/template-generator',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
  body := json_build_object(
    'grade', 4,
    'domain', 'Raum & Form', 
    'quarter', 'Q4',
    'count', 15,
    'difficulty', 'medium'
  )::jsonb
),
net.http_post(
  url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/template-generator',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
  body := json_build_object(
    'grade', 4,
    'domain', 'Daten & Zufall', 
    'quarter', 'Q4',
    'count', 15,
    'difficulty', 'medium'  
  )::jsonb
);