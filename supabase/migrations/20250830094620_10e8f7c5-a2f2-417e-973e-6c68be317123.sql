-- Phase 2: Rename explanation_teacher column to explanation in both tables
ALTER TABLE templates RENAME COLUMN explanation_teacher TO explanation;
ALTER TABLE template_scores RENAME COLUMN explanation_teacher TO explanation;