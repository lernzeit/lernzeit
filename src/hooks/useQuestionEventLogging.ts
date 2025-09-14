// Hook for logging question events (correct/incorrect answers, ratings)
import { useCallback } from 'react';
import { logPlay, rateTemplate } from '@/data/templateMetrics';
import { supabase } from '@/lib/supabase';

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

  // Log when user rates a question
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

  return {
    logQuestionAnswer,
    logQuestionRating
  };
}