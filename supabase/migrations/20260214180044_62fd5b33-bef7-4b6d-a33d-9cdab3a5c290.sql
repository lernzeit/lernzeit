
-- Fix: Make claim_invitation_code SECURITY DEFINER so children can use it
CREATE OR REPLACE FUNCTION public.claim_invitation_code(code_to_claim text, claiming_child_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  -- Find and validate code (bypasses RLS due to SECURITY DEFINER)
  SELECT * INTO code_record 
  FROM public.invitation_codes 
  WHERE code = code_to_claim
    AND is_used = false 
    AND expires_at > NOW()
    AND child_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code nicht gefunden oder ungültig'
    );
  END IF;
  
  -- Claim the code
  UPDATE public.invitation_codes 
  SET child_id = claiming_child_id, is_used = true, used_at = NOW()
  WHERE id = code_record.id;
  
  -- Create parent-child relationship
  INSERT INTO public.parent_child_relationships (parent_id, child_id)
  VALUES (code_record.parent_id, claiming_child_id)
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object(
    'success', true,
    'parent_id', code_record.parent_id,
    'child_id', claiming_child_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
