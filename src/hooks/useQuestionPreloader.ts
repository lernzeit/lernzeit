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
  task?: string;
  createdAt: string;
}

interface UseQuestionPreloaderOptions {
  grade: number;
  subject: string;
  totalQuestions: number;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
}

const RECENT_QUESTIONS_KEY = (grade: number, subject: string) =>
  `recent_questions_${grade}_${subject}`;
const RECENT_QUESTIONS_MAX = 30; // Remember last 30 question texts to avoid repetition

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
  
  // Session-level deduplication: tracks question texts seen in this session
  const seenTextsRef = useRef<Set<string>>(new Set());

  // Load recently shown question texts from localStorage for cross-session dedup
  const getRecentQuestionTexts = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem(RECENT_QUESTIONS_KEY(grade, subject));
      return new Set<string>(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set<string>();
    }
  }, [grade, subject]);

  // Save seen question texts to localStorage (keep last N)
  const saveRecentQuestionTexts = useCallback((texts: Set<string>) => {
    try {
      const arr = Array.from(texts).slice(-RECENT_QUESTIONS_MAX);
      localStorage.setItem(RECENT_QUESTIONS_KEY(grade, subject), JSON.stringify(arr));
    } catch {
      // Ignore localStorage errors (private mode etc.)
    }
  }, [grade, subject]);

  const generateSingleQuestion = useCallback(async (
    difficulty: 'easy' | 'medium' | 'hard',
    signal?: AbortSignal,
    excludeTexts?: Set<string>
  ): Promise<PreloadedQuestion | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-question-generator', {
        body: {
          grade,
          subject,
          difficulty,
          excludeTexts: excludeTexts ? Array.from(excludeTexts).slice(-20) : []
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

  // Start preloading all questions - PARALLEL loading for speed
  const startPreloading = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsInitialLoading(true);
    setError(null);
    setQuestions([]);
    setLoadingProgress(0);
    seenTextsRef.current = new Set();

    // Load cross-session history for deduplication
    const recentTexts = getRecentQuestionTexts();

    const difficulties: ('easy' | 'medium' | 'hard')[] = ['medium', 'medium', 'easy', 'medium', 'hard'];

    // Load FIRST question immediately, then REST in PARALLEL
    const firstQuestion = await generateSingleQuestion(
      currentDifficultyRef.current,
      signal,
      recentTexts
    );
    
    if (signal.aborted) {
      isLoadingRef.current = false;
      return;
    }
    
    if (firstQuestion) {
      // Session dedup check
      if (!seenTextsRef.current.has(firstQuestion.questionText)) {
        seenTextsRef.current.add(firstQuestion.questionText);
        recentTexts.add(firstQuestion.questionText);
        setQuestions([firstQuestion]);
        setLoadingProgress(1);
        setIsInitialLoading(false);
        
        // Load remaining questions IN PARALLEL
        if (totalQuestions > 1) {
          const remainingPromises = [];
          for (let i = 1; i < totalQuestions; i++) {
            const difficulty = difficulties[i] || 'medium';
            remainingPromises.push(generateSingleQuestion(difficulty, signal, recentTexts));
          }
          
          const results = await Promise.allSettled(remainingPromises);
          
          if (!signal.aborted) {
            const successfulQuestions = results
              .filter((r): r is PromiseFulfilledResult<PreloadedQuestion | null> => 
                r.status === 'fulfilled' && r.value !== null
              )
              .map(r => r.value as PreloadedQuestion)
              .filter(q => {
                // Session-level dedup
                if (seenTextsRef.current.has(q.questionText)) return false;
                seenTextsRef.current.add(q.questionText);
                recentTexts.add(q.questionText);
                return true;
              });
            
            setQuestions(prev => [...prev, ...successfulQuestions]);
            setLoadingProgress(1 + successfulQuestions.length);
          }
        }

        // Persist seen questions for future sessions
        saveRecentQuestionTexts(recentTexts);
      } else {
        // First question was a dupe (rare) — still show it
        setQuestions([firstQuestion]);
        setLoadingProgress(1);
        setIsInitialLoading(false);
      }
    } else {
      setError('Frage konnte nicht geladen werden. Bitte versuche es erneut.');
      setIsInitialLoading(false);
    }

    isLoadingRef.current = false;
  }, [generateSingleQuestion, totalQuestions, getRecentQuestionTexts, saveRecentQuestionTexts]);

  // Get question at index
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
    updateDifficulty,
    cancelLoading,
    reload: startPreloading
  };
};
