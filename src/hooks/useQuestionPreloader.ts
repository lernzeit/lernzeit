import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PreloadedQuestion {
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

interface UseQuestionPreloaderOptions {
  grade: number;
  subject: string;
  totalQuestions: number;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
}

export const useQuestionPreloader = ({
  grade,
  subject,
  totalQuestions,
  initialDifficulty = 'medium'
}: UseQuestionPreloaderOptions) => {
  const [questions, setQuestions] = useState<PreloadedQuestion[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentDifficultyRef = useRef(initialDifficulty);

  const generateSingleQuestion = useCallback(async (
    difficulty: 'easy' | 'medium' | 'hard',
    signal?: AbortSignal
  ): Promise<PreloadedQuestion | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-question-generator', {
        body: {
          grade,
          subject,
          difficulty
        }
      });

      if (signal?.aborted) return null;

      if (invokeError) {
        console.error('Question generation error:', invokeError);
        return null;
      }

      if (!data?.success) {
        console.error('Question generation failed:', data?.error);
        return null;
      }

      return data.question;
    } catch (err) {
      if (signal?.aborted) return null;
      console.error('Question fetch error:', err);
      return null;
    }
  }, [grade, subject]);

  // Start preloading all questions
  const startPreloading = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsInitialLoading(true);
    setError(null);
    setQuestions([]);
    setLoadingProgress(0);

    const loadedQuestions: PreloadedQuestion[] = [];
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['medium', 'medium', 'medium', 'easy', 'hard'];

    // Load first question and show immediately
    const firstQuestion = await generateSingleQuestion(currentDifficultyRef.current, signal);
    
    if (signal.aborted) return;
    
    if (firstQuestion) {
      loadedQuestions.push(firstQuestion);
      setQuestions([firstQuestion]);
      setLoadingProgress(1);
      setIsInitialLoading(false); // First question ready, game can start!
    } else {
      setError('Frage konnte nicht geladen werden. Bitte versuche es erneut.');
      setIsInitialLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Load remaining questions in background
    for (let i = 1; i < totalQuestions; i++) {
      if (signal.aborted) break;
      
      const difficulty = difficulties[i] || 'medium';
      const question = await generateSingleQuestion(difficulty, signal);
      
      if (signal.aborted) break;
      
      if (question) {
        loadedQuestions.push(question);
        setQuestions([...loadedQuestions]);
        setLoadingProgress(loadedQuestions.length);
      }
    }

    isLoadingRef.current = false;
  }, [generateSingleQuestion, totalQuestions]);

  // Generate a replacement question (when difficulty changes)
  const generateReplacementQuestion = useCallback(async (
    index: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<PreloadedQuestion | null> => {
    currentDifficultyRef.current = difficulty;
    const question = await generateSingleQuestion(difficulty);
    
    if (question) {
      setQuestions(prev => {
        const updated = [...prev];
        // Add or replace at the specified index
        if (index < updated.length) {
          // Update difficulty for future questions if we have spare capacity
        }
        return updated;
      });
    }
    
    return question;
  }, [generateSingleQuestion]);

  // Get question at index, or generate if not available
  const getQuestion = useCallback((index: number): PreloadedQuestion | null => {
    return questions[index] || null;
  }, [questions]);

  // Check if question is available
  const isQuestionReady = useCallback((index: number): boolean => {
    return index < questions.length;
  }, [questions]);

  // Update difficulty for future questions
  const updateDifficulty = useCallback((newDifficulty: 'easy' | 'medium' | 'hard') => {
    currentDifficultyRef.current = newDifficulty;
  }, []);

  // Cancel all loading
  const cancelLoading = useCallback(() => {
    abortControllerRef.current?.abort();
    isLoadingRef.current = false;
  }, []);

  // Start loading on mount
  useEffect(() => {
    startPreloading();
    
    return () => {
      cancelLoading();
    };
  }, [startPreloading, cancelLoading]);

  return {
    questions,
    isInitialLoading,
    loadingProgress,
    totalQuestions,
    error,
    getQuestion,
    isQuestionReady,
    generateReplacementQuestion,
    updateDifficulty,
    cancelLoading,
    reload: startPreloading
  };
};
