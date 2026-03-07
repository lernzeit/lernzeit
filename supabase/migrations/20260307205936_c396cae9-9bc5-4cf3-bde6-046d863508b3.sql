
-- Spaced Repetition review queue
CREATE TABLE public.review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_text text NOT NULL,
  correct_answer jsonb NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  subject text NOT NULL,
  grade integer NOT NULL,
  hint text,
  next_review_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  review_count integer NOT NULL DEFAULT 0,
  max_reviews integer NOT NULL DEFAULT 3,
  is_retired boolean NOT NULL DEFAULT false,
  was_reported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review queue"
  ON public.review_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review items"
  ON public.review_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review items"
  ON public.review_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review items"
  ON public.review_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient due-question queries
CREATE INDEX idx_review_queue_due ON public.review_queue (user_id, next_review_at, is_retired, was_reported)
  WHERE is_retired = false AND was_reported = false;
