ALTER TABLE public.invitation_codes ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

CREATE TABLE IF NOT EXISTS public.parent_link_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stage smallint NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage)
);

GRANT SELECT ON public.parent_link_reminders TO authenticated;
GRANT ALL ON public.parent_link_reminders TO service_role;

ALTER TABLE public.parent_link_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own link reminders"
ON public.parent_link_reminders FOR SELECT TO authenticated
USING (auth.uid() = user_id);