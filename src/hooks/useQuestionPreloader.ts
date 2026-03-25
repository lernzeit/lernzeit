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

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const tryParseJsonString = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
};

const extractOptionList = (value: unknown): string[] => {
  const parsed = tryParseJsonString(value);

  if (Array.isArray(parsed)) {
    return sanitizeStringArray(parsed);
  }

  if (typeof parsed !== 'string') return [];

  return Array.from(
    new Set(
      parsed
        .replace(/\r/g, '\n')
        .split(/[\n,;|]+/)
        .map((entry) => entry.replace(/^[\s•\-–—]*(?:[A-Z]\)|\d+[.)])?\s*/i, '').trim())
        .filter(Boolean)
    )
  );
};

const resolveMultipleChoiceAnswerText = (
  question: Pick<PreloadedQuestion, 'correctAnswer' | 'options' | 'task'>
): string | null => {
  const options = extractOptionList(question.options).length > 0
    ? extractOptionList(question.options)
    : extractOptionList(question.task);

  const answer = question.correctAnswer;

  if (typeof answer === 'number') {
    return options[answer] ?? null;
  }

  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if (!trimmed) return null;

    const numericIndex = Number(trimmed);
    if (Number.isInteger(numericIndex) && options[numericIndex] !== undefined) {
      return options[numericIndex];
    }

    return trimmed;
  }

  if (answer && typeof answer === 'object' && 'value' in answer) {
    const nestedValue = (answer as { value?: unknown }).value;

    if (typeof nestedValue === 'number') {
      return options[nestedValue] ?? null;
    }

    if (typeof nestedValue === 'string') {
      return nestedValue.trim() || null;
    }
  }

  return null;
};

const isQuestionRenderable = (question: PreloadedQuestion): boolean => {
  switch (question.questionType) {
    case 'MULTIPLE_CHOICE':
      return extractOptionList(question.options).length >= 2;
    case 'FREETEXT':
      return resolveMultipleChoiceAnswerText({
        correctAnswer: question.correctAnswer,
        options: question.options,
        task: question.task
      }) !== null || String(question.correctAnswer ?? '').trim().length > 0;
    case 'SORT': {
      const order = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer?.order;
      return Array.isArray(order) && order.length >= 2;
    }
    case 'MATCH': {
      const leftItems = question.options?.leftItems;
      const rightItems = question.options?.rightItems;
      return Array.isArray(leftItems) && leftItems.length > 0 && Array.isArray(rightItems) && rightItems.length > 0;
    }
    case 'FILL_BLANK': {
      const blanks = question.correctAnswer?.blanks || (Array.isArray(question.correctAnswer) ? question.correctAnswer : []);
      return Array.isArray(blanks) && blanks.length > 0;
    }
    case 'DRAG_DROP':
      return Array.isArray(question.options?.items) && question.options.items.length > 0
        && Array.isArray(question.options?.categories) && question.options.categories.length > 0;
    default:
      return false;
  }
};

const normalizeQuestionPayload = (question: PreloadedQuestion): PreloadedQuestion => {
  const normalizedQuestion = {
    ...question,
    correctAnswer: tryParseJsonString(question.correctAnswer),
    options: tryParseJsonString(question.options)
  };

  // Ensure questionType is always set
  if (!normalizedQuestion.questionType) {
    normalizedQuestion.questionType = 'FREETEXT';
  }

  if (normalizedQuestion.questionType === 'MULTIPLE_CHOICE') {
    const directOptions = extractOptionList(normalizedQuestion.options);
    const taskOptions = extractOptionList(normalizedQuestion.task);
    const normalizedOptions = directOptions.length >= 2
      ? directOptions
      : taskOptions.length >= 2
        ? taskOptions
        : directOptions;

    if (normalizedOptions.length > 0) {
      normalizedQuestion.options = normalizedOptions;
    }

    if ((!Array.isArray(normalizedQuestion.options) || normalizedQuestion.options.length < 2)) {
      const fallbackAnswer = resolveMultipleChoiceAnswerText(normalizedQuestion);

      if (fallbackAnswer) {
        normalizedQuestion.questionType = 'FREETEXT';
        normalizedQuestion.correctAnswer = fallbackAnswer;
        normalizedQuestion.options = undefined;
      }
    }
  }

  // MATCH: reconstruct leftItems/rightItems from correctAnswer if missing
  if (
    normalizedQuestion.questionType === 'MATCH' &&
    normalizedQuestion.correctAnswer &&
    typeof normalizedQuestion.correctAnswer === 'object' &&
    !Array.isArray(normalizedQuestion.correctAnswer)
  ) {
    const correctMatches = normalizedQuestion.correctAnswer as Record<string, string>;
    // Only check keys that aren't meta fields like 'pairs', 'value', 'order'
    const metaKeys = ['pairs', 'value', 'order', 'blanks', 'alternatives', 'placements'];
    const matchKeys = Object.keys(correctMatches).filter(k => !metaKeys.includes(k));
    
    if (matchKeys.length > 0) {
      const leftItems = matchKeys;
      const rightItems = shuffleArray(matchKeys.map(k => String(correctMatches[k])));
      
      normalizedQuestion.options = {
        ...(normalizedQuestion.options && typeof normalizedQuestion.options === 'object' && !Array.isArray(normalizedQuestion.options)
          ? normalizedQuestion.options
          : {}),
        leftItems,
        rightItems
      };
    }
  }

  // SORT: ensure correctAnswer.order is an array and options has shuffled items
  if (normalizedQuestion.questionType === 'SORT') {
    const ca = normalizedQuestion.correctAnswer;
    if (Array.isArray(ca)) {
      // correctAnswer is already the order array — wrap it
      normalizedQuestion.correctAnswer = { order: ca };
    } else if (ca?.order && Array.isArray(ca.order)) {
      // Already correct format
    } else if (typeof ca === 'string') {
      // Try to parse as array
      const parsed = tryParseJsonString(ca);
      if (Array.isArray(parsed)) {
        normalizedQuestion.correctAnswer = { order: parsed };
      }
    }

    // Ensure options has shuffled items for display
    if (normalizedQuestion.correctAnswer?.order && !Array.isArray(normalizedQuestion.options)) {
      normalizedQuestion.options = shuffleArray([...normalizedQuestion.correctAnswer.order]);
    }
  }

  // FREETEXT: ensure correctAnswer is accessible (handle plain string/number)
  if (normalizedQuestion.questionType === 'FREETEXT') {
    const ca = normalizedQuestion.correctAnswer;
    // If it's a plain string or number, it works fine as-is since checkAnswer handles both formats
  }

  return normalizedQuestion;
};

interface UseQuestionPreloaderOptions {
  grade: number;
  subject: string;
  totalQuestions: number;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
  topicHint?: string;
  difficultySequence?: ('easy' | 'medium' | 'hard')[];
}

const RECENT_QUESTIONS_KEY = (grade: number, subject: string) =>
  `recent_questions_${grade}_${subject}`;
const RECENT_QUESTIONS_MAX = 30;
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout per question
const PARALLEL_BATCH_SIZE = 2; // Max simultaneous Edge Function calls

export const useQuestionPreloader = ({
  grade,
  subject,
  totalQuestions,
  initialDifficulty = 'medium',
  topicHint,
  difficultySequence
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
  const topicHintRef = useRef(topicHint);
  const difficultySequenceRef = useRef(difficultySequence);
  
  useEffect(() => {
    gradeRef.current = grade;
    subjectRef.current = subject;
    totalQuestionsRef.current = totalQuestions;
    topicHintRef.current = topicHint;
    difficultySequenceRef.current = difficultySequence;
  }, [grade, subject, totalQuestions, topicHint, difficultySequence]);

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
          excludeTexts: excludeTexts ? Array.from(excludeTexts).slice(-20) : [],
          topicHint: topicHintRef.current || undefined
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
      
      // Normalize questionType to prevent rendering issues
      // Also handle snake_case question_type from edge function
      const rawType = data.question?.questionType || data.question?.question_type;
      const typeMap: Record<string, string> = {
        'MULTIPLE_CHOICE': 'MULTIPLE_CHOICE',
        'MULTIPLECHOICE': 'MULTIPLE_CHOICE',
        'MC': 'MULTIPLE_CHOICE',
        'FREETEXT': 'FREETEXT',
        'FREE_TEXT': 'FREETEXT',
        'TEXT': 'FREETEXT',
        'SORT': 'SORT',
        'MATCH': 'MATCH',
        'MATCHING': 'MATCH',
        'FILL_BLANK': 'FILL_BLANK',
        'FILLBLANK': 'FILL_BLANK',
        'DRAG_DROP': 'DRAG_DROP',
        'DRAGDROP': 'DRAG_DROP',
        'DRAG-DROP': 'DRAG_DROP',
      };
      if (rawType && typeof rawType === 'string') {
        const normalized = rawType.trim().toUpperCase();
        data.question.questionType = typeMap[normalized] || 'FREETEXT';
        if (!typeMap[normalized]) {
          console.warn('⚠️ Unknown questionType normalized to FREETEXT:', normalized);
        }
      } else {
        // No questionType at all — default to FREETEXT
        console.warn('⚠️ Missing questionType, defaulting to FREETEXT');
        data.question.questionType = 'FREETEXT';
      }
      
      // Ensure questionText is set (handle snake_case too)
      if (!data.question.questionText && data.question.question_text) {
        data.question.questionText = data.question.question_text;
      }
      
      // Ensure correctAnswer is set (handle snake_case too)
      if (data.question.correctAnswer === undefined && data.question.correct_answer !== undefined) {
        data.question.correctAnswer = data.question.correct_answer;
      }
      
      const normalizedQuestion = normalizeQuestionPayload(data.question);

      if (!isQuestionRenderable(normalizedQuestion)) {
        console.warn('⚠️ Discarding unrenderable question payload:', {
          questionType: normalizedQuestion.questionType,
          questionText: normalizedQuestion.questionText,
          options: normalizedQuestion.options,
          correctAnswer: normalizedQuestion.correctAnswer,
          task: normalizedQuestion.task
        });
        return null;
      }

      return normalizedQuestion;
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

    // Use adaptive sequence if provided, otherwise fallback to hardcoded default
    const difficulties: ('easy' | 'medium' | 'hard')[] = difficultySequenceRef.current || ['medium', 'medium', 'easy', 'medium', 'hard'];

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
