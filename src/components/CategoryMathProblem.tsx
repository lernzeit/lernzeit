import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTemplateBankGeneration } from '@/hooks/useTemplateBankGeneration';
import { useQuestionEventLogging } from '@/hooks/useQuestionEventLogging';
import { getCurrentSchoolQuarter } from '@/data/templateBank';
import { QuestionRenderer } from '@/components/game/QuestionRenderer';
import { GameProgress } from '@/components/game/GameProgress';
import { GameFeedback } from '@/components/game/GameFeedback';
import { QuestionGenerationInfo } from '@/components/game/QuestionGenerationInfo';
import { QuestionFeedbackDialog } from '@/components/game/QuestionFeedbackDialog';
import { AnswerCalculator } from '@/utils/templates/answerCalculator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/lib/supabase';
import { useScreenTime } from '@/hooks/useScreenTime';
import { useChildSettings } from '@/hooks/useChildSettings';
import type { ChildSettings } from '@/hooks/useChildSettings';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementAnimation } from '@/components/game/AchievementAnimation';
import { GameTimeDisplay } from '@/components/game/GameTimeDisplay';
import { GameCompletionScreen } from '@/components/GameCompletionScreen';
import { AlertTriangle, RefreshCw, Database, Brain, Archive, Check, X, Flag, ArrowRight } from 'lucide-react';
import { useAdaptiveDifficultySystem } from '@/hooks/useAdaptiveDifficultySystem';

interface CategoryMathProblemProps {
  category: string;
  grade: number;
  onComplete: (minutes: number, category: string) => void;
  onBack?: () => void;
}

export function CategoryMathProblem({ category, grade, onComplete, onBack }: CategoryMathProblemProps) {
  const { user } = useAuth();
  const { addScreenTime } = useScreenTime();
  const { settings } = useChildSettings(user?.id || '');
  const { updateProgress } = useAchievements(user?.id);
  const { logQuestionAnswer, logQuestionRating } = useQuestionEventLogging();
  
  // 🏦 NEW TEMPLATE-BANK SYSTEM - PRIMARY SOURCE
  const currentQuarter = getCurrentSchoolQuarter();
  console.log(`🏦 Using Template-Bank for ${category} Grade ${grade} Quarter ${currentQuarter}`);
  
  const templateBankGeneration = useTemplateBankGeneration(
    category,
    grade,
    user?.id || 'anonymous',
    5, // 5 questions per session (session policy)
    currentQuarter,
    {
      enableQualityControl: true,
      minQualityThreshold: 0.7,
      preferredDifficulty: undefined, // Let adaptive system decide
      diversityWeight: 0.8,
      fallbackToLegacy: false // LEGACY FALLBACKS DEAKTIVIERT
    }
  );

  const { 
    problems, 
    isGenerating, 
    error: generationError, 
    generationSource,
    qualityMetrics,
    refreshQuestions 
  } = templateBankGeneration;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedMultipleChoice, setSelectedMultipleChoice] = useState<number | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [currentPlacements, setCurrentPlacements] = useState<Record<string, string>>({});
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Adaptive Difficulty System
  const normalizeCategoryForAdaptive = (c: string): string => {
    const s = c.toLowerCase();
    if (s.includes('mathematik') || s.includes('math')) return 'math';
    if (s.includes('deutsch') || s.includes('german')) return 'german';
    if (s.includes('englisch') || s.includes('english')) return 'english';
    if (s.includes('geographie') || s.includes('geography')) return 'geography';
    if (s.includes('geschichte') || s.includes('history')) return 'history';
    if (s.includes('physik') || s.includes('physics')) return 'physics';
    if (s.includes('biologie') || s.includes('biology')) return 'biology';
    if (s.includes('chemie') || s.includes('chemistry')) return 'chemistry';
    if (s.includes('latein') || s.includes('latin')) return 'latin';
    return s;
  };

  const adaptiveUserId = user?.id || '00000000-0000-0000-0000-000000000000';
  const adaptive = useAdaptiveDifficultySystem(normalizeCategoryForAdaptive(category), grade, adaptiveUserId);

  // Show generation status and source
  const getSourceIcon = () => {
    switch (generationSource) {
      case 'template-bank': return <Database className="w-4 h-4 text-green-600" />;
      case 'knowledge-generated': return <Brain className="w-4 h-4 text-blue-600" />;
      case 'legacy-fallback': return <Archive className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
  };

  const getSourceLabel = () => {
    switch (generationSource) {
      case 'template-bank': return 'Template-Bank';
      case 'knowledge-generated': return 'Lehrplan-Generator';
      case 'legacy-fallback': return 'Fallback-System';
      default: return 'Wird geladen...';
    }
  };

  const currentQuestion: SelectionQuestion | undefined = problems[currentQuestionIndex];

  // Start game
  const startGame = () => {
    adaptive.resetSession();
    setGameStarted(true);
  };

  const resetAnswers = () => {
    setUserAnswer('');
    setSelectedMultipleChoice(null);
    setSelectedWords([]);
    setCurrentPlacements({});
  };

  // ✅ NEW: Handle manual continuation to next question
  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex === problems.length - 1;
    
    if (isLastQuestion) {
      completeGame();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setFeedback(null);
      setWaitingForNext(false);
      resetAnswers();
      setQuestionStartTime(Date.now());
    }
  };

  // ✅ FIXED: Check answer function with proper multiple-choice validation
  const checkAnswer = (answer: string | number | number[] | Record<string, string>, question: SelectionQuestion): boolean => {
    switch (question.questionType) {
      case 'text-input':
        const textAnswer = (question as any).answer;
        const userInput = String(answer).trim().toLowerCase().replace(',', '.');
        const correctAnswer = String(textAnswer).toLowerCase().replace(',', '.');
        
        // For numeric answers, try numeric comparison
        const userNum = parseFloat(userInput);
        const correctNum = parseFloat(correctAnswer);
        if (!isNaN(userNum) && !isNaN(correctNum)) {
          return Math.abs(userNum - correctNum) < 0.001;
        }
        
        return userInput === correctAnswer;
        
      case 'multiple-choice':
        // ✅ FIXED: Handle both correctAnswer index and string matching
        const mcQuestion = question as any;
        const selectedIndex = Number(answer);
        const selectedOption = mcQuestion.options?.[selectedIndex];
        
        // Method 1: Check by index (if correctAnswer is a number)
        if (typeof mcQuestion.correctAnswer === 'number') {
          return selectedIndex === mcQuestion.correctAnswer;
        }
        
        // Method 2: Check by string matching (if correctAnswer is a string)
        if (typeof mcQuestion.correctAnswer === 'string') {
          return selectedOption === mcQuestion.correctAnswer;
        }
        
        // Method 3: Use BulletproofAnswerCalculator for reliable calculation
        if (mcQuestion.question && mcQuestion.options) {
          // Try to get template info for calculation
          const questionTemplate = (question as any).template;
          const questionParams = (question as any).params || {};
          
          if (questionTemplate && Object.keys(questionParams).length > 0) {
            console.log('🔍 Using AnswerCalculator for validation');
            const calculationResult = AnswerCalculator.calculateAnswer(
              questionTemplate, 
              questionParams, 
              mcQuestion.question
            );
            
            if (calculationResult.isValid && (calculationResult.confidence || 0) >= 0.7) {
              const calculatedAnswer = String(calculationResult.answer);
              console.log('🎯 AnswerCalculator result:', { 
                calculated: calculatedAnswer, 
                selected: selectedOption,
                confidence: calculationResult.confidence
              });
              return selectedOption === calculatedAnswer || selectedOption.includes(calculatedAnswer);
            }
          }
          
          // Fallback: Direct comparison with stored answer
          const calculatedAnswer = (question as any).answer;
          if (calculatedAnswer !== undefined) {
            return selectedOption === String(calculatedAnswer) || selectedOption === calculatedAnswer;
          }
        }
        
        return selectedIndex === mcQuestion.correctAnswer;
        
      default:
        return false;
    }
  };

  const handleAnswerSubmit = async (answer: string | number | number[] | Record<string, string>) => {
    if (!problems || problems.length === 0) return;
    
    const currentQuestion = problems[currentQuestionIndex];
    const isCorrect = checkAnswer(answer, currentQuestion);
    
    // 📊 LOG QUESTION EVENT (Template-Bank Analytics)
    const templateId = (currentQuestion as any).templateId;
    if (templateId && typeof templateId === 'string') {
      await logQuestionAnswer(templateId, isCorrect);
      console.log(`📊 Logged ${isCorrect ? 'CORRECT' : 'INCORRECT'} answer for template ${templateId}`);
    }
    
    // Update adaptive difficulty - simplified logging
    console.log(`📈 Question ${currentQuestionIndex + 1}: ${isCorrect ? 'CORRECT' : 'INCORRECT'} (${Date.now() - questionStartTime}ms)`);
    adaptive.resetSession(); // Keep session reset functionality
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore(score + 1);
      
      // 🎯 UPDATE ACHIEVEMENTS for correct answers
      if (user?.id && updateProgress) {
        try {
          console.log('🎯 Triggering achievement update for correct answer');
          const newAchievements = await updateProgress(category, 'questions_solved', 1);
          
          if (newAchievements && newAchievements.length > 0) {
            console.log('🏆 New achievements earned:', newAchievements);
            // Store new achievements to show later
            setNewAchievements(prev => [...(prev || []), ...newAchievements]);
            setShowAchievements(true); // ✅ FIXED: Show achievement animation
          }
        } catch (error) {
          console.error('❌ Error updating achievements:', error);
        }
      }
    }
    
    // ✅ FIXED: Set waiting state instead of auto-advancing
    setWaitingForNext(true);
  };

  const completeGame = async () => {
    const endTime = Date.now();
    setSessionEndTime(endTime);
    setGameCompleted(true);
    
    // 🏆 UPDATE SESSION-BASED ACHIEVEMENTS
    if (user?.id && updateProgress) {
      try {
        const sessionDurationMinutes = Math.round((endTime - sessionStartTime) / 1000 / 60);
        const accuracy = Math.round((score / problems.length) * 100);
        
        console.log('🎯 Triggering session completion achievements:', {
          category,
          sessionDurationMinutes,
          accuracy,
          score,
          totalQuestions: problems.length
        });
        
        // Update total questions achievement
        const totalQuestionsAchievements = await updateProgress('general', 'total_questions', score);
        
        // Update streak achievement (daily learning)
        const streakAchievements = await updateProgress('general', 'streak', 1);
        
        // Update accuracy achievements if high accuracy
        let accuracyAchievements = [];
        if (accuracy >= 90) {
          accuracyAchievements = await updateProgress('general', 'accuracy_master', accuracy);
        }
        
        // Update perfect session bonus
        let perfectAchievements = [];
        if (accuracy === 100) {
          perfectAchievements = await updateProgress('general', 'perfect_sessions', 1);
        }
        
        // Update marathon sessions if session was long (> 30 minutes)
        let marathonAchievements = [];
        if (sessionDurationMinutes > 30) {
          marathonAchievements = await updateProgress('general', 'marathon_sessions', 1);
        }
        
        // Update night owl achievement if after 8 PM
        let nightOwlAchievements = [];
        const currentHour = new Date().getHours();
        if (currentHour >= 20 || currentHour <= 5) {
          nightOwlAchievements = await updateProgress('general', 'night_owl', 1);
        }
        
        // Update weekend warrior on weekends
        let weekendAchievements = [];
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
          weekendAchievements = await updateProgress('general', 'weekend_warrior', 1);
        }
        
        // Collect all new achievements
        const allNewAchievements = [
          ...totalQuestionsAchievements,
          ...streakAchievements,
          ...accuracyAchievements,
          ...perfectAchievements,
          ...marathonAchievements,
          ...nightOwlAchievements,
          ...weekendAchievements
        ];
        
        if (allNewAchievements.length > 0) {
          console.log('🏆 Session completion achievements earned:', allNewAchievements);
          setNewAchievements(prev => [...(prev || []), ...allNewAchievements]);
          setShowAchievements(true); // ✅ FIXED: Show achievement animation
        }
      } catch (error) {
        console.error('❌ Error updating session achievements:', error);
      }
    }
    
    const finalSessionDuration = endTime - sessionStartTime;
    let earnedSeconds = 0;
    let timePerTask = 30;
    
    if (settings) {
      const categoryKey = `${category.toLowerCase()}_seconds_per_task` as keyof typeof settings;
      timePerTask = settings[categoryKey] as number || 30;
      earnedSeconds = score * timePerTask;
    } else {
      earnedSeconds = score * 30;
    }

    // Save session data
    if (user) {
      try {
        await supabase.from('game_sessions').insert({
          user_id: user.id,
          grade,
          correct_answers: score,
          total_questions: problems.length,
          time_spent: finalSessionDuration / 1000,
          time_earned: earnedSeconds,
          duration_seconds: Math.round(finalSessionDuration / 1000),
          score: Math.round((score / problems.length) * 100),
          question_source: generationSource, // Track Template-Bank vs other sources
          category
        });

        // Save session to learning_sessions for analytics
        await supabase.from('learning_sessions').insert({
          user_id: user.id,
          grade,
          correct_answers: score,
          total_questions: problems.length,
          time_spent: finalSessionDuration / 1000,
          time_earned: earnedSeconds,
          category
        });
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
    
    addScreenTime(earnedSeconds);
  };

  // Loading state - child-friendly design
  if (isGenerating || problems.length === 0) {
    const loadingMessages = [
      "🎯 Suche die besten Fragen für dich...",
      "📚 Bereite spannende Aufgaben vor...",
      "✨ Zaubere tolle Rätsel herbei...",
      "🌟 Sammle interessante Fragen...",
      "🎈 Mache alles bereit für dich..."
    ];
    
    const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 bg-gradient-to-br from-primary/5 to-purple-50">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Animated loading icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-purple-500 animate-spin opacity-75"></div>
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  <span className="text-2xl animate-bounce">🎮</span>
                </div>
              </div>
              
              {/* Friendly loading message */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-primary animate-pulse">
                  {randomMessage}
                </h3>
                <p className="text-muted-foreground">
                  Gleich kann es losgehen! 🚀
                </p>
              </div>
              
              {/* Loading dots animation */}
              <div className="flex justify-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              </div>
              
              {/* Progress indication */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state with Template-Bank info
  if (generationError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Template-Bank Fehler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-600">Fehler beim Laden der Fragen: {generationError}</p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                Die Template-Bank konnte keine geeigneten Fragen für Klasse {grade}, Quartal {currentQuarter} 
                im Fach {category} finden. Das deutet auf eine Unterdeckung in der Datenbank hin.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshQuestions} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Erneut versuchen
              </Button>
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Zurück
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-center flex-1">
              {category} - Klasse {grade}
            </CardTitle>
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Zurück
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-lg">
            Bereit für 5 spannende Fragen? 🎯
          </p>
          <p className="text-sm text-muted-foreground">
            Du bekommst verschiedene Fragetypen: Textaufgaben, Multiple-Choice, Zuordnungen und mehr!
          </p>
          
          <Button onClick={startGame} size="lg" className="w-full">
            Spiel starten
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show completion screen when game is finished
  if (gameCompleted && sessionEndTime) {
    const sessionDuration = sessionEndTime - sessionStartTime;
    const timePerTask = settings?.[`${category.toLowerCase()}_seconds_per_task` as keyof typeof settings] as number || 30;
    const achievementBonusMinutes = Math.floor((newAchievements.length * 5) / 60);
    const perfectSessionBonus = score === problems.length ? 2 : 0;
    
    return (
      <GameCompletionScreen
        score={score}
        totalQuestions={problems.length}
        sessionDuration={sessionDuration}
        timePerTask={timePerTask}
        achievementBonusMinutes={achievementBonusMinutes}
        perfectSessionBonus={perfectSessionBonus}
        onContinue={() => {
          const timePerTaskValue = settings?.[`${category.toLowerCase()}_seconds_per_task` as keyof typeof settings] as number || 30;
          const earnedSeconds = score * timePerTaskValue;
          const earnedMinutes = Math.floor(earnedSeconds / 60);
          
          setGameCompleted(false);
          setGameStarted(false);
          
          onComplete(earnedMinutes, category);
        }}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <p className="text-lg">Keine Fragen verfügbar</p>
          <Button onClick={refreshQuestions} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Neue Fragen laden
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Frage {currentQuestionIndex + 1} von {problems.length}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getSourceIcon()}
              <span>{getSourceLabel()}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template-Bank Quality Metrics */}
          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center gap-4 text-sm">
              <span>Qualität: {Math.round(qualityMetrics.averageQuality * 100)}%</span>
              <span>Abdeckung: {Math.round(qualityMetrics.templateCoverage * 100)}%</span>
              <span>Vielfalt: {Math.round(qualityMetrics.domainDiversity * 100)}%</span>
              <span>Quartal: {currentQuarter}</span>
            </div>
          </div>

          <GameProgress 
            currentQuestion={currentQuestionIndex + 1} 
            totalQuestions={problems.length} 
            score={score} 
            startTime={sessionStartTime}
            isActive={!gameCompleted}
          />

          <QuestionRenderer
            question={currentQuestion}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            selectedMultipleChoice={selectedMultipleChoice}
            setSelectedMultipleChoice={setSelectedMultipleChoice}
            selectedWords={selectedWords}
            setSelectedWords={setSelectedWords}
            onWordToggle={(wordIndex: number) => {
              setSelectedWords(prev => 
                prev.includes(wordIndex) 
                  ? prev.filter(i => i !== wordIndex)
                  : [...prev, wordIndex]
              );
            }}
            onMatchingComplete={(isCorrect: boolean) => {
              setFeedback(isCorrect ? 'correct' : 'incorrect');
              if (isCorrect) setScore(prev => prev + 1);
            }}
            currentPlacements={currentPlacements}
            onItemMove={(itemId: string, categoryId: string) => {
              setCurrentPlacements(prev => ({
                ...prev,
                [itemId]: categoryId
              }));
            }}
            feedback={feedback}
          />

          {/* ✅ FIXED: Single feedback component with correct answer display */}
          {feedback && (
            <div className={`p-6 rounded-lg border-2 ${
              feedback === 'correct' 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              <div className="flex items-center justify-center gap-3 mb-3">
                {feedback === 'correct' ? (
                  <Check className="w-8 h-8 text-green-600" />
                ) : (
                  <X className="w-8 h-8 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {feedback === 'correct' ? 'Richtig!' : 'Falsch!'}
                </span>
              </div>
              
              {/* ✅ FIXED: Show actual correct answer for incorrect responses */}
              {feedback === 'incorrect' && (
                <div className="mt-3 p-3 bg-white/50 rounded-md border-l-4 border-green-500">
                  <p className="text-sm font-medium mb-1 text-green-700">Richtige Antwort:</p>
                  {currentQuestion.questionType === 'multiple-choice' ? (
                     <p className="text-sm font-semibold text-green-800">
                       {(() => {
                         const mcQuestion = currentQuestion as any;
                         
                          // Try AnswerCalculator first for reliable calculation
                          if (mcQuestion.template && mcQuestion.params) {
                            const calculationResult = AnswerCalculator.calculateAnswer(
                              mcQuestion.template, 
                              mcQuestion.params,
                             mcQuestion.question
                           );
            if (calculationResult.isValid && (calculationResult.confidence || 0) >= 0.7) {
              return String(calculationResult.answer);
            }
                         }
                         
                         // Fallback to stored answer or options
                         return mcQuestion.options?.[mcQuestion.correctAnswer] || mcQuestion.answer || 'Siehe Erklärung';
                       })()}
                     </p>
                  ) : (
                    <p className="text-sm font-semibold text-green-800">
                      {(currentQuestion as any).answer || 'Siehe Erklärung'}
                    </p>
                  )}
                  <p className="text-xs text-red-600 mt-1">
                    Deine Antwort: {
                      currentQuestion.questionType === 'multiple-choice' 
                        ? (currentQuestion as any).options?.[selectedMultipleChoice || 0]
                        : userAnswer
                    }
                  </p>
                </div>
              )}
              
              {/* Show explanation */}
              {currentQuestion.explanation && (
                <div className="mt-3 p-3 bg-white/50 rounded-md">
                  <p className="text-sm font-medium mb-2">Erklärung:</p>
                  <div className="text-sm space-y-1">
                    {currentQuestion.explanation.split('\n').map((line, index) => (
                      <div key={index}>
                        {line.trim() ? (
                          <p>{line}</p>
                        ) : (
                          <div className="h-1"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowFeedbackDialog(true)}
                  className="flex items-center gap-1"
                >
                  <Flag className="w-4 h-4" />
                  Problem melden
                </Button>
                
                <Button 
                  onClick={handleNextQuestion}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  Weiter
                </Button>
              </div>
            </div>
          )}

          {!feedback && (
            <div className="text-center">
              <Button 
                onClick={() => {
                  let answer: string | number | number[] | Record<string, string>;
                  
                  switch (currentQuestion.questionType) {
                    case 'text-input':
                      answer = userAnswer;
                      break;
                    case 'multiple-choice':
                      answer = selectedMultipleChoice || 0;
                      break;
                    default:
                      answer = userAnswer;
                  }
                  
                  handleAnswerSubmit(answer);
                }}
                disabled={
                  (currentQuestion.questionType === 'text-input' && !userAnswer.trim()) ||
                  (currentQuestion.questionType === 'multiple-choice' && selectedMultipleChoice === null)
                }
                size="lg"
                className="w-full"
              >
                Antwort abgeben
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <QuestionFeedbackDialog
        isOpen={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        onSubmit={async (feedbackType: string, details?: string) => {
          if (!currentQuestion || !user) return;

          try {
            await supabase.from('question_feedback').insert({
              user_id: user.id,
              question_content: currentQuestion.question,
              question_type: currentQuestion.questionType,
              feedback_type: feedbackType,
              feedback_details: details,
              category: category.toLowerCase(),
              grade
            });
          } catch (error) {
            console.error('Error submitting feedback:', error);
          }
          
          setShowFeedbackDialog(false);
        }}
      />

      <AchievementAnimation
        achievements={newAchievements}
        isVisible={showAchievements}
        onClose={() => {
          setShowAchievements(false);
          setNewAchievements([]);
        }}
      />
    </div>
  );
}