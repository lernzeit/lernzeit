// Hook for logging question events (correct/incorrect answers, ratings, emoji feedback)
import { useCallback } from 'react';
import { logPlay, rateTemplate } from '@/data/templateMetrics';
import { supabase } from '@/lib/supabase';

export type QuestionFeedbackType = 'thumbs_up' | 'thumbs_down' | 'too_hard' | 'too_easy';

export function useQuestionEventLogging() {
  // Log when user answers a question
  const logQuestionAnswer = useCallback(async (
    templateId: string | undefined,
    isCorrect: boolean
  ) => {
    if (!templateId || templateId.startsWith('card_') || templateId.startsWith('kb_')) {
      console.log('⏭️ Skipping event logging for non-template question');
      return;
    }

    try {
      console.log(`📊 Logging ${isCorrect ? 'CORRECT' : 'INCORRECT'} answer for template ${templateId}`);
      
      // Use RPC for reliable stats update with immediate effect
      await logPlay(templateId, isCorrect);
      
      console.log(`✅ Template stats updated: ${templateId} - plays+1, correct+${isCorrect ? 1 : 0}`);
    } catch (error) {
      console.error('❌ Failed to log question answer:', error);
    }
  }, []);

  // Log when user rates a question (legacy - still supported)
  const logQuestionRating = useCallback(async (
    templateId: string | undefined,
    stars: number
  ) => {
    if (!templateId || templateId.startsWith('card_') || templateId.startsWith('kb_')) {
      console.log('⏭️ Skipping rating logging for non-template question');
      return;
    }

    if (stars < 1 || stars > 5) {
      console.warn('⚠️ Invalid rating value:', stars);
      return;
    }

    try {
      console.log(`⭐ Logging ${stars} star rating for template ${templateId}`);
      await rateTemplate(templateId, stars);
    } catch (error) {
      console.error('❌ Failed to log question rating:', error);
    }
  }, []);

  // Log emoji feedback (thumbs up/down, too hard/easy)
  const logQuestionFeedback = useCallback(async (
    templateId: string | undefined,
    feedbackType: QuestionFeedbackType,
    userId: string,
    category: string,
    grade: number,
    questionContent: string
  ) => {
    if (!templateId || templateId.startsWith('card_') || templateId.startsWith('kb_')) {
      console.log('⏭️ Skipping emoji feedback logging for non-template question');
      return;
    }

    try {
      console.log(`😊 Logging emoji feedback: ${feedbackType} for template ${templateId}`);
      
      // Store feedback in question_feedback table
      const { error: feedbackError } = await supabase
        .from('question_feedback')
        .insert({
          user_id: userId,
          template_id: templateId,
          feedback_type: feedbackType,
          category: category,
          grade: grade,
          question_content: questionContent,
          question_type: 'template'
        });

      if (feedbackError) {
        throw feedbackError;
      }

      // Convert feedback to rating for template metrics
      const ratingMap: Record<QuestionFeedbackType, number> = {
        'thumbs_up': 5,
        'thumbs_down': 1,
        'too_hard': 2,
        'too_easy': 3
      };
      
      await rateTemplate(templateId, ratingMap[feedbackType]);
      
      console.log(`✅ Emoji feedback logged: ${feedbackType} -> rating ${ratingMap[feedbackType]}`);
    } catch (error) {
      console.error('❌ Failed to log emoji feedback:', error);
    }
  }, []);

  return {
    logQuestionAnswer,
    logQuestionRating,
    logQuestionFeedback
  };
}