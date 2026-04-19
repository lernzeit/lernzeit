
-- Add per-user push notification hour preferences (Europe/Berlin local time)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS daily_summary_hour smallint NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS learning_reminder_hour smallint NOT NULL DEFAULT 16;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_daily_summary_hour_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_daily_summary_hour_check CHECK (daily_summary_hour BETWEEN 0 AND 23);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_learning_reminder_hour_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_learning_reminder_hour_check CHECK (learning_reminder_hour BETWEEN 0 AND 23);
