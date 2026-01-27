-- =====================================================
-- SECURITY FIX: Complete profiles table protection
-- Drop and recreate INSERT policy to avoid conflict
-- =====================================================

-- Drop the existing INSERT policy to avoid conflict
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with consistent naming
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);