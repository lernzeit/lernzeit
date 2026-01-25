-- =============================================
-- SECURITY FIX 1: Remove unsafe set_user_admin function
-- This function has no access controls and allows privilege escalation
-- =============================================
DROP FUNCTION IF EXISTS public.set_user_admin(text);

-- =============================================
-- SECURITY FIX 2: Create proper user roles system
-- =============================================

-- Create role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SECURITY FIX 3: Fix invitation_codes policies
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Read valid unused codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can claim available codes" ON public.invitation_codes;

-- Parents can only see their own codes
CREATE POLICY "Parents can view own invitation codes"
ON public.invitation_codes
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- Only the code creator (parent) can update their own codes
CREATE POLICY "Parents can update own codes"
ON public.invitation_codes
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- =============================================
-- SECURITY FIX 4: Fix template_scores view access
-- Create RLS-safe access through the underlying templates table
-- =============================================

-- The template_scores view inherits from templates table
-- Ensure templates table has proper RLS
-- Add policy for authenticated users to read templates
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.templates;
CREATE POLICY "Authenticated users can read active templates"
ON public.templates
FOR SELECT
TO authenticated
USING (status = 'ACTIVE');

-- =============================================
-- SECURITY FIX 5: Improve apply_template_rating validation
-- =============================================
CREATE OR REPLACE FUNCTION public.apply_template_rating(tid uuid, stars integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Strict validation: reject invalid input
  IF stars < 1 OR stars > 5 THEN
    RAISE EXCEPTION 'Invalid rating: must be between 1 and 5, got %', stars;
  END IF;
  
  UPDATE public.templates
  SET rating_sum = rating_sum + stars,
      rating_count = rating_count + 1
  WHERE id = tid;
END;
$$;