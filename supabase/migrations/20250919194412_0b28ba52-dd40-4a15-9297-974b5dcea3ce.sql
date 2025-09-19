-- Create table to track earned minutes and prevent double requests
CREATE TABLE public.user_earned_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('learning', 'game')),
  minutes_earned INTEGER NOT NULL DEFAULT 0,
  minutes_requested INTEGER NOT NULL DEFAULT 0,
  minutes_remaining INTEGER GENERATED ALWAYS AS (minutes_earned - minutes_requested) STORED,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_earned_minutes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own earned minutes"
  ON public.user_earned_minutes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own earned minutes"
  ON public.user_earned_minutes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requested minutes"
  ON public.user_earned_minutes FOR UPDATE
  USING (auth.uid() = user_id);

-- Add daily request tracking to prevent over-requesting
CREATE TABLE public.daily_request_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_minutes_requested INTEGER NOT NULL DEFAULT 0,
  total_minutes_approved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_date)
);

-- Enable RLS
ALTER TABLE public.daily_request_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily summary"
  ON public.daily_request_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage daily summary"
  ON public.daily_request_summary FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_earned_minutes_user_id ON public.user_earned_minutes(user_id);
CREATE INDEX idx_user_earned_minutes_session ON public.user_earned_minutes(session_id, session_type);
CREATE INDEX idx_daily_request_summary_user_date ON public.daily_request_summary(user_id, request_date);