import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SaveSessionParams {
  category: string;
  grade: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  earnedSeconds: number;
  questionSource?: string;
}

interface SaveSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Hook to consistently save game sessions to the database.
 * Handles all DB operations for completed learning sessions.
 * 
 * IMPORTANT: time_earned is ALWAYS stored in SECONDS for consistency.
 */
export function useGameSessionSaver() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveSession = useCallback(async ({
    category,
    grade,
    correctAnswers,
    totalQuestions,
    timeSpentSeconds,
    earnedSeconds,
    questionSource = 'template-bank'
  }: SaveSessionParams): Promise<SaveSessionResult> => {
    if (!user) {
      console.warn('⚠️ Cannot save session: User not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    setIsSaving(true);
    
    try {
      const sessionData = {
        user_id: user.id,
        category: category.toLowerCase(),
        grade,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_spent: timeSpentSeconds,
        time_earned: earnedSeconds, // ALWAYS in seconds
        duration_seconds: Math.round(timeSpentSeconds),
        score: Math.round((correctAnswers / totalQuestions) * 100),
        question_source: questionSource,
        session_date: new Date().toISOString(),
      };

      console.log('💾 Saving game session:', sessionData);

      const { data, error } = await supabase
        .from('game_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error saving game session:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Game session saved successfully:', data.id);
      return { success: true, sessionId: data.id };
    } catch (error) {
      console.error('❌ Exception saving game session:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  return {
    saveSession,
    isSaving,
    userId: user?.id
  };
}
