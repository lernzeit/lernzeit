import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  question_type: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH';
  correct_answer: any;
  options: any;
  quality_score: number;
  is_active: boolean;
  plays: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
}

interface UseQuestionsOptions {
  topic_id?: string;
  question_type?: string;
  limit?: number;
  randomize?: boolean;
}

export const useQuestions = ({
  topic_id,
  question_type,
  limit = 10,
  randomize = true
}: UseQuestionsOptions) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('questions')
          .select('*')
          .eq('is_active', true);

        if (topic_id) {
          query = query.eq('topic_id', topic_id);
        }

        if (question_type) {
          query = query.eq('question_type', question_type);
        }

        query = query.limit(limit * 2); // Fetch more for randomization

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        let resultQuestions = data || [];

        // Randomize if requested
        if (randomize && resultQuestions.length > 0) {
          resultQuestions = resultQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);
        } else {
          resultQuestions = resultQuestions.slice(0, limit);
        }

        setQuestions(resultQuestions as Question[]);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [topic_id, question_type, limit, randomize]);

  return { questions, isLoading, error };
};

export const useGenerateQuestions = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestions = async (topic_id: string, count: number = 10) => {
    try {
      setIsGenerating(true);
      setError(null);

      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-questions',
        {
          body: { topic_id, count, trigger: 'manual' }
        }
      );

      if (generateError) throw generateError;

      return data;
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateQuestions, isGenerating, error };
};
