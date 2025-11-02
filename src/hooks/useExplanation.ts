import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useExplanation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async (
    question: string,
    answer: string,
    grade: number,
    subject: string = 'mathematik'
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setExplanation(null);

      const { data, error: explainError } = await supabase.functions.invoke(
        'explain-answer',
        {
          body: { question, answer, grade, subject }
        }
      );

      if (explainError) throw explainError;

      if (data?.explanation) {
        setExplanation(data.explanation);
      } else {
        throw new Error('No explanation received');
      }

      return data.explanation;
    } catch (err) {
      console.error('Error fetching explanation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch explanation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearExplanation = () => {
    setExplanation(null);
    setError(null);
  };

  return {
    explanation,
    isLoading,
    error,
    fetchExplanation,
    clearExplanation
  };
};
