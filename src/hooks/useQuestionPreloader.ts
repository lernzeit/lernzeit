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
  topicHint?: string;
}

const RECENT_QUESTIONS_KEY = (grade: number, subject: string) =>
  `recent_questions_${grade}_${subject}`;
const RECENT_QUESTIONS_MAX = 30;
const REQUEST_TIMEOUT_MS = 20000; // 20 second timeout per question

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
  const mountedRef = useRef(true);
  
  // Session-level deduplication
  const seenTextsRef = useRef<Set<string>>(new Set());

  // Stable refs for grade/subject to avoid useCallback dependency issues
  const gradeRef = useRef(grade);
  const subjectRef = useRef(subject);
  const totalQuestionsRef = useRef(totalQuestions);
  
  useEffect(() => {
    gradeRef.current = grade;
    subjectRef.current = subject;
    totalQuestionsRef.current = totalQuestions;
  }, [grade, subject, totalQuestions]);

  const getRecentQuestionTexts = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem(RECENT_QUESTIONS_KEY(gradeRef.current, subjectRef.current));
      return new Set<string>(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set<string>();
    }
  }, []);

  const saveRecentQuestionTexts = useCallback((texts: Set<string>) => {
    try {
      const arr = Array.from(texts).slice(-RECENT_QUESTIONS_MAX);
      localStorage.setItem(RECENT_QUESTIONS_KEY(gradeRef.current, subjectRef.current), JSON.stringify(arr));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const generateSingleQuestion = useCallback(async (
    difficulty: 'easy' | 'medium' | 'hard',
    signal?: AbortSignal,
    excludeTexts?: Set<string>
  ): Promise<PreloadedQuestion | null> => {
    try {
      // Add timeout via AbortController
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Question generation timed out after', REQUEST_TIMEOUT_MS, 'ms');
      }, REQUEST_TIMEOUT_MS);

      const fetchPromise = supabase.functions.invoke('ai-question-generator', {
        body: {
          grade: gradeRef.current,
          subject: subjectRef.current,
          difficulty,
          excludeTexts: excludeTexts ? Array.from(excludeTexts).slice(-20) : []
        }
      });

      // Race between the fetch and a timeout
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: new Error('Request timeout') });
        }, REQUEST_TIMEOUT_MS);
      });

      const { data, error: invokeError } = await Promise.race([fetchPromise, timeoutPromise]);

      clearTimeout(timeoutId);

      if (signal?.aborted) return null;

      if (invokeError) {
        console.error('❌ Question generation error:', invokeError);
        return null;
      }

      if (!data?.success) {
        console.error('❌ Question generation failed:', data?.error || 'Unknown error');
        return null;
      }

      console.log('✅ Question generated:', data.question?.questionType, '-', data.question?.questionText?.substring(0, 50));
      return data.question;
    } catch (err) {
      if (signal?.aborted) return null;
      console.error('❌ Question fetch error:', err);
      return null;
    }
  }, []); // No deps - uses refs

  const startPreloading = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('⚠️ Already loading, skipping');
      return;
    }
    isLoadingRef.current = true;
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    if (mountedRef.current) {
      setIsInitialLoading(true);
      setError(null);
      setQuestions([]);
      setLoadingProgress(0);
    }
    seenTextsRef.current = new Set();

    const recentTexts = getRecentQuestionTexts();
    const total = totalQuestionsRef.current;

    const difficulties: ('easy' | 'medium' | 'hard')[] = ['medium', 'medium', 'easy', 'medium', 'hard'];

    console.log('🚀 Starting question preload for grade', gradeRef.current, 'subject', subjectRef.current);

    // Load FIRST question
    const firstQuestion = await generateSingleQuestion(
      currentDifficultyRef.current,
      signal,
      recentTexts
    );
    
    if (signal.aborted || !mountedRef.current) {
      isLoadingRef.current = false;
      return;
    }
    
    if (firstQuestion) {
      if (!seenTextsRef.current.has(firstQuestion.questionText)) {
        seenTextsRef.current.add(firstQuestion.questionText);
        recentTexts.add(firstQuestion.questionText);
      }
      
      setQuestions([firstQuestion]);
      setLoadingProgress(1);
      setIsInitialLoading(false);
      
      // Load remaining questions IN PARALLEL
      if (total > 1) {
        const remainingPromises = [];
        for (let i = 1; i < total; i++) {
          const difficulty = difficulties[i] || 'medium';
          remainingPromises.push(generateSingleQuestion(difficulty, signal, recentTexts));
        }
        
        const results = await Promise.allSettled(remainingPromises);
        
        if (!signal.aborted && mountedRef.current) {
          const successfulQuestions = results
            .filter((r): r is PromiseFulfilledResult<PreloadedQuestion | null> => 
              r.status === 'fulfilled' && r.value !== null
            )
            .map(r => r.value as PreloadedQuestion)
            .filter(q => {
              if (seenTextsRef.current.has(q.questionText)) return false;
              seenTextsRef.current.add(q.questionText);
              recentTexts.add(q.questionText);
              return true;
            });
          
          setQuestions(prev => [...prev, ...successfulQuestions]);
          setLoadingProgress(1 + successfulQuestions.length);
        }
      }

      saveRecentQuestionTexts(recentTexts);
    } else {
      console.error('❌ First question failed to load');
      if (mountedRef.current) {
        setError('Frage konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.');
        setIsInitialLoading(false);
      }
    }

    isLoadingRef.current = false;
  }, [generateSingleQuestion, getRecentQuestionTexts, saveRecentQuestionTexts]);

  const getQuestion = useCallback((index: number): PreloadedQuestion | null => {
    return questions[index] || null;
  }, [questions]);

  const isQuestionReady = useCallback((index: number): boolean => {
    return index < questions.length;
  }, [questions]);

  const updateDifficulty = useCallback((newDifficulty: 'easy' | 'medium' | 'hard') => {
    currentDifficultyRef.current = newDifficulty;
  }, []);

  const cancelLoading = useCallback(() => {
    abortControllerRef.current?.abort();
    isLoadingRef.current = false;
  }, []);

  // Start loading on mount - use ref-based approach to avoid re-triggering
  const hasStartedRef = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startPreloading();
    }
    
    return () => {
      mountedRef.current = false;
      cancelLoading();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: we use refs for grade/subject/totalQuestions so this only runs on mount

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
    reload: useCallback(() => {
      hasStartedRef.current = false;
      isLoadingRef.current = false;
      startPreloading();
    }, [startPreloading])
  };
};
