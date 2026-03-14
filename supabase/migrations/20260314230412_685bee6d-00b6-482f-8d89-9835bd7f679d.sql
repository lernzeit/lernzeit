-- Add admin role for Thomas
INSERT INTO public.user_roles (user_id, role)
VALUES ('6d9b5e43-0fb6-4b03-9880-41cae512b80d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;