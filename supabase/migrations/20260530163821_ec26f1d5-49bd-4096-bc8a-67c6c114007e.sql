
-- 1. Create table
CREATE TABLE public.parent_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  contact_email text,
  app_version text,
  platform text,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Grants
GRANT SELECT, INSERT ON public.parent_feedback TO authenticated;
GRANT UPDATE (status, admin_note) ON public.parent_feedback TO authenticated;
GRANT ALL ON public.parent_feedback TO service_role;

-- 3. RLS
ALTER TABLE public.parent_feedback ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can insert own feedback"
  ON public.parent_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.parent_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.parent_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feedback"
  ON public.parent_feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Validation trigger
CREATE OR REPLACE FUNCTION public.validate_parent_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category NOT IN ('bug','wish','praise','other') THEN
    RAISE EXCEPTION 'category must be one of bug, wish, praise, other';
  END IF;
  IF length(trim(NEW.message)) < 1 OR length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'message length must be between 1 and 1000';
  END IF;
  IF NEW.platform IS NOT NULL AND NEW.platform NOT IN ('web','ios','android') THEN
    RAISE EXCEPTION 'platform must be web, ios, or android';
  END IF;
  IF NEW.status NOT IN ('open','read','done') THEN
    RAISE EXCEPTION 'status must be open, read, or done';
  END IF;
  IF NEW.contact_email IS NOT NULL AND length(NEW.contact_email) > 255 THEN
    RAISE EXCEPTION 'contact_email too long';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER parent_feedback_validate
  BEFORE INSERT OR UPDATE ON public.parent_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_parent_feedback();

-- 6. Updated_at trigger
CREATE TRIGGER parent_feedback_touch_updated_at
  BEFORE UPDATE ON public.parent_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. Index for admin inbox
CREATE INDEX idx_parent_feedback_status_created
  ON public.parent_feedback (status, created_at DESC);

-- 8. Profiles columns for rating prompt
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_rating_prompt_at timestamptz,
  ADD COLUMN IF NOT EXISTS rating_prompt_response text;
