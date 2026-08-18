REVOKE EXECUTE ON FUNCTION public.set_own_platform(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_child_platform(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_children_platforms() FROM anon;