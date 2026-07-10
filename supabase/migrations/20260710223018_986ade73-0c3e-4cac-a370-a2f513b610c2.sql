
-- Ideas table
CREATE TABLE public.feature_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 5 AND 2000),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('learning','ui','parental','gamification','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','planned','in_progress','completed','declined')),
  vote_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_ideas TO authenticated;
GRANT ALL ON public.feature_ideas TO service_role;

ALTER TABLE public.feature_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ideas"
  ON public.feature_ideas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Parents can insert own ideas"
  ON public.feature_ideas FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );

CREATE POLICY "Owner or admin can update ideas"
  ON public.feature_ideas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete ideas"
  ON public.feature_ideas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_feature_ideas_created_at ON public.feature_ideas(created_at DESC);
CREATE INDEX idx_feature_ideas_votes ON public.feature_ideas(vote_count DESC);
CREATE INDEX idx_feature_ideas_status ON public.feature_ideas(status);

CREATE TRIGGER trg_feature_ideas_updated_at
  BEFORE UPDATE ON public.feature_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votes table
CREATE TABLE public.feature_idea_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.feature_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.feature_idea_votes TO authenticated;
GRANT ALL ON public.feature_idea_votes TO service_role;

ALTER TABLE public.feature_idea_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read votes"
  ON public.feature_idea_votes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Parents can insert own vote"
  ON public.feature_idea_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );

CREATE POLICY "Users can remove own vote"
  ON public.feature_idea_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_feature_idea_votes_idea ON public.feature_idea_votes(idea_id);

-- Comments table
CREATE TABLE public.feature_idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.feature_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_idea_comments TO authenticated;
GRANT ALL ON public.feature_idea_comments TO service_role;

ALTER TABLE public.feature_idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments"
  ON public.feature_idea_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Parents can insert own comments"
  ON public.feature_idea_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
  );

CREATE POLICY "Owner or admin can update comments"
  ON public.feature_idea_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete comments"
  ON public.feature_idea_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_feature_idea_comments_idea ON public.feature_idea_comments(idea_id, created_at DESC);

CREATE TRIGGER trg_feature_idea_comments_updated_at
  BEFORE UPDATE ON public.feature_idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vote count triggers
CREATE OR REPLACE FUNCTION public.feature_idea_votes_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_ideas SET vote_count = vote_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_ideas SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feature_idea_votes_count
  AFTER INSERT OR DELETE ON public.feature_idea_votes
  FOR EACH ROW EXECUTE FUNCTION public.feature_idea_votes_count_trigger();

-- Comment count triggers
CREATE OR REPLACE FUNCTION public.feature_idea_comments_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_ideas SET comment_count = comment_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_ideas SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feature_idea_comments_count
  AFTER INSERT OR DELETE ON public.feature_idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.feature_idea_comments_count_trigger();
