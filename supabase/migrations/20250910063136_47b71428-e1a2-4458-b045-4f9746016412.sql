-- First, let's check and modify the role constraint to allow 'admin'
-- Drop the existing constraint and create a new one that includes 'admin'

-- Check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'c';

-- Drop the existing role check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that allows child, parent, and admin
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('child', 'parent', 'admin'));

-- Now we can safely create the admin function
CREATE OR REPLACE FUNCTION public.set_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email in auth.users
  SELECT id INTO user_record FROM auth.users WHERE email = user_email;
  
  IF user_record.id IS NOT NULL THEN
    -- Update or insert profile with admin role
    INSERT INTO public.profiles (id, name, role, grade, avatar_id, avatar_color, created_at, updated_at)
    VALUES (
      user_record.id,
      'Admin User',
      'admin',
      NULL,
      'cat', 
      '#3b82f6',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET 
      role = 'admin',
      updated_at = now();
      
    RAISE NOTICE 'User % has been set to admin role', user_email;
  ELSE
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$;