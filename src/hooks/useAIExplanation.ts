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
  const [verdict, setVerdict] = useState<'stated_correct' | 'user_correct' | 'both_correct' | 'both_wrong' | 'unclear' | null>(null);
  const [verifiedCorrectAnswer, setVerifiedCorrectAnswer] = useState<string | null>(null);

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
    setVerdict(null);
    setVerifiedCorrectAnswer(null);

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
      setVerdict(data.verdict ?? null);
      setVerifiedCorrectAnswer(data.verifiedCorrectAnswer ?? null);
      return {
        explanation: data.explanation as string,
        verdict: (data.verdict ?? null) as typeof verdict,
        verifiedCorrectAnswer: (data.verifiedCorrectAnswer ?? null) as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Explanation error:', err);
      
      // Set fallback explanation
      const fallback = "Toll gemacht! Übung macht den Meister - versuche es gleich nochmal! 💪";
      setExplanation(fallback);
      setIsFallback(true);
      return { explanation: fallback, verdict: null, verifiedCorrectAnswer: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearExplanation = useCallback(() => {
    setExplanation(null);
    setError(null);
    setIsFallback(false);
    setVerdict(null);
    setVerifiedCorrectAnswer(null);
  }, []);

  return {
    explanation,
    isLoading,
    error,
    isFallback,
    verdict,
    verifiedCorrectAnswer,
    fetchExplanation,
    clearExplanation
  };
};
