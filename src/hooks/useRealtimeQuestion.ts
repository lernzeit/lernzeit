import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimeQuestion {
  id: string;
  topic_id: string;
  grade: number;
  subject: string;
  topic_title: string;
  question_text: string;
  question_type: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH';
  correct_answer: any;
  options: any;
}

export const useRealtimeQuestion = () => {
  const [question, setQuestion] = useState<RealtimeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestion = async (
    topic_id: string,
    grade: number,
    subject: string,
    topic_title: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🎲 Generating realtime question...', { topic_id, grade, subject, topic_title });

      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-question-realtime',
        {
          body: { topic_id, grade, subject, topic_title }
        }
      );

      if (generateError) {
        console.error('Generation error:', generateError);
        throw generateError;
      }

      if (!data?.success || !data?.question) {
        throw new Error('No question received from API');
      }

      console.log('✅ Question generated:', data.question);
      setQuestion(data.question);
      return data.question;
    } catch (err) {
      console.error('Error generating question:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate question';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearQuestion = () => {
    setQuestion(null);
    setError(null);
  };

  return {
    question,
    isLoading,
    error,
    generateQuestion,
    clearQuestion
  };
};
