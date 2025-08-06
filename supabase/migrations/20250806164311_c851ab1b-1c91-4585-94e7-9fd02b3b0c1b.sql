-- Phase 1: Contextual Foundation Database Schema

-- Table for context dimensions (location, activity, objects, characters, etc.)
CREATE TABLE public.context_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- 'location', 'activity', 'object', 'character', 'setting'
  examples TEXT[], -- Array of example values
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for scenario families (groups of related contexts)
CREATE TABLE public.scenario_families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- math, german, etc.
  grade_min INTEGER NOT NULL DEFAULT 1,
  grade_max INTEGER NOT NULL DEFAULT 12,
  base_template TEXT NOT NULL,
  context_slots JSONB NOT NULL DEFAULT '{}', -- {location: "", activity: "", objects: []}
  difficulty_level TEXT NOT NULL DEFAULT 'medium', -- easy, medium, hard
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for context variants (specific instances of contexts)
CREATE TABLE public.context_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_family_id UUID NOT NULL REFERENCES public.scenario_families(id) ON DELETE CASCADE,
  dimension_type TEXT NOT NULL, -- location, activity, object, character
  value TEXT NOT NULL,
  semantic_cluster TEXT, -- for grouping similar contexts
  usage_count INTEGER NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking user context history
CREATE TABLE public.user_context_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario_family_id UUID NOT NULL REFERENCES public.scenario_families(id) ON DELETE CASCADE,
  context_combination JSONB NOT NULL, -- {location: "bakery", activity: "buying", objects: ["bread", "cake"]}
  context_hash TEXT NOT NULL, -- SHA-256 hash for quick similarity detection
  category TEXT NOT NULL,
  grade INTEGER NOT NULL,
  question_id UUID,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for semantic clusters (grouping similar contexts)
CREATE TABLE public.semantic_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_name TEXT NOT NULL,
  dimension_type TEXT NOT NULL,
  category TEXT NOT NULL,
  representative_terms TEXT[], -- Array of terms that represent this cluster
  semantic_distance_threshold REAL NOT NULL DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for context diversity metrics
CREATE TABLE public.context_diversity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  grade INTEGER NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  context_repetition_rate REAL NOT NULL DEFAULT 0.0, -- CRR
  semantic_distance_score REAL NOT NULL DEFAULT 0.0, -- SDS  
  scenario_family_coverage REAL NOT NULL DEFAULT 0.0, -- SFC
  user_engagement_score REAL NOT NULL DEFAULT 0.0, -- UES
  total_questions INTEGER NOT NULL DEFAULT 0,
  unique_contexts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, grade, session_date)
);

-- Indexes for performance
CREATE INDEX idx_context_variants_scenario_family ON public.context_variants(scenario_family_id);
CREATE INDEX idx_context_variants_dimension_type ON public.context_variants(dimension_type);
CREATE INDEX idx_context_variants_semantic_cluster ON public.context_variants(semantic_cluster);
CREATE INDEX idx_user_context_history_user_category ON public.user_context_history(user_id, category, grade);
CREATE INDEX idx_user_context_history_hash ON public.user_context_history(context_hash);
CREATE INDEX idx_user_context_history_session_date ON public.user_context_history(session_date);
CREATE INDEX idx_scenario_families_category_grade ON public.scenario_families(category, grade_min, grade_max);
CREATE INDEX idx_semantic_clusters_dimension_category ON public.semantic_clusters(dimension_type, category);

-- Enable Row Level Security
ALTER TABLE public.context_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_diversity_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view context dimensions" ON public.context_dimensions FOR SELECT USING (true);
CREATE POLICY "Anyone can view scenario families" ON public.scenario_families FOR SELECT USING (true);
CREATE POLICY "Anyone can view context variants" ON public.context_variants FOR SELECT USING (true);
CREATE POLICY "Anyone can view semantic clusters" ON public.semantic_clusters FOR SELECT USING (true);

CREATE POLICY "Users can view own context history" ON public.user_context_history 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context history" ON public.user_context_history 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own diversity metrics" ON public.context_diversity_metrics 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diversity metrics" ON public.context_diversity_metrics 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diversity metrics" ON public.context_diversity_metrics 
FOR UPDATE USING (auth.uid() = user_id);

-- System policies for management
CREATE POLICY "System can manage context dimensions" ON public.context_dimensions FOR ALL USING (true);
CREATE POLICY "System can manage scenario families" ON public.scenario_families FOR ALL USING (true);
CREATE POLICY "System can manage context variants" ON public.context_variants FOR ALL USING (true);
CREATE POLICY "System can manage semantic clusters" ON public.semantic_clusters FOR ALL USING (true);

-- Insert initial context dimensions
INSERT INTO public.context_dimensions (name, description, category, examples) VALUES
('location', 'Physical places and settings', 'location', ARRAY['bakery', 'school', 'park', 'library', 'market', 'zoo', 'museum', 'farm', 'beach', 'forest']),
('activity', 'Actions and activities', 'activity', ARRAY['buying', 'learning', 'playing', 'reading', 'cooking', 'building', 'exploring', 'collecting', 'organizing', 'measuring']),
('objects', 'Physical items and things', 'object', ARRAY['books', 'toys', 'fruits', 'tools', 'clothes', 'vehicles', 'animals', 'plants', 'food', 'sports equipment']),
('characters', 'People and personas', 'character', ARRAY['student', 'teacher', 'parent', 'shopkeeper', 'farmer', 'chef', 'scientist', 'artist', 'athlete', 'musician']),
('time_setting', 'Temporal contexts', 'setting', ARRAY['morning', 'afternoon', 'weekend', 'holiday', 'season', 'birthday', 'festival', 'school day', 'vacation', 'special event']);

-- Insert initial scenario families for math
INSERT INTO public.scenario_families (name, description, category, grade_min, grade_max, base_template, context_slots, difficulty_level) VALUES
('counting_collection', 'Counting objects in various settings', 'math', 1, 3, 'In the {location}, {character} is {activity} {objects}. How many {objects} are there?', '{"location": "", "character": "", "activity": "", "objects": ""}', 'easy'),
('addition_scenarios', 'Addition problems in real contexts', 'math', 1, 4, 'At the {location}, {character} had {number1} {objects}. Then they got {number2} more {objects}. How many {objects} do they have now?', '{"location": "", "character": "", "objects": "", "number1": "", "number2": ""}', 'medium'),
('subtraction_scenarios', 'Subtraction problems in real contexts', 'math', 1, 4, 'In the {location}, {character} started with {number1} {objects}. They gave away {number2} {objects}. How many {objects} are left?', '{"location": "", "character": "", "objects": "", "number1": "", "number2": ""}', 'medium'),
('multiplication_scenarios', 'Multiplication in groups and arrays', 'math', 2, 6, 'At the {location}, there are {groups} groups of {objects}. Each group has {items_per_group} {objects}. How many {objects} are there in total?', '{"location": "", "groups": "", "objects": "", "items_per_group": ""}', 'hard'),
('division_scenarios', 'Division and sharing problems', 'math', 2, 6, 'The {character} at the {location} has {total} {objects}. They want to share them equally among {people} people. How many {objects} will each person get?', '{"location": "", "character": "", "objects": "", "total": "", "people": ""}', 'hard');

-- Insert context variants for locations
INSERT INTO public.context_variants (scenario_family_id, dimension_type, value, semantic_cluster) 
SELECT sf.id, 'location', location, 
  CASE 
    WHEN location IN ('bakery', 'market', 'shop') THEN 'commercial'
    WHEN location IN ('school', 'library', 'museum') THEN 'educational'
    WHEN location IN ('park', 'beach', 'forest') THEN 'outdoor'
    WHEN location IN ('home', 'kitchen', 'bedroom') THEN 'domestic'
  END
FROM public.scenario_families sf
CROSS JOIN (VALUES 
  ('bakery'), ('market'), ('shop'), ('school'), ('library'), ('museum'),
  ('park'), ('beach'), ('forest'), ('home'), ('kitchen'), ('playground'),
  ('zoo', 'entertainment'), ('farm'), ('garden'), ('restaurant')
) AS locations(location);

-- Insert semantic clusters
INSERT INTO public.semantic_clusters (cluster_name, dimension_type, category, representative_terms) VALUES
('commercial_places', 'location', 'math', ARRAY['bakery', 'market', 'shop', 'store', 'restaurant']),
('educational_places', 'location', 'math', ARRAY['school', 'library', 'museum', 'classroom']),
('outdoor_places', 'location', 'math', ARRAY['park', 'beach', 'forest', 'playground', 'garden']),
('domestic_places', 'location', 'math', ARRAY['home', 'kitchen', 'bedroom', 'living room']),
('food_related', 'object', 'math', ARRAY['apples', 'bread', 'cookies', 'cake', 'fruits']),
('school_items', 'object', 'math', ARRAY['books', 'pencils', 'notebooks', 'crayons', 'papers']),
('toys_games', 'object', 'math', ARRAY['balls', 'dolls', 'blocks', 'puzzles', 'cards']),
('people_roles', 'character', 'math', ARRAY['student', 'teacher', 'parent', 'shopkeeper', 'chef']);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_context_dimensions_updated_at
  BEFORE UPDATE ON public.context_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_updated_at();

CREATE TRIGGER update_scenario_families_updated_at
  BEFORE UPDATE ON public.scenario_families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_updated_at();

CREATE TRIGGER update_context_variants_updated_at
  BEFORE UPDATE ON public.context_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_updated_at();

CREATE TRIGGER update_semantic_clusters_updated_at
  BEFORE UPDATE ON public.semantic_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_updated_at();

CREATE TRIGGER update_context_diversity_metrics_updated_at
  BEFORE UPDATE ON public.context_diversity_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_context_updated_at();