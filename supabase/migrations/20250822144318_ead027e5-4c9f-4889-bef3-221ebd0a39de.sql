-- Add avatar columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_id text DEFAULT 'cat',
ADD COLUMN avatar_color text DEFAULT '#3b82f6';

-- Remove the old avatar_url column since we're using secure avatars now
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS avatar_url;