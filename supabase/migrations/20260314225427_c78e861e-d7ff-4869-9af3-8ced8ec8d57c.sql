-- Drop the broken trigger first
DROP TRIGGER IF EXISTS update_question_feedback_updated_at ON public.question_feedback;

-- Drop old constraint first
ALTER TABLE public.question_feedback DROP CONSTRAINT IF EXISTS question_feedback_feedback_type_check;

-- Migrate old feedback types
UPDATE public.question_feedback SET feedback_type = 'good_question' WHERE feedback_type = 'thumbs_up';
UPDATE public.question_feedback SET feedback_type = 'wrong_answer' WHERE feedback_type = 'thumbs_down';
UPDATE public.question_feedback SET feedback_type = 'wrong_answer' WHERE feedback_type = 'calculation_error';

-- Re-add updated constraint
ALTER TABLE public.question_feedback ADD CONSTRAINT question_feedback_feedback_type_check CHECK (feedback_type IN ('incorrect', 'too_easy', 'too_hard', 'confusing', 'duplicate', 'wrong_answer', 'confusing_question', 'good_question', 'other'));