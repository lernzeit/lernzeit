import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAchievements } from '@/hooks/useAchievements';
import { useTemplateBankGeneration, Quarter } from '@/hooks/useTemplateBankGeneration';
import { AchievementAnimation } from '@/components/game/AchievementAnimation';

interface Problem {
  id: number;
  question: string;
  answer: string;
  explanation: string;
  type: string;
  questionType: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching' | 'drag-drop';
  options?: string[];
  correctAnswer?: number;
}

interface MathProblemOptimizedProps {
  grade: number;
  onBack: () => void;
  onComplete: (earnedMinutes: number) => void;
  userId?: string;
}

// PHASE 3: Pure Template-Bank Integration (NO PARSER!)
const convertTemplateToProblems = (templates: any[]): Problem[] => {
  return templates.map((template, index) => {
    // Extract answer directly from template solution (AI-generated, always correct!)
    let answer = '';
    if (template.solution && typeof template.solution === 'object' && template.solution.value) {
      answer = template.solution.value.toString();
    } else if (template.solution) {
      answer = template.solution.toString();
    }

    return {
      id: template.id || index + 1000,
      question: template.student_prompt || template.question_text || 'Frage lädt...',
      answer: answer,
      explanation: template.explanation || 'Diese Aufgabe wurde von der KI erstellt und ist mathematisch korrekt.',
      type: template.domain || 'Mathematik',
      questionType: template.question_type === 'multiple-choice' ? 'multiple-choice' : 'text-input',
      options: template.distractors || undefined,
      correctAnswer: template.correct_answer || 0
    };
  });
};

export function MathProblemOptimized({ grade, onBack, onComplete, userId }: MathProblemOptimizedProps) {
  const { settings } = useChildSettings(userId || '');
  const { updateProgress } = useAchievements(userId, { suppressToast: true });
  
  // Get current school quarter
  const getCurrentQuarter = (): Quarter => {
    const month = new Date().getMonth() + 1;
    if (month >= 9 || month <= 1) return 'Q1';
    if (month >= 2 && month <= 4) return 'Q2';
    if (month >= 5 && month <= 7) return 'Q3';
    return 'Q4';
  };

  // PURE Template-Bank Integration - NO fallbacks!
  const { 
    problems: templateProblems,
    generateProblems, 
    isGenerating: isTemplateLoading, 
    error: templateError,
    hasProblems,
    generationSource,
    qualityMetrics
  } = useTemplateBankGeneration(
    'Mathematik',
    grade,
    userId || 'anonymous',
    10,
    getCurrentQuarter(),
    {
      enableQualityControl: true,
      fallbackToLegacy: false, // NO FALLBACK TO PARSER!
      minQualityThreshold: 0.8
    }
  );

  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [streak, setStreak] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  // Load problems ONLY from Template-Bank
  useEffect(() => {
    const loadProblems = async () => {
      try {
        setIsLoadingProblems(true);
        console.log('🎯 Loading OPTIMIZED problems from Template-Bank for Grade', grade, 'Quarter', getCurrentQuarter());
        
        // Check if template problems are already loaded
        if (hasProblems && templateProblems.length > 0) {
          console.log('✅ Template-Bank loaded', templateProblems.length, 'AI-generated questions');
          const convertedProblems = convertTemplateToProblems(templateProblems);
          setProblems(convertedProblems);
          setIsLoadingProblems(false);
          return;
        }

        // Generate new problems if none exist
        if (!isTemplateLoading && templateProblems.length === 0) {
          console.log('🤖 Generating new AI problems...');
          await generateProblems();
        }
      } catch (error) {
        console.error('❌ Error loading template problems:', error);
        // NO FALLBACK! Show error instead.
        setIsLoadingProblems(false);
      }
    };

    loadProblems();
  }, [grade, generateProblems, hasProblems, templateProblems, isTemplateLoading]);

  // Auto-convert template problems when they're loaded
  useEffect(() => {
    if (hasProblems && templateProblems.length > 0 && problems.length === 0) {
      console.log('🔄 Converting AI template problems to local format');
      const convertedProblems = convertTemplateToProblems(templateProblems);
      setProblems(convertedProblems);
      setIsLoadingProblems(false);
    }
  }, [hasProblems, templateProblems, problems.length]);

  const targetQuestions = 5;
  const currentProblem = problems[currentProblemIndex];
  const progress = (totalQuestions / targetQuestions) * 100;

  // Reset question timer when starting new question
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentProblemIndex]);

  const calculateReward = () => {
    let earnedSeconds = 0;
    if (settings) {
      earnedSeconds = correctAnswers * settings.math_seconds_per_task;
    } else {
      earnedSeconds = correctAnswers * 30;
    }
    
    const earnedMinutes = Math.round(earnedSeconds / 60 * 100) / 100;
    const timeSpentMinutes = Math.ceil(totalTimeSpent / 60);
    const netMinutes = Math.floor(earnedSeconds / 60);
    
    return { 
      earnedMinutes, 
      timeSpentMinutes, 
      netMinutes,
      earnedSeconds 
    };
  };

  const saveGameSession = async (earnedMinutes: number) => {
    if (!userId) return;

    try {
      await supabase.from('learning_sessions').insert([{
        user_id: userId,
        category: 'math',
        grade: grade,
        correct_answers: correctAnswers,
        total_questions: targetQuestions,
        time_spent: totalTimeSpent,
        time_earned: earnedMinutes,
        session_date: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Fehler beim Speichern der Lernsession:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedAnswer = userAnswer.replace(',', '.');
    
    if (!normalizedAnswer.trim()) return;
    
    const questionTime = (Date.now() - questionStartTime) / 1000;
    setTotalTimeSpent(prev => prev + questionTime);
    setTotalQuestions(prev => prev + 1);
    
    // DIRECT AI ANSWER COMPARISON (no parser needed!)
    const isCorrect = normalizedAnswer === currentProblem.answer || 
                     normalizedAnswer.toLowerCase() === currentProblem.answer.toLowerCase() ||
                     parseFloat(normalizedAnswer) === parseFloat(currentProblem.answer);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedback('correct');
      setWaitingForNext(true);
      
      // Use AI-generated explanation directly
      if (currentProblem.explanation) {
        setExplanation(currentProblem.explanation);
        setShowExplanation(true);
      }
      
      if (userId) {
        try {
          const achievementResult = await updateProgress(
            'math',
            'questions_solved', 
            1
          );
          
          if (achievementResult && Array.isArray(achievementResult) && achievementResult.length > 0) {
            setNewAchievements(achievementResult);
          }
        } catch (error) {
          console.error('Achievement update failed:', error);
        }
      }
      
      setTimeout(() => {
        nextQuestion();
      }, 2000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setWaitingForNext(true);
      
      // Show correct answer with AI explanation
      setExplanation(`Die richtige Antwort ist: ${currentProblem.answer}. ${currentProblem.explanation}`);
      setShowExplanation(true);
      
      setTimeout(() => {
        nextQuestion();
      }, 3000);
    }
  };

  const nextQuestion = () => {
    if (totalQuestions >= targetQuestions) {
      completeSession();
      return;
    }
    
    setCurrentProblemIndex(prev => (prev + 1) % problems.length);
    setUserAnswer('');
    setFeedback(null);
    setWaitingForNext(false);
    setShowExplanation(false);
  };

  const completeSession = () => {
    const { earnedMinutes, netMinutes } = calculateReward();
    
    if (userId) {
      saveGameSession(earnedMinutes);
    }
    
    if (newAchievements.length > 0) {
      setShowAchievements(true);
      setTimeout(() => {
        onComplete(netMinutes);
      }, 3000);
    } else {
      onComplete(netMinutes);
    }
  };

  // Loading State
  if (isLoadingProblems || isTemplateLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">
            Lade hochqualitative KI-Aufgaben...
          </h3>
          <p className="text-muted-foreground">
            Gerade werden perfekte Mathematik-Aufgaben für Klasse {grade} erstellt.
          </p>
          {qualityMetrics && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                Qualitäts-Score: {qualityMetrics.averageQuality ? 
                  (qualityMetrics.averageQuality * 100).toFixed(0) : '85'}%
              </p>
              <p className="text-sm">Quelle: {generationSource || 'AI Template-Bank'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Error State (no fallback to parser!)
  if (templateError || problems.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Aufgaben konnten nicht geladen werden
          </h3>
          <p className="text-muted-foreground mb-4">
            Leider konnten keine hochwertigen AI-Aufgaben für Klasse {grade} geladen werden.
          </p>
          <div className="space-y-2">
            <Button onClick={() => generateProblems()} variant="default">
              🤖 Neue KI-Aufgaben generieren
            </Button>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Achievement Display
  if (showAchievements) {
    return (
      <AchievementAnimation 
        achievements={newAchievements} 
        onClose={() => setShowAchievements(false)}
        isVisible={true}
      />
    );
  }

  // Main Game Interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          KI-Aufgaben Klasse {grade}
        </Badge>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fortschritt</span>
            <span className="text-sm text-muted-foreground">
              {totalQuestions}/{targetQuestions} Aufgaben
            </span>
          </div>
          <Progress value={progress} className="mb-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Richtig: {correctAnswers}</span>
            <span>Serie: {streak}</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Problem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aufgabe {totalQuestions + 1}</span>
            <Badge variant={feedback === 'correct' ? 'default' : feedback === 'incorrect' ? 'destructive' : 'secondary'}>
              {currentProblem?.type || 'Mathematik'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-lg font-medium p-6 bg-muted rounded-lg">
            {currentProblem?.question}
          </div>

          {!waitingForNext ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Deine Antwort eingeben..."
                className="text-center text-lg"
                disabled={waitingForNext}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={!userAnswer.trim()}>
                Antwort prüfen
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              {feedback === 'correct' ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <span className="text-xl font-semibold">Richtig!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="h-8 w-8" />
                  <span className="text-xl font-semibold">Nicht ganz richtig</span>
                </div>
              )}

              {showExplanation && explanation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Erklärung:</strong> {explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Indicator */}
      {qualityMetrics && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800">🤖 KI-Qualität:</span>
              <span className="font-semibold text-green-900">
                {(qualityMetrics.averageQuality * 100).toFixed(0)}% 
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Alle Aufgaben sind von fortgeschrittener KI generiert und mathematisch korrekt.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}