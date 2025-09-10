-- Add admin role to existing role enum (if exists) or create new admin users
-- First, let's check if we can update profiles to add admin role

-- Add a simple way to set admin role for specific user ID
-- Replace 'your-user-id-here' with your actual user ID from Supabase Auth
INSERT INTO public.profiles (id, name, role, grade, avatar_id, avatar_color, created_at, updated_at)
VALUES (
  -- You'll need to replace this with your actual user ID from auth.users
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Admin',
  'admin',
  NULL,
  'cat',
  '#3b82f6',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  updated_at = now();

-- Create a simple function to upgrade a user to admin (for easier testing)
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