ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_platform text,
  ADD COLUMN IF NOT EXISTS last_platform_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_last_platform_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_last_platform_check
  CHECK (last_platform IS NULL OR last_platform IN ('web','android','ios'));

CREATE OR REPLACE FUNCTION public.set_own_platform(p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_platform NOT IN ('web','android','ios') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;
  UPDATE public.profiles
     SET last_platform = p_platform,
         last_platform_at = now()
   WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_child_platform(p_child_id uuid, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_platform NOT IN ('web','android','ios') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_child_relationships r
    WHERE r.parent_id = auth.uid() AND r.child_id = p_child_id
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.profiles
     SET last_platform = p_platform,
         last_platform_at = now()
   WHERE id = p_child_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_children_platforms()
RETURNS TABLE(child_id uuid, platform text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.child_id,
         COALESCE(
           NULLIF(p.last_platform, 'web'),
           (SELECT t.platform FROM public.push_tokens t
             WHERE t.user_id = r.child_id
             ORDER BY t.updated_at DESC LIMIT 1),
           p.last_platform
         ) AS platform
    FROM public.parent_child_relationships r
    JOIN public.profiles p ON p.id = r.child_id
   WHERE r.parent_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.set_own_platform(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_child_platform(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_children_platforms() TO authenticated;