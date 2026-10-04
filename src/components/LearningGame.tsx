import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { trackFireAndForget } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuestionPreloader, type PreloadedQuestion } from '@/hooks/useQuestionPreloader';
import { useAIExplanation } from '@/hooks/useAIExplanation';
import { useActiveTimer } from '@/hooks/useActiveTimer';
import { useGameSessionSaver } from '@/hooks/useGameSessionSaver';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAuth } from '@/hooks/useAuth';
import { useAchievementTracker } from '@/hooks/useAchievementTracker';
import { useAdaptiveDifficultySystem } from '@/hooks/useAdaptiveDifficultySystem';
import { GameCompletionScreen } from '@/components/GameCompletionScreen';
import { AchievementPopup } from '@/components/AchievementPopup';
import { Loader2, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Trophy, Clock, Flag, ChevronDown, Check, X, MessageCircleQuestion, Crown, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuestionReport } from '@/hooks/useQuestionReport';
import { QuestionReportDialog } from '@/components/game/QuestionReportDialog';
import { KITutorDialog } from '@/components/game/KITutorDialog';
import { usePremiumZugang } from '@/hooks/usePremiumZugang';
import { triggerSparkle, triggerSpeedBonus, triggerCombo, triggerRainbow } from '@/utils/confetti';
import { InGameAnimation, type AnimationType } from '@/components/game/InGameAnimation';
import { AntwortKaestchen, KaestchenFortschritt, VerdienteZeit, Ziffernfeld, istZahlAntwort } from '@/components/game/heft/Heft';
import { StreakAnimation } from '@/components/game/StreakAnimation';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { useStreak } from '@/hooks/useStreak';
import { berechneStreak, lokalerTag } from '@/lib/streak';

interface LearningGameProps {
  grade: number;
  subject: string;
  onComplete: (stats: GameStats) => void;
  onBack: () => void;
  totalQuestions?: number;
  topicHint?: string;
  /** Lernplan, aus dem die Runde gestartet wurde — zaehlt nur dann als Plan-Fortschritt. */
  learningPlanId?: string;
  mode?: 'normal' | 'streak_recovery';
  demoMode?: boolean;
}

interface GameStats {
  correct: number;
  total: number;
  timeSpent: number;
  earnedMinutes: number;
  subject: string;
}

// Default seconds per correct answer by subject
const DEFAULT_SECONDS_PER_TASK = 60;

export const LearningGame: React.FC<LearningGameProps> = ({
  grade,
  subject,
  onComplete,
  onBack,
  totalQuestions = 5,
  topicHint,
  learningPlanId,
  mode = 'normal',
  demoMode = false
}) => {
  const { user, loading: isAuthLoading } = useAuth();
  const { saveSession, isSaving } = useGameSessionSaver();
  const { settings: childSettings } = useChildSettings(user?.id || '');
  const { trackAllAchievements } = useAchievementTracker(user?.id);
  const { checkCompletion: checkDailyChallenge } = useDailyChallenge(user?.id);
  const { addToQueue: addToReviewQueue, markAsReported: markReviewReported } = useReviewQueue(user?.id);
  const { reportQuestion } = useQuestionReport();
  
  // Adaptive difficulty system — per subject, persisted across sessions
  const {
    updatePerformance: updateAdaptivePerformance,
    performAdaptiveAdjustment,
    applyUserFeedback: applyAdaptiveFeedback,
    selectDifficultyForQuestion,
    generateDifficultySequence,
    isProfileLoaded,
    difficultyLevel,
  } = useAdaptiveDifficultySystem(subject, grade, user?.id || '');

  // Generate difficulty sequence once profile is loaded
  const adaptiveDifficultySequence = useMemo(() => {
    if (!isProfileLoaded) return undefined;
    return generateDifficultySequence(totalQuestions);
  }, [isProfileLoaded, generateDifficultySequence, totalQuestions]);

  // Use preloader with adaptive difficulty sequence
  const { 
    questions, 
    isInitialLoading, 
    loadingProgress, 
    error: preloadError, 
    getQuestion,
    isQuestionReady,
    updateDifficulty,
    reload,
    cancelLoading
  } = useQuestionPreloader({
    grade,
    subject,
    totalQuestions,
    topicHint,
    difficultySequence: adaptiveDifficultySequence,
    // Index has already resolved auth before it can render a signed-in game.
    // Do not derive demo mode from this component's second useAuth instance:
    // on slower Chrome/WebView starts it can briefly report no user and would
    // otherwise load the bundled five-question demo set.
    demoMode,
    enabled: demoMode || Boolean(user) || !isAuthLoading,
  });
  
  const { explanation, isLoading: isLoadingExplanation, fetchExplanation, clearExplanation } = useAIExplanation();
  const [answerRecovered, setAnswerRecovered] = useState(false);
  
  // Active timer - only counts time spent answering questions
  const { elapsedTime, isRunning, start: startTimer, pause: pauseTimer, reset: resetTimer, formattedTime } = useActiveTimer();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const [achievementBonusMinutes, setAchievementBonusMinutes] = useState(0);
  
  // Answer states for different question types
  const [userTextAnswer, setUserTextAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [dragDropPlacements, setDragDropPlacements] = useState<Record<string, string[]>>({});
  const [correctStreak, setCorrectStreak] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [gameAnimation, setGameAnimation] = useState<{ type: AnimationType; message: string } | null>(null);
  const { isPremium } = usePremiumZugang();
  const [isValidatingAnswer, setIsValidatingAnswer] = useState(false);
  // Antwortzeit der aktuellen Frage, festgehalten beim Absenden (checkAnswer).
  const answerTimeRef = useRef(0);
  const [spellingHint, setSpellingHint] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [newStreakValue, setNewStreakValue] = useState(0);
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false);
  const streakBeforeSession = useRef<number | null>(null);
  const isStreakRecovery = mode === 'streak_recovery';

  // Ergebnis je Aufgabe fuer den Kaestchen-Fortschritt (nur Anzeige)
  const [antwortVerlauf, setAntwortVerlauf] = useState<Record<number, boolean>>({});
  const [neuerSticker, setNeuerSticker] = useState<string | null>(null);
  useEffect(() => {
    if (hasAnswered) setAntwortVerlauf((v) => (v[currentIndex] === isCorrect ? v : { ...v, [currentIndex]: isCorrect }));
  }, [hasAnswered, isCorrect, currentIndex]);

  // Track streak before session starts
  const { streak: currentStreak, inactiveDays: currentInactiveDays, loading: streakLoading } = useStreak(user?.id);
  // Erst nach dem Laden merken. Vorher liefert useStreak seinen Startwert 0 —
  // bis 30.09.2026 wurde genau der gemerkt, und nach jeder Runde stand der
  // Streak auf 1 (0 + 1).
  useEffect(() => {
    if (streakBeforeSession.current === null && !streakLoading) {
      streakBeforeSession.current = currentStreak;
    }
  }, [currentStreak, streakLoading]);

  // Save emoji feedback to question_feedback table
  const saveEmojiFeedback = (feedbackType: 'thumbs_up' | 'thumbs_down' | 'too_hard' | 'too_easy') => {
    if (!question) return;
    const correctAnswerText = typeof question.correctAnswer === 'string' 
      ? question.correctAnswer 
      : JSON.stringify(question.correctAnswer);
    // Map thumbs_up to 'good_question' for meaningful prompt analysis
    const reason = feedbackType === 'thumbs_up' ? 'good_question' : feedbackType;
    reportQuestion({
      reason: reason as any,
      question: question.questionText,
      statedAnswer: correctAnswerText,
      grade,
      subject,
    });
  };

  // Browser TTS for explanations (guarded for Android WebView compatibility)
  const speakText = (text: string) => {
    try {
      if (!window.speechSynthesis) {
        console.warn('speechSynthesis not available');
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = grade <= 2 ? 0.85 : 0.95;
      utterance.pitch = 1.1;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn('TTS stop error:', e);
    }
    setIsSpeaking(false);
  };

  // Get seconds per task from child settings or use default
  const getSecondsPerTask = (): number => {
    if (!childSettings) return DEFAULT_SECONDS_PER_TASK;
    
    const settingsKey = `${subject}_seconds_per_task` as keyof typeof childSettings;
    const value = childSettings[settingsKey];
    return typeof value === 'number' ? value : DEFAULT_SECONDS_PER_TASK;
  };
  const [fillBlanks, setFillBlanks] = useState<string[]>([]);

  // Get current question from preloaded questions
  const question = useMemo(() => getQuestion(currentIndex), [getQuestion, currentIndex, questions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelLoading();
  }, [cancelLoading]);

  // Start timer when question is ready, stop when answered.
  // Waehrend der Nachpruefung (isValidatingAnswer) ist die Frage noch nicht
  // beantwortet, der Timer aber schon angehalten — ohne diese Bedingung
  // wuerde ihn dieser Effekt sofort wieder starten.
  useEffect(() => {
    if (question && !hasAnswered && !isInitialLoading && !isValidatingAnswer) {
      startTimer();
    }
  }, [question, hasAnswered, isInitialLoading, isValidatingAnswer, startTimer]);

  // Initialize answer state when question changes and scroll to top
  useEffect(() => {
    if (question) {
      resetAnswerState();
      setQuestionStartTime(Date.now());
      if (question.questionType === 'SORT' && question.options) {
        const opts = Array.isArray(question.options) ? question.options : [];
        setSortOrder([...opts]);
      }
      if (question.questionType === 'FILL_BLANK') {
        const ca = question.correctAnswer;
        const blanks = ca?.blanks || (Array.isArray(ca) ? ca : (typeof ca === 'string' ? [ca] : []));
        if (blanks.length > 0) setFillBlanks(new Array(blanks.length).fill(''));
      }
      // Scroll to top when new question loads
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [question]);

  const resetAnswerState = () => {
    setUserTextAnswer('');
    setSelectedOption(null);
    setSortOrder([]);
    setMatches({});
    setDragDropPlacements({});
    setFillBlanks([]);
    setHasAnswered(false);
    setIsCorrect(false);
    setShowExplanation(false);
    setSelectedFeedback(null);
    setSpellingHint(null);
    clearExplanation();
  };

  const extractMultipleChoiceOptions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .map((item) => String(item).trim())
            .filter(Boolean)
        )
      );
    }

    if (typeof value !== 'string') return [];

    return Array.from(
      new Set(
        value
          .replace(/\r/g, '\n')
          .split(/[\n,;|]+/)
          .map((entry) => entry.replace(/^[\s•\-–—]*(?:[A-Z]\)|\d+[.)])?\s*/i, '').trim())
          .filter(Boolean)
      )
    );
  };

  const getMultipleChoiceOptions = (q: PreloadedQuestion): string[] => {
    const directOptions = extractMultipleChoiceOptions(q.options);
    if (directOptions.length >= 2) return directOptions;

    return extractMultipleChoiceOptions(q.task);
  };

  // Resolve MULTIPLE_CHOICE correctAnswer which can be:
  // - a number index (from AI/cache): 2 → options[2]
  // - an object { value: "text" } (legacy)
  // - a string directly
  const resolveCorrectAnswerText = (q: PreloadedQuestion): string => {
    const options = getMultipleChoiceOptions(q);
    const ca = q.correctAnswer;
    if (ca == null) return '';
    // If it's a number (index into options)
    if (typeof ca === 'number') {
      return options[ca] ?? String(ca);
    }
    // If it's an object with .value
    if (typeof ca === 'object' && ca.value != null) {
      if (typeof ca.value === 'number') {
        return options[ca.value] ?? String(ca.value);
      }
      return String(ca.value);
    }
    if (typeof ca === 'string') {
      const trimmed = ca.trim();
      const index = Number(trimmed);
      if (Number.isInteger(index) && options[index] !== undefined) {
        return options[index];
      }
      return trimmed;
    }
    // If it's a plain string
    return String(ca);
  };

  const multipleChoiceOptions = useMemo(
    () => (question ? getMultipleChoiceOptions(question) : []),
    [question]
  );

  const shouldUseTextFallbackForMultipleChoice =
    question?.questionType === 'MULTIPLE_CHOICE' && multipleChoiceOptions.length < 2;

  const checkAnswer = async () => {
    if (!question) return;

    // Die Zeit endet mit dem Absenden. Bis 09/2026 hielt der Timer erst nach
    // der Nachpruefung unten an — die Wartezeit auf den Server lief sichtbar
    // weiter und zaehlte als Antwortzeit, auch fuer die Schwierigkeitsanpassung.
    pauseTimer();
    const answerTimeMs = Date.now() - questionStartTime;
    answerTimeRef.current = answerTimeMs;

    let correct = false;

    // Fuer die unabhaengige Nachpruefung nach dem switch: Beide Antworten als
    // Text, egal welcher Fragetyp. Die Edge Function validate-answer arbeitet
    // rein auf Zeichenketten, deshalb genuegt eine lesbare Darstellung.
    let statedAnswerText = '';
    let userAnswerText = '';
    // Der Rechtschreib-Hinweis ergibt nur bei getippten Antworten Sinn.
    let answerIsTyped = false;
    // Hat das Kind ueberhaupt etwas eingegeben? Reicht nicht ueber die Laenge
    // von userAnswerText zu bestimmen: Bei leeren Luecken bleiben die
    // Trennzeichen stehen (", ") und das saehe nach einer Antwort aus.
    let hasUserInput = false;

    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        const resolvedCorrect = resolveCorrectAnswerText(question);
        correct = shouldUseTextFallbackForMultipleChoice
          ? userTextAnswer.toLowerCase().trim() === resolvedCorrect.toLowerCase().trim()
          : selectedOption === resolvedCorrect;
        statedAnswerText = resolvedCorrect;
        userAnswerText = shouldUseTextFallbackForMultipleChoice ? userTextAnswer : selectedOption;
        answerIsTyped = shouldUseTextFallbackForMultipleChoice;
        hasUserInput = userAnswerText.trim().length > 0;
        break;

      case 'FREETEXT':
        const correctAnswerRaw = question.correctAnswer;
        const freeTextCorrect = typeof correctAnswerRaw === 'object' && correctAnswerRaw?.value != null
          ? String(correctAnswerRaw.value) : String(correctAnswerRaw || '');
        const userVal = userTextAnswer.toLowerCase().trim();
        const correctVal = freeTextCorrect.toLowerCase().trim();
        const alternatives = (typeof correctAnswerRaw === 'object' ? correctAnswerRaw?.alternatives || [] : []).map((a: string) => a.toLowerCase().trim());
        // Extract numeric values for comparison (handles "10 Murmeln" vs "10")
        const extractNumber = (s: string) => s.replace(/[^\d.,\-]/g, '').replace(',', '.');
        const userNum = extractNumber(userVal);
        const correctNum = extractNumber(correctVal);
        correct = userVal === correctVal 
          || alternatives.includes(userVal)
          || (userNum !== '' && correctNum !== '' && userNum === correctNum);
        statedAnswerText = freeTextCorrect;
        userAnswerText = userTextAnswer;
        answerIsTyped = true;
        hasUserInput = userTextAnswer.trim().length > 0;
        break;

      case 'SORT':
        // correctAnswer can be {order: [...]} or a plain array
        const sortCorrect = Array.isArray(question.correctAnswer)
          ? question.correctAnswer
          : question.correctAnswer?.order || [];
        correct = JSON.stringify(sortOrder) === JSON.stringify(sortCorrect);
        statedAnswerText = (sortCorrect as string[]).join(' → ');
        userAnswerText = sortOrder.join(' → ');
        hasUserInput = sortOrder.length > 0;
        break;

      case 'MATCH':
        // correctAnswer can be {pairs: [["a","b"],...]} or a plain object {"a":"b",...}
        const ca = question.correctAnswer;
        if (ca?.pairs && Array.isArray(ca.pairs)) {
          correct = ca.pairs.every(([left, right]: [string, string]) => matches[left] === right);
          statedAnswerText = ca.pairs.map(([l, r]: [string, string]) => `${l} = ${r}`).join(', ');
        } else if (ca && typeof ca === 'object' && !Array.isArray(ca)) {
          correct = Object.entries(ca).every(([left, right]) => matches[left] === String(right));
          statedAnswerText = Object.entries(ca).map(([l, r]) => `${l} = ${r}`).join(', ');
        }
        userAnswerText = Object.entries(matches).map(([l, r]) => `${l} = ${r}`).join(', ');
        hasUserInput = Object.keys(matches).length > 0;
        break;

      case 'DRAG_DROP':
        const correctPlacements = question.correctAnswer?.placements || {};
        correct = Object.entries(correctPlacements).every(([category, items]) =>
          JSON.stringify((dragDropPlacements[category] || []).sort()) === JSON.stringify((items as string[]).sort())
        );
        statedAnswerText = Object.entries(correctPlacements)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ');
        userAnswerText = Object.entries(dragDropPlacements)
          .map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ');
        hasUserInput = Object.values(dragDropPlacements).some((v) => v.length > 0);
        break;

      case 'FILL_BLANK':
        const caFill = question.correctAnswer;
        const correctBlanks = caFill?.blanks || (Array.isArray(caFill) ? caFill : (typeof caFill === 'string' ? [caFill] : []));
        correct = fillBlanks.every((answer, i) => 
          answer.toLowerCase().trim() === String(correctBlanks[i] || '').toLowerCase().trim()
        );
        statedAnswerText = (correctBlanks as unknown[]).map(String).join(', ');
        userAnswerText = fillBlanks.join(', ');
        answerIsTyped = true;
        hasUserInput = fillBlanks.some((b) => b.trim().length > 0);
        break;
    }

    // Unabhaengige Nachpruefung — fuer JEDEN Fragetyp.
    //
    // Bis 08/2026 lief sie ausschliesslich im FREETEXT-Zweig. Das deckte 872
    // der 2598 aktiven Fragen ab; MULTIPLE_CHOICE, FILL_BLANK, SORT und MATCH
    // hatten gar keine. Genau dort schlug es zu: Bei "Der Term 3 * (4 + x)
    // kann durch Ausklammern in die Form ___ + 3 * x gebracht werden"
    // (FILL_BLANK) stand 15 im Cache, richtig sind 12. Das Kind rechnete
    // richtig, bekam "Nicht ganz" — und erfuhr das Gegenteil erst, wenn es auf
    // "Erklaerung" tippte. Wer direkt weiterklickt, bleibt mit dem falschen
    // Ergebnis zurueck und gibt der App die Schuld.
    //
    // Die Pruefung laeuft nur bei lokal abgelehnter Antwort, kostet also nichts,
    // solange richtig geantwortet wird. Die erste Stufe in validate-answer
    // rechnet ohne Modell nach.
    if (!correct && hasUserInput) {
      try {
        setIsValidatingAnswer(true);
        const { data, error } = await supabase.functions.invoke('validate-answer', {
          body: {
            question: getAufgabeText(),
            correctAnswer: statedAnswerText,
            userAnswer: userAnswerText.trim(),
            grade,
            subject,
          },
        });
        if (!error && data?.accepted) {
          console.log(`✅ AI recheck accepted: "${userAnswerText}" (${data.verdict}: ${data.reason})`);
          correct = true;

          if (data.statedAnswerWrong) {
            // Die hinterlegte Antwort wurde widerlegt, nicht die des Kindes.
            // Der Rechtschreib-Hinweis darf hier NICHT erscheinen — er wuerde
            // die falsche Musterloesung als "richtige Schreibweise" ausgeben.
            setAnswerRecovered(true);
            toast.success('Deine Antwort war doch richtig! Wird als korrekt gewertet. 🎉', {
              description: 'Wir haben die Frage automatisch zur Prüfung markiert.',
            });
            reportQuestion({
              reason: 'wrong_answer',
              details: `Auto-verified beim Absenden (${question.questionType}): Nutzerantwort "${userAnswerText.trim()}" war korrekt, System-Antwort "${statedAnswerText}" wurde widerlegt (verdict=${data.verdict}, geprüfte Antwort="${data.verifiedCorrectAnswer ?? '?'}").`,
              question: question.questionText,
              statedAnswer: statedAnswerText,
              userAnswer: userAnswerText.trim(),
              grade,
              subject,
              templateId: question.id,
            });
            markReviewReported(question.questionText);
          } else if (answerIsTyped) {
            // Tippfehler oder Synonym: hinterlegte Antwort stimmt, also ist der
            // Hinweis auf die korrekte Schreibweise sinnvoll. Bei Auswahl-,
            // Sortier- und Zuordnungsaufgaben gibt es nichts zu buchstabieren.
            setSpellingHint(statedAnswerText);
          }
        }
      } catch (e) {
        console.warn('AI recheck failed, using local result:', e);
      } finally {
        setIsValidatingAnswer(false);
      }
    }

    setIsCorrect(correct);
    setHasAnswered(true);

    if (demoMode) {
      trackFireAndForget('demo_question_answered', { correct });
    }

    // Track performance for adaptive difficulty system
    updateAdaptivePerformance(correct, answerTimeMs);

    if (correct) {
      setScore(prev => prev + 1);
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      const isFast = answerTimeMs < 3000;
      
      // Trigger gamification effects
      if (isFast) {
        triggerSpeedBonus();
        setGameAnimation({ type: 'speed', message: 'Blitzschnell!' });
      } else if (newStreak === 3) {
        triggerCombo();
        setGameAnimation({ type: 'combo', message: 'Drei richtig in Folge!' });
      } else if (newStreak === 5) {
        triggerCombo();
        setGameAnimation({ type: 'combo', message: 'Fünf richtig in Folge!' });
      }
      // Normale richtige Antwort: kein Einblenden und kein Konfetti mehr. Der
      // gruene Haken und "+30 Sek." in der Zeit oben sind die Rueckmeldung
      // (App-Redesign, ein Bewegungsmoment statt mehrerer).

      // Adaptive difficulty handles the adjustment automatically
    } else {
      setCorrectStreak(0);

      // Add to spaced repetition review queue
      if (question) {
        addToReviewQueue(question, grade);
      }
    }
  };

  const handleShowExplanation = async () => {
    if (!question) return;
    setShowExplanation(true);
    
    const correctAnswerText = getCorrectAnswerText();
    const userAnswerText = getUserAnswerText();
    
    const result = await fetchExplanation(
      getAufgabeText(),
      correctAnswerText,
      grade,
      subject,
      userAnswerText
    );
    maybeRecoverAnswer(result, correctAnswerText, userAnswerText);
  };

  // Handle "Show Answer" button - marks as incorrect and shows answer + explanation
  const handleShowAnswer = async () => {
    if (!question) return;
    
    // Mark as answered but incorrect
    setIsCorrect(false);
    setHasAnswered(true);
    
    // Pause timer
    pauseTimer();
    
    // Track as incorrect in adaptive system (long response = gave up)
    updateAdaptivePerformance(false, 60000);
    
    // Automatically show explanation
    setShowExplanation(true);
    
    const correctAnswerText = getCorrectAnswerText();
    
    await fetchExplanation(
      getAufgabeText(),
      correctAnswerText,
      grade,
      subject,
      'Ich konnte die Antwort nicht finden.'
    );
  };

  // If the AI verification determined the user's answer was actually correct,
  // flip the result, credit the score, and auto-report the broken question.
  const maybeRecoverAnswer = (
    result: { verdict: string | null; verifiedCorrectAnswer: string | null } | any,
    statedAnswer: string,
    userAnswerText: string,
  ) => {
    if (!question || answerRecovered || isCorrect || !hasAnswered) return;
    const verdict = result?.verdict;
    if (verdict !== 'user_correct' && verdict !== 'both_correct') return;
    if (!userAnswerText || !userAnswerText.trim()) return;

    setAnswerRecovered(true);
    setIsCorrect(true);
    setScore(prev => prev + 1);
    setCorrectStreak(prev => prev + 1);

    // Undo the "incorrect" penalty in the adaptive system
    // Mit der Zeit beim Absenden — nicht bis jetzt, sonst zaehlte das Lesen
    // der Erklaerung als Antwortzeit.
    updateAdaptivePerformance(true, Math.max(1, answerTimeRef.current));

    triggerSparkle();
    toast.success('Deine Antwort war doch richtig! Wird als korrekt gewertet. 🎉', {
      description: 'Wir haben die Frage automatisch zur Prüfung markiert.',
    });

    // Background-report so the broken question gets cleaned/rotated
    reportQuestion({
      reason: 'wrong_answer',
      details: `Auto-verified: Nutzerantwort "${userAnswerText}" war korrekt, System-Antwort "${statedAnswer}" wurde als falsch erkannt (verdict=${verdict}).`,
      question: question.questionText,
      statedAnswer,
      userAnswer: userAnswerText,
      explanation: result?.explanation,
      grade,
      subject,
      templateId: question.id,
    });
    markReviewReported(question.questionText);
  };

  // Bei Lueckentexten steht der Satz mit der Luecke in `task`; der Fragetext
  // ist nur die Anweisung ("Ergaenze das fehlende Wort"). Nachpruefung,
  // Erklaerung und Tutor bekamen bis 27.09.2026 nur die Anweisung und konnten
  // die eigentliche Aufgabe nicht sehen.
  const getAufgabeText = (): string => {
    if (!question) return '';
    const task = typeof question.task === 'string' ? question.task.trim() : '';
    return question.questionType === 'FILL_BLANK' && task
      ? `${question.questionText}\n${task}`
      : question.questionText;
  };

  const getCorrectAnswerText = (): string => {
    if (!question) return '';
    
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return resolveCorrectAnswerText(question);
      case 'FREETEXT':
        return typeof question.correctAnswer === 'object' && question.correctAnswer?.value != null
          ? String(question.correctAnswer.value) : String(question.correctAnswer || '');
      case 'SORT':
        const sortCA = question.correctAnswer;
        const sortArr = Array.isArray(sortCA) ? sortCA : sortCA?.order || [];
        return sortArr.join(' → ');
      case 'MATCH':
        const matchCA = question.correctAnswer;
        if (matchCA?.pairs && Array.isArray(matchCA.pairs)) {
          return matchCA.pairs.map(([a, b]: [string, string]) => `${a} = ${b}`).join(', ');
        }
        if (matchCA && typeof matchCA === 'object' && !Array.isArray(matchCA)) {
          return Object.entries(matchCA).map(([a, b]) => `${a} = ${b}`).join(', ');
        }
        return '';
      case 'FILL_BLANK':
        const fillCA = question.correctAnswer;
        const blanksArr = fillCA?.blanks || (Array.isArray(fillCA) ? fillCA : (typeof fillCA === 'string' ? [fillCA] : []));
        return blanksArr.join(', ');
      default:
        return '';
    }
  };

  const getUserAnswerText = (): string => {
    if (!question) return '';
    
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return selectedOption || userTextAnswer;
      case 'FREETEXT':
        return userTextAnswer;
      case 'SORT':
        return sortOrder.join(' → ');
      case 'MATCH':
        return Object.entries(matches).map(([a, b]) => `${a} = ${b}`).join(', ');
      case 'FILL_BLANK':
        return fillBlanks.join(', ');
      default:
        return '';
    }
  };

  const handleNextQuestion = async () => {
    setAnswerRecovered(false);
    if (currentIndex + 1 >= totalQuestions) {
      // Game complete - show completion screen and save to DB
      pauseTimer(); // Make sure timer is paused
      setShowCompletionScreen(true);
      
      // Calculate earned time based on child settings
      const timeSpentSeconds = Math.floor(elapsedTime / 1000);
      const secondsPerTask = getSecondsPerTask();
      const earnedSeconds = isStreakRecovery ? 0 : score * secondsPerTask;
      const accuracyScore = Math.round((score / totalQuestions) * 100);

      // Perform adaptive difficulty adjustment at end of session → persists per subject
      performAdaptiveAdjustment().catch(err => 
        console.error('❌ Adaptive adjustment failed:', err)
      );
      
      // Save session to database
      if (user && !sessionSaved) {
        const result = await saveSession({
          category: subject,
          grade,
          correctAnswers: score,
          totalQuestions,
          timeSpentSeconds,
          earnedSeconds,
          questionSource: isStreakRecovery ? 'streak-recovery' : 'template-bank',
          suppressEarnedMinutes: isStreakRecovery,
          learningPlanId: learningPlanId ?? null
        });
        
        if (result.success) {
          console.log('✅ Session saved with ID:', result.sessionId);
          setSessionSaved(true);

          // Sticker fuer eine Runde mit allen Aufgaben richtig (die Datenbank
          // prueft selbst und vergibt hoechstens drei am Tag)
          if (!isStreakRecovery && score === totalQuestions && totalQuestions >= 5) {
            try {
              const { data: sticker } = await supabase.rpc('sticker_vergeben');
              if (typeof sticker === 'string' && sticker) setNeuerSticker(sticker);
            } catch {
              /* ohne Sticker weiter */
            }
          }

          // Erste abgeschlossene Lernsession dieses Nutzers?
          try {
            const { count } = await supabase
              .from('game_sessions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id);
            if (count === 1) {
              trackFireAndForget('first_learning_session', { subject, grade });
            }
          } catch {
            /* Tracking darf die Session nie blockieren */
          }
          // Der Streak haengt an der abgeschlossenen Runde, nicht an der Anzahl
          // richtiger Antworten. Wer sich hinsetzt und eine Runde durchspielt,
          // hat an diesem Tag gelernt — auch wenn vieles daneben ging. Frueher
          // verlangte die Rettungssession drei richtige Antworten; genau das
          // hat Kinder an schwachen Tagen zusaetzlich bestraft.
          const zuletztHeute = currentInactiveDays === 0;
          const vorher = streakBeforeSession.current ?? 0;
          const neuerStreak =
            currentInactiveDays >= 3
              ? 1                       // zu lange aus: neu anfangen
              : zuletztHeute
                ? Math.max(vorher, 1)   // heute schon gespielt: nicht doppelt zaehlen
                : vorher + 1;             // erste Runde des Tages: einen hoch

          await supabase.from('user_streak_states').upsert({
            user_id: user.id,
            streak_value: neuerStreak,
            status: 'active',
            last_activity_date: lokalerTag(new Date()),
            last_reactivated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
          
          // Track ALL achievements after session is saved
          try {
            const { newAchievements: earned } = await trackAllAchievements({
              userId: user.id,
              category: subject,
              correctAnswers: score,
              totalQuestions,
              timeSpentSeconds,
              earnedSeconds,
              score: accuracyScore
            });
            
            if (earned && earned.length > 0) {
              console.log('🏆 New achievements earned:', earned);
              setNewAchievements(earned);
              setShowAchievementPopup(true);
              const bonusMinutes = earned.reduce((sum, a) => sum + (a.reward_minutes || 0), 0);
              setAchievementBonusMinutes(bonusMinutes);
            }
          } catch (error) {
            console.error('❌ Error tracking achievements:', error);
          }

          // Check daily challenge completion
          try {
            const challengeCompleted = await checkDailyChallenge({
              subject,
              correctAnswers: score,
              totalQuestions,
              timeSpentSeconds,
            });
            if (challengeCompleted) {
              setDailyChallengeCompleted(true);
            }
          } catch (error) {
            console.error('❌ Error checking daily challenge:', error);
          }

          // Check if streak increased
          try {
            // Calculate fresh streak from DB
            const [lsRes, gsRes] = await Promise.all([
              supabase.from('learning_sessions').select('session_date').eq('user_id', user.id).order('session_date', { ascending: false }),
              supabase.from('game_sessions').select('session_date').eq('user_id', user.id).order('session_date', { ascending: false })
            ]);
            const zeitpunkte: string[] = [];
            lsRes.data?.forEach(s => { if (s.session_date) zeitpunkte.push(s.session_date); });
            gsRes.data?.forEach(s => { if (s.session_date) zeitpunkte.push(s.session_date); });
            const frisch = berechneStreak(zeitpunkte);
            const freshStreak = frisch.inaktiveTage <= 1 ? frisch.streak : 0;
            const previousStreak = streakBeforeSession.current ?? 0;
            if (freshStreak > previousStreak) {
              setNewStreakValue(freshStreak);
              setShowStreakAnimation(true);
            }
          } catch (error) {
            console.error('❌ Error checking streak:', error);
          }
        } else {
          console.error('❌ Failed to save session:', result.error);
          toast.error('Fehler beim Speichern der Session');
        }
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      resetAnswerState();
      // Adaptive difficulty selects difficulty per question via the preloader sequence
      // Use selectDifficultyForQuestion for the next question's difficulty
      updateDifficulty(selectDifficultyForQuestion());
    }
  };

  // Handle completion screen continue button
  const handleCompletionContinue = () => {
    const timeSpentSeconds = Math.floor(elapsedTime / 1000);
    const secondsPerTask = getSecondsPerTask();
    const earnedSeconds = isStreakRecovery ? 0 : score * secondsPerTask;
    const earnedMinutes = Math.ceil(earnedSeconds / 60);
    
    onComplete({
      correct: score,
      total: totalQuestions,
      timeSpent: timeSpentSeconds,
      earnedMinutes,
      subject
    });
  };

  // Move/swap sort items
  const moveSortItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...sortOrder];
    // Swap the two items
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
    setSortOrder(newOrder);
  };

  // Game completion screen
  if (showCompletionScreen) {
    const secondsPerTask = getSecondsPerTask();
    // Trigger rainbow for perfect score
    if (score === totalQuestions) {
      triggerRainbow();
    }
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background pt-safe-top pb-safe-bottom">
          <GameCompletionScreen
          score={score}
          totalQuestions={totalQuestions}
          sessionDuration={elapsedTime}
          timePerTask={secondsPerTask}
          achievementBonusMinutes={achievementBonusMinutes}
          perfectSessionBonus={score === totalQuestions ? 1 : 0}
          neuerSticker={neuerSticker}
          grade={grade}
            isStreakRecovery={isStreakRecovery}
          onContinue={handleCompletionContinue}
          demoMode={demoMode}
          onDemoSignUp={() => {
            // Eigenes Ereignis statt landing_cta_click: Der Absprung aus der
            // fertig gespielten Demo ist die aussagekraeftigste Stelle der
            // Landingpage und soll sich getrennt auswerten lassen.
            trackFireAndForget('demo_completed_cta_click', { score, totalQuestions });
            window.location.assign('/?auth=true');
          }}
        />
        
        {/* Achievement Popup */}
        {showAchievementPopup && newAchievements.length > 0 && (
          <AchievementPopup
            achievements={newAchievements}
            onClose={() => setShowAchievementPopup(false)}
          />
        )}

        {/* Streak Animation */}
        {showStreakAnimation && (
          <StreakAnimation
            newStreak={newStreakValue}
            onClose={() => setShowStreakAnimation(false)}
          />
        )}

        {/* Daily Challenge Banner */}
        {dailyChallengeCompleted && (
          <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-scale-in-bounce rounded-2xl bg-tinte px-5 py-3 text-sm font-bold text-white shadow-2xl pointer-events-none">
            Tages-Challenge geschafft: Bonus-Minuten verdient!
          </div>
        )}
      </div>
    );
  }

  // Initial loading screen with progress
  if (isInitialLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">
              {grade <= 4 ? 'Gleich geht\'s los …' : 'Deine Aufgaben werden vorbereitet …'}
            </p>
            {grade > 4 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Das dauert nur einen Moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (preloadError && !question) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-lg mb-4">{preloadError}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <Button onClick={reload}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Nochmal versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for next question or no question available (fallback with retry)
  if (!question && !isInitialLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            {preloadError ? (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-lg mb-2">{preloadError}</p>
                <p className="text-sm text-muted-foreground mb-6">Bitte versuche es in einem Moment erneut.</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-lg text-muted-foreground mb-6">Nächste Frage wird geladen...</p>
              </>
            )}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <Button onClick={reload}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Nochmal versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verdiente Zeit dieser Runde (wie beim Speichern: Punkte x Sekunden je Aufgabe)
  const sekundenProAufgabe = getSecondsPerTask();
  const verdienteSekunden = isStreakRecovery ? 0 : score * sekundenProAufgabe;
  const zahlAntwort =
    (question?.questionType === 'FREETEXT' || shouldUseTextFallbackForMultipleChoice) &&
    istZahlAntwort(getCorrectAnswerText());
  const loesungText = question ? getCorrectAnswerText() : '';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pt-safe-top">
      {/* In-game animation overlay */}
      {gameAnimation && (
        <InGameAnimation
          type={gameAnimation.type}
          message={gameAnimation.message}
          onComplete={() => setGameAnimation(null)}
        />
      )}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Kopf: beenden, Kaestchen-Fortschritt, verdiente Zeit */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Runde beenden"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-tinte ring-1 ring-inset ring-karo transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 justify-center">
            <KaestchenFortschritt anzahl={totalQuestions} aktuell={currentIndex} verlauf={antwortVerlauf} />
          </div>
          {!isStreakRecovery ? (
            <VerdienteZeit
              sekunden={verdienteSekunden}
              gutschrift={hasAnswered && isCorrect ? sekundenProAufgabe : null}
              gutschriftSchluessel={currentIndex}
            />
          ) : (
            <span className="w-10" />
          )}
        </div>

        {/* Das Blatt mit der Aufgabe */}
        {question && (
          <div className="heft-karo relative flex flex-1 flex-col rounded-t-[28px] bg-card px-5 pt-6 shadow-[0_-1px_0_hsl(var(--karo))] sm:px-8">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-muted-foreground">
              <span>{getSubjectName(subject)}{grade > 4 ? `, Klasse ${grade}` : ''}</span>
              <span className="flex items-center gap-2">
                {grade > 4 && (
                  <span className={cn('tabular inline-flex items-center gap-1', !isRunning && 'opacity-60')}>
                    <Clock className="h-3.5 w-3.5" />{formattedTime}
                  </span>
                )}
                {loadingProgress < totalQuestions && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Weitere Aufgaben werden geladen" />
                )}
              </span>
            </div>

            {/* Bei FILL_BLANK steht der Text mit Luecken im Renderer */}
            {question.questionType !== 'FILL_BLANK' && (
              <h1 className={cn('frage-text mt-3 font-extrabold leading-tight text-tinte', grade <= 4 ? 'text-[1.875rem]' : 'text-2xl')}>
                {question.questionText}
              </h1>
            )}
            {question.hint && !hasAnswered && <HintToggle hint={question.hint} />}

            <div className="mt-6 space-y-6 pb-6">
              {question.questionType === 'MULTIPLE_CHOICE' && !shouldUseTextFallbackForMultipleChoice && (
                <MultipleChoiceRenderer
                  options={multipleChoiceOptions}
                  selectedOption={selectedOption}
                  correctAnswer={resolveCorrectAnswerText(question)}
                  hasAnswered={hasAnswered}
                  onSelect={setSelectedOption}
                />
              )}

              {(question.questionType === 'FREETEXT' || shouldUseTextFallbackForMultipleChoice) && (
                zahlAntwort ? (
                  <AntwortKaestchen
                    wert={userTextAnswer}
                    zustand={!hasAnswered ? 'offen' : isCorrect ? 'richtig' : 'falsch'}
                    loesung={getCorrectAnswerText()}
                    mitCursor={!hasAnswered}
                  />
                ) : (
                  <FreetextRenderer
                    value={userTextAnswer}
                    onChange={setUserTextAnswer}
                    hasAnswered={hasAnswered}
                    isCorrect={isCorrect}
                    correctAnswer={getCorrectAnswerText()}
                  />
                )
              )}

              {question.questionType === 'SORT' && (
                <SortRenderer
                  items={sortOrder}
                  correctOrder={question.correctAnswer?.order || []}
                  hasAnswered={hasAnswered}
                  onMove={moveSortItem}
                />
              )}

              {question.questionType === 'MATCH' && (
                <MatchRenderer
                  leftItems={question.options?.leftItems || []}
                  rightItems={question.options?.rightItems || []}
                  matches={matches}
                  correctPairs={
                    question.correctAnswer?.pairs && Array.isArray(question.correctAnswer.pairs)
                      ? question.correctAnswer.pairs
                      : question.correctAnswer && typeof question.correctAnswer === 'object' && !Array.isArray(question.correctAnswer)
                        ? Object.entries(question.correctAnswer).map(([l, r]) => [l, String(r)] as [string, string])
                        : []
                  }
                  hasAnswered={hasAnswered}
                  onMatch={(left, right) => {
                    setMatches(prev => {
                      if (!right) {
                        const nextMatches = { ...prev };
                        delete nextMatches[left];
                        return nextMatches;
                      }

                      const nextMatches = Object.fromEntries(
                        Object.entries(prev).filter(([, existingRight]) => existingRight !== right)
                      );

                      nextMatches[left] = right;
                      return nextMatches;
                    });
                  }}
                />
              )}

              {question.questionType === 'FILL_BLANK' && (
                <FillBlankRenderer
                  task={question.task || ''}
                  text={question.questionText}
                  answers={fillBlanks}
                  options={Array.isArray(question.options) ? question.options : []}
                  correctAnswers={question.correctAnswer?.blanks || []}
                  hasAnswered={hasAnswered}
                  subject={subject}
                  onChange={(index, value) => {
                    const newBlanks = [...fillBlanks];
                    newBlanks[index] = value;
                    setFillBlanks(newBlanks);
                  }}
                />
              )}

              {question.questionType === 'DRAG_DROP' && (
                <DragDropRenderer
                  items={question.options?.items || []}
                  categories={question.options?.categories || []}
                  placements={dragDropPlacements}
                  correctPlacements={question.correctAnswer?.placements || {}}
                  hasAnswered={hasAnswered}
                  onPlace={(item, category) => {
                    setDragDropPlacements(prev => {
                      const newPlacements = { ...prev };
                      // Remove from old category
                      Object.keys(newPlacements).forEach(cat => {
                        newPlacements[cat] = (newPlacements[cat] || []).filter(i => i !== item);
                      });
                      // Add to new category
                      newPlacements[category] = [...(newPlacements[category] || []), item];
                      return newPlacements;
                    });
                  }}
                />
              )}

              {/* Fallback: unbekannter oder fehlender questionType → Freitext-Eingabe */}
              {(!question.questionType || !['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH', 'FILL_BLANK', 'DRAG_DROP'].includes(question.questionType)) && (
                <FreetextRenderer
                  value={userTextAnswer}
                  onChange={setUserTextAnswer}
                  hasAnswered={hasAnswered}
                  isCorrect={isCorrect}
                  correctAnswer={question.correctAnswer?.value || String(question.correctAnswer || '')}
                />
              )}

              {/* Rueckmeldung: Haken oder Rotstift, ruhig und ohne Alarmfarbe */}
              {hasAnswered && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-2xl font-extrabold text-tinte">
                      {isCorrect ? 'Richtig!' : grade <= 4 ? 'Fast.' : 'Nicht ganz.'}
                    </span>
                    {isCorrect && !isStreakRecovery && (
                      <span className="font-hand text-lg text-gruen-text">+{sekundenProAufgabe} Sek.</span>
                    )}
                    {!isCorrect && !zahlAntwort && (
                      <span className="frage-text font-hand text-lg text-rotstift">Richtig ist: {loesungText}</span>
                    )}
                  </div>
                  {isCorrect && spellingHint && (
                    <p className="frage-text text-sm text-gruen-text">
                      Richtige Schreibweise: <strong>{spellingHint}</strong>
                    </p>
                  )}
                  {/* Report Button - für Klasse 5+, auch bei richtiger Antwort */}
                  {grade > 4 && question && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReportDialog(true)}
                      className="mt-2 w-full text-muted-foreground hover:text-foreground"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      {isCorrect ? 'Fehler in der Frage melden' : 'Stimmt die Lösung nicht? Melden'}
                    </Button>
                  )}
                  {/* KI-Tutor - only for teen */}
                  {grade > 4 && !isCorrect && question && (
                    <div className="mt-3 pt-3 border-t border-karo">
                      {isPremium ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTutorDialog(true)}
                          className="w-full text-primary hover:bg-primary/10"
                        >
                          <MessageCircleQuestion className="w-4 h-4 mr-2" />
                          KI-Tutor fragen
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
                          <MessageCircleQuestion className="w-4 h-4 text-warning" />
                          <span>KI-Tutor erklärt dir den Lösungsweg</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                            <Crown className="h-3 w-3" />
                            Premium
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Emoji Feedback Buttons - only for teen */}
                  {grade > 4 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-center mb-2 text-muted-foreground">Wie fandest du die Frage?</p>
                      <div className="flex gap-1.5 justify-center">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedFeedback('thumbs_up'); applyAdaptiveFeedback('thumbs_up'); saveEmojiFeedback('thumbs_up'); }} className={`text-xl px-3 transition-colors ${selectedFeedback === 'thumbs_up' ? 'bg-green-200 border-green-400 ring-2 ring-green-300' : 'hover:bg-green-100 hover:border-green-300'}`} title="Gut">👍</Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedFeedback('thumbs_down'); applyAdaptiveFeedback('thumbs_down'); setShowReportDialog(true); }} className={`text-xl px-3 transition-colors ${selectedFeedback === 'thumbs_down' ? 'bg-red-200 border-red-400 ring-2 ring-red-300' : 'hover:bg-red-100 hover:border-red-300'}`} title="Schlecht">👎</Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedFeedback('too_hard'); applyAdaptiveFeedback('too_hard'); saveEmojiFeedback('too_hard'); }} className={`text-xl px-3 transition-colors ${selectedFeedback === 'too_hard' ? 'bg-orange-200 border-orange-400 ring-2 ring-orange-300' : 'hover:bg-orange-100 hover:border-orange-300'}`} title="Zu schwer">😰</Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedFeedback('too_easy'); applyAdaptiveFeedback('too_easy'); saveEmojiFeedback('too_easy'); }} className={`text-xl px-3 transition-colors ${selectedFeedback === 'too_easy' ? 'bg-blue-200 border-blue-400 ring-2 ring-blue-300' : 'hover:bg-blue-100 hover:border-blue-300'}`} title="Zu leicht">😴</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {showExplanation && (
                <div className="rounded-2xl bg-muted p-4 ring-1 ring-inset ring-karo">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      <span className="font-bold text-tinte">Erklärung</span>
                    </div>
                    {explanation && !isLoadingExplanation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(explanation)}
                        className="h-8 px-2 text-primary hover:bg-primary/10"
                      >
                        {isSpeaking ? (
                          <><VolumeX className="w-4 h-4 mr-1" /> Stopp</>
                        ) : (
                          <><Volume2 className="w-4 h-4 mr-1" /> Vorlesen</>
                        )}
                      </Button>
                    )}
                  </div>
                  {isLoadingExplanation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Erklärung wird erstellt...</span>
                    </div>
                  ) : (
                    <p className="frage-text text-sm">{explanation?.replace(/\*\*/g, '').replace(/^#{1,3}\s/gm, '')}</p>
                  )}
                </div>
              )}

            </div>

            {/* Unten am Daumen: Ziffernfeld und Knoepfe. Bleiben stehen, damit
                "Weiter" auf kleinen iPhones nicht unter dem Rand liegt (30.09.2026). */}
            <div className="sticky bottom-0 z-10 -mx-5 mt-auto space-y-3 border-t border-karo bg-card/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:-mx-8 sm:px-8">
              {zahlAntwort && !hasAnswered && (
                <Ziffernfeld
                  wert={userTextAnswer}
                  onChange={setUserTextAnswer}
                  onEnter={() => { if (canSubmitAnswer() && !isValidatingAnswer) checkAnswer(); }}
                  komma={/[.,]/.test(loesungText)}
                  minus={loesungText.trim().startsWith('-')}
                />
              )}
              <div className="flex gap-3">
                {!hasAnswered ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleShowAnswer}
                      disabled={isLoadingExplanation}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Lösung zeigen
                    </Button>
                    <Button
                      onClick={checkAnswer}
                      size="lg"
                      className="flex-1"
                      disabled={!canSubmitAnswer() || isValidatingAnswer}
                    >
                      {isValidatingAnswer ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Wird geprüft …</>
                      ) : (
                        'Prüfen'
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {!isCorrect && !showExplanation && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleShowExplanation}
                        disabled={isLoadingExplanation}
                        className="shrink-0"
                      >
                        <Lightbulb className="h-4 w-4" />
                        Erklärung
                      </Button>
                    )}
                    <Button onClick={handleNextQuestion} size="lg" className="min-w-0 flex-1">
                      {currentIndex + 1 >= totalQuestions ? (
                        <><Trophy className="h-4 w-4" />Fertig</>
                      ) : (
                        'Weiter'
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Report Dialog */}
      {question && (
        <QuestionReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          questionText={question.questionText}
          correctAnswer={getCorrectAnswerText()}
          userAnswer={getUserAnswerText()}
          explanation={explanation || undefined}
          grade={grade}
          subject={subject}
          templateId={question.id}
          onReported={() => {
            // Mark in review queue so reported questions won't reappear
            markReviewReported(question.questionText);
          }}
        />
      )}

      {/* KI-Tutor Dialog */}
      {question && (
        <KITutorDialog
          open={showTutorDialog}
          onOpenChange={setShowTutorDialog}
          questionText={getAufgabeText()}
          correctAnswer={getCorrectAnswerText()}
          userAnswer={getUserAnswerText()}
          grade={grade}
          subject={subject}
        />
      )}
    </div>
  );

  function canSubmitAnswer(): boolean {
    if (!question) return false;
    
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return shouldUseTextFallbackForMultipleChoice
          ? userTextAnswer.trim() !== ''
          : selectedOption !== null;
      case 'FREETEXT':
        return userTextAnswer.trim() !== '';
      case 'SORT':
        return sortOrder.length > 0;
      case 'MATCH':
        return Object.keys(matches).length === (question.options?.leftItems?.length || 0);
      case 'FILL_BLANK':
        return fillBlanks.every(b => b.trim() !== '');
      case 'DRAG_DROP':
        const allItems = question.options?.items || [];
        const placedItems = Object.values(dragDropPlacements).flat();
        return placedItems.length === allItems.length;
      default:
        // Fallback for unknown types treated as FREETEXT
        return userTextAnswer.trim() !== '';
    }
  }
};

// Sub-components for question types

const MultipleChoiceRenderer: React.FC<{
  options: string[];
  selectedOption: string | null;
  correctAnswer: string;
  hasAnswered: boolean;
  onSelect: (option: string) => void;
}> = ({ options, selectedOption, correctAnswer, hasAnswered, onSelect }) => (
  <div className="space-y-3">
    {options.map((option, index) => {
      const richtig = hasAnswered && option === correctAnswer;
      const falschGewaehlt = hasAnswered && selectedOption === option && option !== correctAnswer;
      return (
        <Button
          key={index}
          // Nach der Antwort nie die ausgefuellte Variante: Deren weisse Schrift
          // stand bis 30.09.2026 auf blassem Rot und war kaum lesbar.
          variant="outline"
          className={cn(
            "w-full justify-start rounded-2xl text-left p-4 h-auto min-h-14 whitespace-normal break-words text-base font-semibold",
            !hasAnswered && selectedOption === option && "border-2 border-primary bg-primary/5 text-tinte hover:bg-primary/10",
            // Ergebnis nicht ausgrauen: Das Kind soll die Aufloesung lesen koennen.
            hasAnswered && "disabled:opacity-100",
            hasAnswered && !richtig && !falschGewaehlt && "text-muted-foreground",
            richtig && "border-2 border-gruen-hell bg-gruen-hell/10 text-tinte",
            falschGewaehlt && "border-2 border-rotstift/70 bg-card text-tinte line-through decoration-rotstift decoration-2"
          )}
          onClick={() => !hasAnswered && onSelect(option)}
          disabled={hasAnswered}
        >
          <span className="frage-text min-w-0 flex-1">{option}</span>
          {richtig && <Check className="ml-2 h-5 w-5 shrink-0 text-gruen-text" strokeWidth={3} />}
          {falschGewaehlt && <X className="ml-2 h-5 w-5 shrink-0 text-rotstift" />}
        </Button>
      );
    })}
  </div>
);

const FreetextRenderer: React.FC<{
  value: string;
  onChange: (value: string) => void;
  hasAnswered: boolean;
  isCorrect: boolean;
  correctAnswer: string;
}> = ({ value, onChange, hasAnswered, isCorrect, correctAnswer }) => (
  <Input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Deine Antwort..."
    disabled={hasAnswered}
    className={cn(
      "h-16 rounded-2xl font-hand text-2xl text-tinte",
      hasAnswered && "disabled:opacity-100",
      hasAnswered && isCorrect && "border-2 border-gruen-hell",
      hasAnswered && !isCorrect && "line-through decoration-rotstift decoration-2"
    )}
    autoComplete="off"
  />
);

const SortRenderer: React.FC<{
  items: string[];
  correctOrder: string[];
  hasAnswered: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
}> = ({ items, correctOrder, hasAnswered, onMove }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleTap = (index: number) => {
    if (hasAnswered) return;
    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      onMove(selectedIndex, index);
      setSelectedIndex(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        Tippe auf zwei Elemente, um ihre Position zu tauschen:
      </p>
      {items.map((item, index) => {
        const isCorrectPosition = hasAnswered && item === correctOrder[index];
        const isSelected = selectedIndex === index;
        return (
          <button
            key={index}
            onClick={() => handleTap(index)}
            disabled={hasAnswered}
            className={cn(
              "flex items-center gap-3 p-4 w-full border-2 rounded-xl transition-all text-left",
              "active:scale-[0.98] touch-manipulation",
              isSelected && "ring-2 ring-primary ring-offset-2 border-primary bg-primary/10 scale-[1.02]",
              !isSelected && !hasAnswered && "border-border hover:border-primary/50 hover:bg-muted/50",
              hasAnswered && isCorrectPosition && "bg-gruen-hell/10 border-gruen-hell text-tinte",
              hasAnswered && !isCorrectPosition && "bg-card border-rotstift/70 text-tinte"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </span>
            <span className="frage-text min-w-0 flex-1 font-medium">{item}</span>
            {hasAnswered && isCorrectPosition && <Check className="w-5 h-5 text-gruen-text flex-shrink-0" />}
            {hasAnswered && !isCorrectPosition && <X className="w-5 h-5 text-rotstift flex-shrink-0" />}
          </button>
        );
      })}
      {selectedIndex !== null && (
        <p className="text-xs text-primary text-center mt-2 animate-pulse">
          Tippe jetzt auf das Element, mit dem du tauschen möchtest
        </p>
      )}
    </div>
  );
};

// Collapsible hint component
const HintToggle: React.FC<{ hint: string }> = ({ hint }) => {
  const [showHint, setShowHint] = useState(false);
  
  return (
    <div className="mt-2">
      <button
        onClick={() => setShowHint(!showHint)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lightbulb className="w-4 h-4" />
        <span>{showHint ? 'Tipp ausblenden' : 'Tipp anzeigen'}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", showHint && "rotate-180")} />
      </button>
      {showHint && (
        <p className="frage-text text-sm text-muted-foreground mt-2 pl-5 border-l-2 border-primary/30">
          {hint}
        </p>
      )}
    </div>
  );
};

const MatchRenderer: React.FC<{
  leftItems: string[];
  rightItems: string[];
  matches: Record<string, string>;
  correctPairs: [string, string][];
  hasAnswered: boolean;
  onMatch: (left: string, right: string) => void;
}> = ({ leftItems, rightItems, matches, correctPairs, hasAnswered, onMatch }) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const isCorrectMatch = (left: string, right: string) => {
    return correctPairs.some(([l, r]) => l === left && r === right);
  };

  const usedRightItems = Object.values(matches);
  const visibleLeftItems = leftItems;
  const visibleRightItems = rightItems;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tippe links auf einen Begriff und dann rechts auf die passende Zuordnung.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Begriffe</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleLeftItems.map((item) => {
              const isMatched = Boolean(matches[item]);
              return (
                <Button
                  key={item}
                  variant={selectedLeft === item ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "h-auto min-h-11 justify-start py-3 px-3 text-sm whitespace-normal text-left",
                    isMatched && selectedLeft !== item && "border-primary/40 bg-primary/10",
                    selectedLeft === item && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => {
                    if (hasAnswered) return;
                    setSelectedLeft(selectedLeft === item ? null : item);
                  }}
                  disabled={hasAnswered}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="frage-text min-w-0">{item}</span>
                    {matches[item] && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zuordnungen</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleRightItems.map((item) => {
              const isUsed = usedRightItems.includes(item);
              const isActiveTarget = Boolean(selectedLeft) && matches[selectedLeft] !== item;

              return (
                <Button
                  key={item}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto min-h-11 justify-start py-3 px-3 text-sm whitespace-normal text-left",
                    isUsed && "border-primary/40 bg-primary/10",
                    isActiveTarget && "hover:border-primary hover:bg-primary/10"
                  )}
                  onClick={() => {
                    if (hasAnswered || !selectedLeft) return;
                    onMatch(selectedLeft, item);
                    setSelectedLeft(null);
                  }}
                  disabled={hasAnswered || !selectedLeft}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="frage-text min-w-0">{item}</span>
                    {isUsed && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {Object.keys(matches).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Zugeordnet ({Object.keys(matches).length})
          </div>
          <div className="space-y-2">
            {Object.entries(matches).map(([left, right]) => {
              const isCorrect = hasAnswered && isCorrectMatch(left, right);
              const isWrong = hasAnswered && !isCorrectMatch(left, right);

              return (
                <div
                  key={left}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2 text-sm",
                    isCorrect && "bg-primary/10 border-primary",
                    isWrong && "bg-destructive/10 border-destructive",
                    !hasAnswered && "bg-muted/50"
                  )}
                >
                  <span className="frage-text min-w-0 max-w-[45%] font-medium">{left}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="frage-text min-w-0 flex-1">{right}</span>
                  {!hasAnswered && (
                    <button
                      onClick={() => onMatch(left, '')}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                  {isCorrect && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  {isWrong && <X className="w-4 h-4 text-destructive flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FillBlankRenderer: React.FC<{
  task: string;
  text: string;
  answers: string[];
  options: string[];
  correctAnswers: string[];
  hasAnswered: boolean;
  subject?: string;
  onChange: (index: number, value: string) => void;
}> = ({ task, text, answers, options, correctAnswers, hasAnswered, subject, onChange }) => {
  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null);
  // Use task as fill-blank text if text doesn't contain blanks
  const fillText = text.includes('___') ? text : (task.includes('___') ? task : text);
  const parts = fillText.split('___');
  
  // Determine if this is a language subject (should use keyboard input)
  const isLanguageSubject = ['german', 'english', 'latin', 'french', 'spanish'].includes(subject || '');
  const hasOptions = options.length > 0;
  const useChipSelection = hasOptions && !isLanguageSubject;
  
  // If no blanks found anywhere, show a simple text input fallback
  const hasBlanks = parts.length > 1;

  // Get available options (not yet used)
  const getAvailableOptions = () => {
    const usedAnswers = answers.filter(a => a !== '');
    return options.filter(opt => !usedAnswers.includes(opt));
  };

  // Handle clicking on a gap
  const handleGapClick = (index: number) => {
    if (hasAnswered) return;
    
    // If clicking an already filled gap, clear it
    if (answers[index]) {
      onChange(index, '');
      return;
    }
    
    // For chip selection mode, set this as active gap
    if (useChipSelection) {
      setActiveGapIndex(index);
    }
  };

  // Handle selecting a chip to fill the active gap
  const handleChipSelect = (option: string) => {
    if (activeGapIndex !== null && !hasAnswered) {
      onChange(activeGapIndex, option);
      
      // Move to next empty gap or clear active
      const nextEmptyIndex = answers.findIndex((a, i) => i > activeGapIndex && a === '');
      setActiveGapIndex(nextEmptyIndex >= 0 ? nextEmptyIndex : null);
    }
  };

  // Render a single gap/blank
  const renderGap = (index: number) => {
    const value = answers[index] || '';
    const isActive = activeGapIndex === index;
    const isCorrect = hasAnswered && value.toLowerCase().trim() === correctAnswers[index]?.toLowerCase().trim();
    const isWrong = hasAnswered && value && value.toLowerCase().trim() !== correctAnswers[index]?.toLowerCase().trim();

    // For language subjects or when no options: show input field
    if (isLanguageSubject || !hasOptions) {
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={hasAnswered}
          className={cn(
            "inline-block w-32 mx-1 h-8 text-center",
            hasAnswered && "disabled:opacity-100",
            isCorrect && "border-primary bg-primary/10",
            isWrong && "border-destructive bg-destructive/10"
          )}
          placeholder="..."
        />
      );
    }

    // For non-language subjects with options: show clickable gap
    return (
      <button
        type="button"
        onClick={() => handleGapClick(index)}
        disabled={hasAnswered}
        className={cn(
          "frage-text inline-flex max-w-full items-center justify-center min-w-20 px-3 py-1 mx-1 rounded-md border-2 border-dashed transition-all",
          "text-base font-medium",
          !value && !isActive && "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
          !value && isActive && "border-primary bg-primary/10 text-primary animate-pulse",
          value && !hasAnswered && "border-primary bg-primary/20 text-foreground cursor-pointer hover:bg-primary/30",
          isCorrect && "border-primary bg-primary/20 text-primary",
          isWrong && "border-destructive bg-destructive/20 text-destructive",
          hasAnswered && "cursor-default"
        )}
      >
        {value || '...'}
      </button>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Task/Instruction - prominently displayed */}
      {task && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-base font-medium text-foreground">
            📝 <span className="font-semibold">Aufgabe:</span> {task}
          </p>
        </div>
      )}
      
      {/* Text with inline gaps */}
      <div className="text-lg leading-loose bg-muted/30 rounded-lg p-4">
        {hasBlanks ? (
          parts.map((part, index) => (
            <React.Fragment key={index}>
              <span>{part}</span>
              {index < parts.length - 1 && renderGap(index)}
            </React.Fragment>
          ))
        ) : (
          <>
            <p className="mb-3">{text}</p>
            {isLanguageSubject || !hasOptions ? (
              <Input
                type="text"
                value={answers[0] || ''}
                onChange={(e) => onChange(0, e.target.value)}
                disabled={hasAnswered}
                className={cn(
                  "text-lg h-14",
                  hasAnswered && "disabled:opacity-100",
                  hasAnswered && answers[0]?.toLowerCase().trim() === correctAnswers[0]?.toLowerCase().trim() && "border-2 border-gruen-hell",
                  hasAnswered && answers[0]?.toLowerCase().trim() !== correctAnswers[0]?.toLowerCase().trim() && "border-rotstift/70 line-through decoration-rotstift"
                )}
                placeholder="Deine Antwort..."
                autoComplete="off"
              />
            ) : null}
          </>
        )}
      </div>

      {/* Word chips for selection (only for non-language subjects with options) */}
      {useChipSelection && !hasAnswered && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {activeGapIndex !== null 
              ? '👆 Tippe auf ein Wort zum Einsetzen:' 
              : '👆 Tippe zuerst auf eine Lücke:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isUsed = answers.includes(option);
              const isAvailable = !isUsed && activeGapIndex !== null;
              
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => isAvailable && handleChipSelect(option)}
                  disabled={isUsed || activeGapIndex === null}
                  className={cn(
                    "frage-text max-w-full px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isAvailable && "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm hover:shadow-md active:scale-95",
                    isUsed && "bg-muted text-muted-foreground/50 line-through cursor-not-allowed",
                    !isUsed && activeGapIndex === null && "bg-secondary text-secondary-foreground opacity-60"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Show correct answers after answering */}
      {hasAnswered && correctAnswers.some((correct, i) => 
        answers[i]?.toLowerCase().trim() !== correct?.toLowerCase().trim()
      ) && (
        <div className="frage-text text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-lg">
          <strong>Richtige Lösung:</strong> {correctAnswers.join(', ')}
        </div>
      )}
    </div>
  );
};

const DragDropRenderer: React.FC<{
  items: string[];
  categories: string[];
  placements: Record<string, string[]>;
  correctPlacements: Record<string, string[]>;
  hasAnswered: boolean;
  onPlace: (item: string, category: string) => void;
}> = ({ items, categories, placements, correctPlacements, hasAnswered, onPlace }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  const placedItems = Object.values(placements).flat();
  const unplacedItems = items.filter(item => !placedItems.includes(item));

  const isCorrectPlacement = (item: string, category: string) => {
    return correctPlacements[category]?.includes(item);
  };

  return (
    <div className="space-y-4">
      {/* Unplaced items */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">Elemente:</p>
        <div className="flex flex-wrap gap-2">
          {unplacedItems.map((item) => (
            <Button
              key={item}
              variant={selectedItem === item ? 'default' : 'outline'}
              size="sm"
              className="frage-text h-auto max-w-full whitespace-normal py-1.5 text-left"
              onClick={() => !hasAnswered && setSelectedItem(item)}
              disabled={hasAnswered}
            >
              {item}
            </Button>
          ))}
          {unplacedItems.length === 0 && (
            <span className="text-sm text-muted-foreground">Alle Elemente zugeordnet</span>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((category) => (
          <div 
            key={category}
            className={cn(
              "p-4 border-2 border-dashed rounded-lg min-h-[100px]",
              selectedItem && !hasAnswered && "border-primary cursor-pointer hover:bg-muted/50"
            )}
            onClick={() => {
              if (selectedItem && !hasAnswered) {
                onPlace(selectedItem, category);
                setSelectedItem(null);
              }
            }}
          >
            <p className="font-medium mb-2">{category}</p>
            <div className="flex flex-wrap gap-1">
              {(placements[category] || []).map((item) => (
                <Badge 
                  key={item}
                  variant={hasAnswered && isCorrectPlacement(item, category) ? 'default' : hasAnswered ? 'destructive' : 'secondary'}
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper functions
function getSubjectName(subject: string): string {
  const map: Record<string, string> = {
    'math': 'Mathematik',
    'german': 'Deutsch',
    'english': 'Englisch',
    'geography': 'Geographie',
    'history': 'Geschichte',
    'physics': 'Physik',
    'biology': 'Biologie',
    'chemistry': 'Chemie',
    'latin': 'Latein'
  };
  return map[subject] || subject;
}

function getSubjectEmoji(subject: string): string {
  const map: Record<string, string> = {
    'math': '🔢',
    'german': '📚',
    'english': '🔤',
    'geography': '🌍',
    'history': '🏛️',
    'physics': '⚡',
    'biology': '🌱',
    'chemistry': '🧪',
    'latin': '🏺'
  };
  return map[subject] || '📖';
}
