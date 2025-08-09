-- Phase 3 (fix 2): Policies without IF NOT EXISTS; ensure idempotency via DROP POLICY IF EXISTS

-- Create user difficulty profiles table
CREATE TABLE IF NOT EXISTS public.user_difficulty_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  grade INTEGER NOT NULL,
  current_level DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (current_level >= 0.0 AND current_level <= 1.0),
  mastery_score DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (mastery_score >= 0.0 AND mastery_score <= 1.0),
  learning_velocity DECIMAL(3,2) NOT NULL DEFAULT 0.0,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category, grade)
);

-- Enable RLS
ALTER TABLE public.user_difficulty_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies for user difficulty profiles
DROP POLICY IF EXISTS "Users can view their own difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can insert their own difficulty profiles" ON public.user_difficulty_profiles;
DROP POLICY IF EXISTS "Users can update their own difficulty profiles" ON public.user_difficulty_profiles;

CREATE POLICY "Users can view their own difficulty profiles" 
ON public.user_difficulty_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own difficulty profiles" 
ON public.user_difficulty_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own difficulty profiles" 
ON public.user_difficulty_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create question quality metrics table
CREATE TABLE IF NOT EXISTS public.question_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  grade INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
  dimension_scores JSONB NOT NULL DEFAULT '{}',
  confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  improvement_suggestions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Recreate policies for question quality metrics
DROP POLICY IF EXISTS "Users can view their own quality metrics" ON public.question_quality_metrics;
DROP POLICY IF EXISTS "Users can insert their own quality metrics" ON public.question_quality_metrics;

CREATE POLICY "Users can view their own quality metrics" 
ON public.question_quality_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quality metrics" 
ON public.question_quality_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_difficulty_profiles_user_category_grade 
ON public.user_difficulty_profiles(user_id, category, grade);

CREATE INDEX IF NOT EXISTS idx_question_quality_metrics_user_session 
ON public.question_quality_metrics(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_question_quality_metrics_category_grade 
ON public.question_quality_metrics(category, grade, created_at);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_difficulty_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_difficulty_profiles_timestamp ON public.user_difficulty_profiles;
CREATE TRIGGER update_user_difficulty_profiles_timestamp
  BEFORE UPDATE ON public.user_difficulty_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_difficulty_profile_timestamp();