import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIQuestion {
  id: string;
  grade: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH' | 'DRAG_DROP' | 'FILL_BLANK';
  correctAnswer: any;
  options?: any;
  hint?: string;
  createdAt: string;
}

interface UseAIQuestionOptions {
  defaultDifficulty?: 'easy' | 'medium' | 'hard';
  preferredType?: AIQuestion['questionType'];
}

export const useAIQuestion = (options: UseAIQuestionOptions = {}) => {
  const [question, setQuestion] = useState<AIQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestion = useCallback(async (
    grade: number,
    subject: string,
    difficulty?: 'easy' | 'medium' | 'hard',
    questionType?: AIQuestion['questionType']
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-question-generator', {
        body: {
          grade,
          subject,
          difficulty: difficulty || options.defaultDifficulty || 'medium',
          questionType: questionType || options.preferredType
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate question');
      }

      setQuestion(data.question);
      return data.question;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Question generation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options.defaultDifficulty, options.preferredType]);

  const clearQuestion = useCallback(() => {
    setQuestion(null);
    setError(null);
  }, []);

  return {
    question,
    isLoading,
    error,
    generateQuestion,
    clearQuestion
  };
};
