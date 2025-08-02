-- Phase 2 & 3: Add new achievement types for long-term achievements
-- First, let's add new enum values for achievement types
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'monthly_active';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'weekly_consistency';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'seasonal_learner';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'milestone_months';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'progress_tracker';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'dedication_levels';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'knowledge_accumulator';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'early_bird';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'night_owl';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'weekend_warrior';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'comeback_kid';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'mentor_ready';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'accuracy_improvement';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'long_term_dedication';
ALTER TYPE public.achievement_type ADD VALUE IF NOT EXISTS 'time_based_consistency';