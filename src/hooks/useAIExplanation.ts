import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAIExplanationOptions {
  autoFetch?: boolean;
}

export const useAIExplanation = (options: UseAIExplanationOptions = {}) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchExplanation = useCallback(async (
    question: string,
    correctAnswer: string,
    grade: number,
    subject: string,
    userAnswer?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setIsFallback(false);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-explain', {
        body: {
          question,
          correctAnswer,
          userAnswer,
          grade,
          subject
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate explanation');
      }

      setExplanation(data.explanation);
      setIsFallback(data.isFallback || false);
      return data.explanation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Explanation error:', err);
      
      // Set fallback explanation
      const fallback = "Toll gemacht! Übung macht den Meister - versuche es gleich nochmal! 💪";
      setExplanation(fallback);
      setIsFallback(true);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearExplanation = useCallback(() => {
    setExplanation(null);
    setError(null);
    setIsFallback(false);
  }, []);

  return {
    explanation,
    isLoading,
    error,
    isFallback,
    fetchExplanation,
    clearExplanation
  };
};
