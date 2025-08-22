-- Remove old profile picture storage policies since we now use secure avatars
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;

-- Remove the profile-pictures storage bucket since it's no longer needed
DELETE FROM storage.buckets WHERE id = 'profile-pictures';