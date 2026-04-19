
-- 1. Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- 2. Create index for fast username lookups
CREATE INDEX idx_profiles_username ON public.profiles (username) WHERE username IS NOT NULL;

-- 3. Create RPC to resolve username to email (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT u.email
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(p_username)
  LIMIT 1;
$$;

-- 4. Update handle_new_user trigger to save username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, grade, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'child'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'child') = 'child' 
      THEN COALESCE((NEW.raw_user_meta_data->>'grade')::integer, 1)
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
