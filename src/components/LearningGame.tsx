import React, { useState, useEffect, useMemo } from 'react';
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
import { GameCompletionScreen } from '@/components/GameCompletionScreen';
import { AchievementPopup } from '@/components/AchievementPopup';
import { Loader2, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Trophy, Clock, Flag, ChevronDown, Check, X, Sparkles, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuestionReport } from '@/hooks/useQuestionReport';
import { QuestionReportDialog } from '@/components/game/QuestionReportDialog';
import { KITutorDialog } from '@/components/game/KITutorDialog';
import { useSubscription } from '@/hooks/useSubscription';

interface LearningGameProps {
  grade: number;
  subject: string;
  onComplete: (stats: GameStats) => void;
  onBack: () => void;
  totalQuestions?: number;
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
  totalQuestions = 5
}) => {
  const { user } = useAuth();
  const { saveSession, isSaving } = useGameSessionSaver();
  const { settings: childSettings } = useChildSettings(user?.id || '');
  const { trackAllAchievements } = useAchievementTracker(user?.id);
  
  // Use preloader instead of single question loader
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
  } = useQuestionPreloader({ grade, subject, totalQuestions });
  
  const { explanation, isLoading: isLoadingExplanation, fetchExplanation, clearExplanation } = useAIExplanation();
  
  // Active timer - only counts time spent answering questions
  const { elapsedTime, isRunning, start: startTimer, pause: pauseTimer, reset: resetTimer, formattedTime } = useActiveTimer();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const [achievementBonusMinutes, setAchievementBonusMinutes] = useState(0);
  
  // Answer states for different question types
  const [userTextAnswer, setUserTextAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [dragDropPlacements, setDragDropPlacements] = useState<Record<string, string[]>>({});
  const { isPremium } = useSubscription();
  
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

  // Start timer when question is ready, stop when answered
  useEffect(() => {
    if (question && !hasAnswered && !isInitialLoading) {
      startTimer();
    }
  }, [question, hasAnswered, isInitialLoading, startTimer]);

  // Initialize answer state when question changes and scroll to top
  useEffect(() => {
    if (question) {
      resetAnswerState();
      if (question.questionType === 'SORT' && question.options) {
        setSortOrder([...question.options]);
      }
      if (question.questionType === 'FILL_BLANK' && question.correctAnswer?.blanks) {
        setFillBlanks(new Array(question.correctAnswer.blanks.length).fill(''));
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
    clearExplanation();
  };

  const checkAnswer = () => {
    if (!question) return;

    let correct = false;

    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        correct = selectedOption === question.correctAnswer?.value;
        break;

      case 'FREETEXT':
        const userVal = userTextAnswer.toLowerCase().trim();
        const correctVal = String(question.correctAnswer?.value || '').toLowerCase().trim();
        const alternatives = (question.correctAnswer?.alternatives || []).map((a: string) => a.toLowerCase().trim());
        correct = userVal === correctVal || alternatives.includes(userVal);
        break;

      case 'SORT':
        correct = JSON.stringify(sortOrder) === JSON.stringify(question.correctAnswer?.order);
        break;

      case 'MATCH':
        const correctPairs = question.correctAnswer?.pairs || [];
        correct = correctPairs.every(([left, right]: [string, string]) => matches[left] === right);
        break;

      case 'DRAG_DROP':
        const correctPlacements = question.correctAnswer?.placements || {};
        correct = Object.entries(correctPlacements).every(([category, items]) =>
          JSON.stringify((dragDropPlacements[category] || []).sort()) === JSON.stringify((items as string[]).sort())
        );
        break;

      case 'FILL_BLANK':
        const correctBlanks = question.correctAnswer?.blanks || [];
        correct = fillBlanks.every((answer, i) => 
          answer.toLowerCase().trim() === correctBlanks[i]?.toLowerCase().trim()
        );
        break;
    }

    setIsCorrect(correct);
    setHasAnswered(true);
    
    // PAUSE timer when question is answered
    pauseTimer();

    if (correct) {
      setScore(prev => prev + 1);
      // Increase difficulty on correct answers
      if (difficulty === 'easy') setDifficulty('medium');
      else if (difficulty === 'medium' && Math.random() > 0.5) setDifficulty('hard');
      // No toast for correct - UI already shows green feedback inline
    } else {
      // Decrease difficulty on wrong answers
      if (difficulty === 'hard') setDifficulty('medium');
      else if (difficulty === 'medium') setDifficulty('easy');
      // No toast for incorrect - UI already shows red feedback inline
    }
  };

  const handleShowExplanation = async () => {
    if (!question) return;
    setShowExplanation(true);
    
    const correctAnswerText = getCorrectAnswerText();
    const userAnswerText = getUserAnswerText();
    
    await fetchExplanation(
      question.questionText,
      correctAnswerText,
      grade,
      subject,
      userAnswerText
    );
  };

  // Handle "Show Answer" button - marks as incorrect and shows answer + explanation
  const handleShowAnswer = async () => {
    if (!question) return;
    
    // Mark as answered but incorrect
    setIsCorrect(false);
    setHasAnswered(true);
    
    // Pause timer
    pauseTimer();
    
    // Decrease difficulty since the child couldn't answer
    if (difficulty === 'hard') setDifficulty('medium');
    else if (difficulty === 'medium') setDifficulty('easy');
    
    // Automatically show explanation
    setShowExplanation(true);
    
    const correctAnswerText = getCorrectAnswerText();
    
    await fetchExplanation(
      question.questionText,
      correctAnswerText,
      grade,
      subject,
      'Ich konnte die Antwort nicht finden.'
    );
  };

  const getCorrectAnswerText = (): string => {
    if (!question) return '';
    
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'FREETEXT':
        return String(question.correctAnswer?.value || '');
      case 'SORT':
        return (question.correctAnswer?.order || []).join(' → ');
      case 'MATCH':
        return (question.correctAnswer?.pairs || [])
          .map(([a, b]: [string, string]) => `${a} = ${b}`)
          .join(', ');
      case 'FILL_BLANK':
        return (question.correctAnswer?.blanks || []).join(', ');
      default:
        return '';
    }
  };

  const getUserAnswerText = (): string => {
    if (!question) return '';
    
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return selectedOption || '';
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
    if (currentIndex + 1 >= totalQuestions) {
      // Game complete - show completion screen and save to DB
      pauseTimer(); // Make sure timer is paused
      setShowCompletionScreen(true);
      
      // Calculate earned time based on child settings
      const timeSpentSeconds = Math.floor(elapsedTime / 1000);
      const secondsPerTask = getSecondsPerTask();
      const earnedSeconds = score * secondsPerTask;
      const accuracyScore = Math.round((score / totalQuestions) * 100);
      
      // Save session to database
      if (user && !sessionSaved) {
        const result = await saveSession({
          category: subject,
          grade,
          correctAnswers: score,
          totalQuestions,
          timeSpentSeconds,
          earnedSeconds, // Store in seconds for consistency
          questionSource: 'template-bank'
        });
        
        if (result.success) {
          console.log('✅ Session saved with ID:', result.sessionId);
          setSessionSaved(true);
          
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
              // Calculate bonus minutes from achievements
              const bonusMinutes = earned.reduce((sum, a) => sum + (a.reward_minutes || 0), 0);
              setAchievementBonusMinutes(bonusMinutes);
            }
          } catch (error) {
            console.error('❌ Error tracking achievements:', error);
          }
        } else {
          console.error('❌ Failed to save session:', result.error);
          toast.error('Fehler beim Speichern der Session');
        }
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      resetAnswerState();
      // Timer will auto-start via useEffect when new question loads
      // Update difficulty for future questions
      updateDifficulty(difficulty);
    }
  };

  // Handle completion screen continue button
  const handleCompletionContinue = () => {
    const timeSpentSeconds = Math.floor(elapsedTime / 1000);
    const secondsPerTask = getSecondsPerTask();
    const earnedSeconds = score * secondsPerTask;
    const earnedMinutes = Math.ceil(earnedSeconds / 60);
    
    onComplete({
      correct: score,
      total: totalQuestions,
      timeSpent: timeSpentSeconds,
      earnedMinutes,
      subject
    });
  };

  // Move sort item
  const moveSortItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...sortOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setSortOrder(newOrder);
  };

  // Game completion screen
  if (showCompletionScreen) {
    const secondsPerTask = getSecondsPerTask();
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <GameCompletionScreen
          score={score}
          totalQuestions={totalQuestions}
          sessionDuration={elapsedTime}
          timePerTask={secondsPerTask}
          achievementBonusMinutes={achievementBonusMinutes}
          perfectSessionBonus={score === totalQuestions ? 1 : 0}
          onContinue={handleCompletionContinue}
        />
        
        {/* Achievement Popup */}
        {showAchievementPopup && newAchievements.length > 0 && (
          <AchievementPopup
            achievements={newAchievements}
            onClose={() => setShowAchievementPopup(false)}
          />
        )}
      </div>
    );
  }

  // Initial loading screen with progress
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Deine Fragen werden vorbereitet...</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Das dauert nur einen Moment ✨
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (preloadError && !question) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
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

  // Waiting for next question (edge case if user is faster than preloading)
  if (!question && !isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Nächste Frage wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{getSubjectEmoji(subject)} {getSubjectName(subject)}</Badge>
            <Badge variant="outline">Klasse {grade}</Badge>
          </div>
        </div>

        {/* Progress with Active Timer */}
        <div className="mb-6">
          {/* Timer Display */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className={cn("w-4 h-4", isRunning ? "text-primary" : "text-muted-foreground/50")} />
            <span className={cn(
              "font-mono text-lg transition-colors",
              isRunning ? "text-foreground" : "text-muted-foreground/70"
            )}>
              {formattedTime}
            </span>
            {!isRunning && hasAnswered && (
              <span className="text-xs text-muted-foreground">(pausiert)</span>
            )}
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-2">
              Frage {currentIndex + 1} von {totalQuestions}
              {loadingProgress < totalQuestions && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {loadingProgress}/{totalQuestions}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-primary" />
              {score} richtig
            </span>
          </div>
          <Progress value={(currentIndex / totalQuestions) * 100} className="h-2" />
        </div>

        {/* Question Card */}
        {question && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                {/* Hide question text for FILL_BLANK as it's rendered inline with gaps */}
                {question.questionType !== 'FILL_BLANK' && (
                  <CardTitle className="text-xl leading-relaxed">{question.questionText}</CardTitle>
                )}
                {question.questionType === 'FILL_BLANK' && <div className="flex-1" />}
              </div>
              {question.hint && !hasAnswered && (
                <HintToggle hint={question.hint} />
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Type Renderers */}
              {question.questionType === 'MULTIPLE_CHOICE' && (
                <MultipleChoiceRenderer
                  options={question.options || []}
                  selectedOption={selectedOption}
                  correctAnswer={question.correctAnswer?.value}
                  hasAnswered={hasAnswered}
                  onSelect={setSelectedOption}
                />
              )}

              {question.questionType === 'FREETEXT' && (
                <FreetextRenderer
                  value={userTextAnswer}
                  onChange={setUserTextAnswer}
                  hasAnswered={hasAnswered}
                  isCorrect={isCorrect}
                  correctAnswer={question.correctAnswer?.value}
                />
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
                  correctPairs={question.correctAnswer?.pairs || []}
                  hasAnswered={hasAnswered}
                  onMatch={(left, right) => setMatches(prev => ({ ...prev, [left]: right }))}
                />
              )}

              {question.questionType === 'FILL_BLANK' && (
                <FillBlankRenderer
                  task={question.task || ''}
                  text={question.questionText}
                  answers={fillBlanks}
                  options={question.options || []}
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

              {/* Answer Feedback */}
              {hasAnswered && (
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  isCorrect 
                    ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                    : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">Richtig!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-400">Nicht ganz richtig</span>
                      </>
                    )}
                  </div>
                  {!isCorrect && (
                    <p className="text-sm text-muted-foreground">
                      Richtige Antwort: <strong>{getCorrectAnswerText()}</strong>
                    </p>
                  )}
                  {/* Report Button for incorrect answers */}
                  {!isCorrect && question && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReportDialog(true)}
                      className="mt-2 w-full text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Frage melden (Antwort falsch?)
                    </Button>
                  )}
                  {/* KI-Tutor Premium Hint */}
                  {!isCorrect && question && (
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                      {isPremium ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTutorDialog(true)}
                          className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          KI-Tutor fragen
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
                          <Sparkles className="w-4 h-4 text-warning" />
                          <span>KI-Tutor erklärt dir den Lösungsweg</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                            <Crown className="h-3 w-3" />
                            Premium
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {showExplanation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">Erklärung</span>
                  </div>
                  {isLoadingExplanation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Erklärung wird erstellt...</span>
                    </div>
                  ) : (
                    <p className="text-sm">{explanation}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {!hasAnswered ? (
                  <>
                    <Button 
                      onClick={checkAnswer} 
                      className="flex-1"
                      disabled={!canSubmitAnswer()}
                    >
                      Antwort prüfen
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleShowAnswer}
                      disabled={isLoadingExplanation}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Antwort anzeigen
                    </Button>
                  </>
                ) : (
                  <>
                    {!isCorrect && !showExplanation && (
                      <Button 
                        variant="outline" 
                        onClick={handleShowExplanation}
                        disabled={isLoadingExplanation}
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Erklärung
                      </Button>
                    )}
                    <Button onClick={handleNextQuestion} className="flex-1">
                      {currentIndex + 1 >= totalQuestions ? (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Ergebnis anzeigen
                        </>
                      ) : (
                        <>
                          Nächste Frage
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
        />
      )}

      {/* KI-Tutor Dialog */}
      {question && (
        <KITutorDialog
          open={showTutorDialog}
          onOpenChange={setShowTutorDialog}
          questionText={question.questionText}
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
        return selectedOption !== null;
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
        return false;
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
    {options.map((option, index) => (
      <Button
        key={index}
        variant={selectedOption === option ? 'default' : 'outline'}
        className={cn(
          "w-full justify-start text-left p-4 h-auto",
          hasAnswered && option === correctAnswer && "border-green-500 bg-green-50 dark:bg-green-950",
          hasAnswered && selectedOption === option && option !== correctAnswer && "border-red-500 bg-red-50 dark:bg-red-950"
        )}
        onClick={() => !hasAnswered && onSelect(option)}
        disabled={hasAnswered}
      >
        {option}
      </Button>
    ))}
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
      "text-lg h-14",
      hasAnswered && isCorrect && "border-green-500",
      hasAnswered && !isCorrect && "border-red-500"
    )}
    autoComplete="off"
  />
);

const SortRenderer: React.FC<{
  items: string[];
  correctOrder: string[];
  hasAnswered: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
}> = ({ items, correctOrder, hasAnswered, onMove }) => (
  <div className="space-y-2">
    <p className="text-sm text-muted-foreground mb-3">Klicke auf ↑↓ um die Reihenfolge zu ändern:</p>
    {items.map((item, index) => {
      const isCorrectPosition = hasAnswered && item === correctOrder[index];
      return (
        <div 
          key={index}
          className={cn(
            "flex items-center gap-2 p-3 border rounded-lg",
            hasAnswered && isCorrectPosition && "bg-green-50 border-green-300",
            hasAnswered && !isCorrectPosition && "bg-red-50 border-red-300"
          )}
        >
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => index > 0 && onMove(index, index - 1)}
              disabled={hasAnswered || index === 0}
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => index < items.length - 1 && onMove(index, index + 1)}
              disabled={hasAnswered || index === items.length - 1}
            >
              ↓
            </Button>
          </div>
          <span className="flex-1">{item}</span>
          <span className="text-muted-foreground text-sm">{index + 1}</span>
        </div>
      );
    })}
  </div>
);

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
        <p className="text-sm text-muted-foreground mt-2 pl-5 border-l-2 border-primary/30">
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

  // Get unmatched items for cleaner UI
  const unmatchedLeftItems = leftItems.filter(item => !matches[item]);
  const usedRightItems = Object.values(matches);
  const availableRightItems = rightItems.filter(item => !usedRightItems.includes(item));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Wähle links, dann rechts um zuzuordnen:</p>
      
      {/* Stacked layout for better mobile UX */}
      <div className="space-y-6">
        {/* Left items - terms to match */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Begriffe</div>
          <div className="flex flex-wrap gap-2">
            {unmatchedLeftItems.map((item) => (
              <Button
                key={item}
                variant={selectedLeft === item ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-auto py-2 px-3 text-sm whitespace-normal text-left",
                  selectedLeft === item && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => !hasAnswered && setSelectedLeft(selectedLeft === item ? null : item)}
                disabled={hasAnswered}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {/* Right items - targets to match to */}
        {selectedLeft && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ordne „{selectedLeft}" zu:
            </div>
            <div className="flex flex-wrap gap-2">
              {availableRightItems.map((item) => (
                <Button
                  key={item}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-sm whitespace-normal text-left hover:bg-primary/10 hover:border-primary"
                  onClick={() => {
                    onMatch(selectedLeft, item);
                    setSelectedLeft(null);
                  }}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Already matched pairs */}
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
                      "flex items-start gap-2 p-2 rounded-lg border text-sm",
                      isCorrect && "bg-green-50 border-green-300 dark:bg-green-950",
                      isWrong && "bg-red-50 border-red-300 dark:bg-red-950",
                      !hasAnswered && "bg-muted/50"
                    )}
                  >
                    <span className="font-medium flex-shrink-0">{left}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="flex-1">{right}</span>
                    {!hasAnswered && (
                      <button 
                        onClick={() => onMatch(left, '')} 
                        className="text-muted-foreground hover:text-destructive ml-auto"
                      >
                        ✕
                      </button>
                    )}
                    {isCorrect && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    {isWrong && <X className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
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
  const parts = text.split('___');
  
  // Determine if this is a language subject (should use keyboard input)
  const isLanguageSubject = ['german', 'english', 'latin', 'french', 'spanish'].includes(subject || '');
  const hasOptions = options.length > 0;
  const useChipSelection = hasOptions && !isLanguageSubject;

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
            isCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
            isWrong && "border-red-500 bg-red-50 dark:bg-red-950"
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
          "inline-flex items-center justify-center min-w-20 px-3 py-1 mx-1 rounded-md border-2 border-dashed transition-all",
          "text-base font-medium",
          !value && !isActive && "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
          !value && isActive && "border-primary bg-primary/10 text-primary animate-pulse",
          value && !hasAnswered && "border-primary bg-primary/20 text-foreground cursor-pointer hover:bg-primary/30",
          isCorrect && "border-green-500 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
          isWrong && "border-red-500 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
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
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span>{part}</span>
            {index < parts.length - 1 && renderGap(index)}
          </React.Fragment>
        ))}
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
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
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
        <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded-lg">
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
    'english': '🇬🇧',
    'geography': '🌍',
    'history': '🏛️',
    'physics': '⚡',
    'biology': '🌱',
    'chemistry': '🧪',
    'latin': '🏺'
  };
  return map[subject] || '📖';
}
