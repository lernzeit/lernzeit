-- Create database function to find duplicate templates
CREATE OR REPLACE FUNCTION find_duplicate_templates()
RETURNS TABLE(
  normalized_prompt TEXT,
  duplicate_count BIGINT,
  all_ids TEXT,
  earliest_created TIMESTAMP WITH TIME ZONE,
  original_prompts TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  WITH duplicates AS (
    SELECT 
      TRIM(LOWER(REPLACE(REPLACE(REPLACE(t.student_prompt, ' plus ', ' + '), ' mal ', ' × '), '  ', ' '))) as norm_prompt,
      COUNT(*) as dup_count,
      STRING_AGG(t.id::text, ', ' ORDER BY t.created_at ASC) as ids,
      MIN(t.created_at) as earliest,
      STRING_AGG(DISTINCT t.student_prompt, ' | ') as prompts
    FROM public.templates t 
    WHERE t.status = 'ACTIVE' 
    GROUP BY TRIM(LOWER(REPLACE(REPLACE(REPLACE(t.student_prompt, ' plus ', ' + '), ' mal ', ' × '), '  ', ' ')))
    HAVING COUNT(*) > 1 
    ORDER BY COUNT(*) DESC
  )
  SELECT 
    d.norm_prompt,
    d.dup_count,
    d.ids,
    d.earliest,
    d.prompts
  FROM duplicates d;
END;
$function$;

-- Create function to trigger duplicate cleanup
CREATE OR REPLACE FUNCTION trigger_duplicate_cleanup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result json;
BEGIN
  -- Call the duplicate cleanup edge function
  SELECT net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/cleanup-duplicates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q"}'::jsonb,
    body := '{"trigger": "automatic"}'::jsonb
  ) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Duplicate cleanup triggered',
    'request_id', result
  );
END;
$function$;