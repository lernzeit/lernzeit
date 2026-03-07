import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PreloadedQuestion } from '@/hooks/useQuestionPreloader';

export interface ReviewItem {
  id: string;
  question_text: string;
  correct_answer: any;
  question_type: string;
  options: any;
  subject: string;
  grade: number;
  hint?: string;
  review_count: number;
  next_review_at: string;
}

// Intervals: 1 day, 3 days, 7 days, then retire
const REVIEW_INTERVALS_HOURS = [24, 72, 168];

export function useReviewQueue(userId?: string) {
  const [dueQuestions, setDueQuestions] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch questions due for review (not reported, not retired, due now).
   * Returns up to `limit` questions for the given subject.
   */
  const fetchDueQuestions = useCallback(async (
    subject: string,
    grade: number,
    limit: number = 2
  ): Promise<ReviewItem[]> => {
    if (!userId) return [];
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('review_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('subject', subject)
        .eq('grade', grade)
        .eq('is_retired', false)
        .eq('was_reported', false)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching review queue:', error);
        return [];
      }

      const items = (data || []) as ReviewItem[];
      setDueQuestions(items);
      return items;
    } catch (err) {
      console.error('Error in fetchDueQuestions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Add a wrongly answered question to the review queue.
   * Skips if question text already exists (dedup).
   */
  const addToQueue = useCallback(async (question: PreloadedQuestion) => {
    if (!userId) return;

    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('review_queue')
        .select('id')
        .eq('user_id', userId)
        .eq('question_text', question.questionText)
        .eq('is_retired', false)
        .maybeSingle();

      if (existing) {
        // Already in queue – reset next_review_at to tomorrow
        await supabase
          .from('review_queue')
          .update({
            next_review_at: new Date(Date.now() + REVIEW_INTERVALS_HOURS[0] * 3600_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        return;
      }

      await supabase.from('review_queue').insert({
        user_id: userId,
        question_text: question.questionText,
        correct_answer: question.correctAnswer,
        question_type: question.questionType,
        options: question.options || null,
        subject: question.subject,
        grade: question.grade,
        hint: question.hint || null,
        next_review_at: new Date(Date.now() + REVIEW_INTERVALS_HOURS[0] * 3600_000).toISOString(),
      });

      console.log('📝 Added to review queue:', question.questionText.substring(0, 50));
    } catch (err) {
      console.error('Error adding to review queue:', err);
    }
  }, [userId]);

  /**
   * Mark a review question as answered correctly.
   * Advances the interval or retires the question.
   */
  const markReviewCorrect = useCallback(async (reviewId: string) => {
    if (!userId) return;

    try {
      // Get current state
      const { data: item } = await supabase
        .from('review_queue')
        .select('review_count, max_reviews')
        .eq('id', reviewId)
        .single();

      if (!item) return;

      const newCount = (item.review_count || 0) + 1;

      if (newCount >= item.max_reviews) {
        // Retire – question mastered
        await supabase
          .from('review_queue')
          .update({ is_retired: true, review_count: newCount, updated_at: new Date().toISOString() })
          .eq('id', reviewId);
        console.log('✅ Review item retired (mastered)');
      } else {
        // Advance to next interval
        const intervalHours = REVIEW_INTERVALS_HOURS[Math.min(newCount, REVIEW_INTERVALS_HOURS.length - 1)];
        await supabase
          .from('review_queue')
          .update({
            review_count: newCount,
            next_review_at: new Date(Date.now() + intervalHours * 3600_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewId);
        console.log(`🔄 Review advanced to interval ${intervalHours}h (count: ${newCount})`);
      }
    } catch (err) {
      console.error('Error marking review correct:', err);
    }
  }, [userId]);

  /**
   * Mark a review question as answered incorrectly.
   * Resets interval back to 1 day.
   */
  const markReviewWrong = useCallback(async (reviewId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('review_queue')
        .update({
          next_review_at: new Date(Date.now() + REVIEW_INTERVALS_HOURS[0] * 3600_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      console.log('❌ Review reset to 1-day interval');
    } catch (err) {
      console.error('Error marking review wrong:', err);
    }
  }, [userId]);

  /**
   * Mark a review item as reported (excluded from future reviews).
   */
  const markAsReported = useCallback(async (questionText: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('review_queue')
        .update({ was_reported: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('question_text', questionText);
    } catch (err) {
      console.error('Error marking review as reported:', err);
    }
  }, [userId]);

  /**
   * Convert a ReviewItem to PreloadedQuestion format for rendering.
   */
  const toPreloadedQuestion = (item: ReviewItem): PreloadedQuestion & { _reviewId: string; _isReview: true } => ({
    id: item.id,
    grade: item.grade,
    subject: item.subject,
    difficulty: 'medium',
    questionText: item.question_text,
    questionType: item.question_type as PreloadedQuestion['questionType'],
    correctAnswer: item.correct_answer,
    options: item.options,
    hint: item.hint,
    createdAt: '',
    _reviewId: item.id,
    _isReview: true,
  });

  return {
    dueQuestions,
    loading,
    fetchDueQuestions,
    addToQueue,
    markReviewCorrect,
    markReviewWrong,
    markAsReported,
    toPreloadedQuestion,
  };
}
