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

interface MathProblemProps {
  grade: number;
  onBack: () => void;
  onComplete: (earnedMinutes: number) => void;
  userId?: string;
}

const generateProblem = (grade: number): Problem => {
  switch (grade) {
    case 1: {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const isAddition = Math.random() > 0.3;
      if (isAddition && a + b <= 20) {
        return {
          id: 1,
          question: `${a} + ${b} = ?`,
          answer: String(a + b),
          explanation: `Du addierst ${a} und ${b}`,
          type: 'Addition',
          questionType: 'text-input'
        };
      } else {
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        return {
          id: 2,
          question: `${larger} - ${smaller} = ?`,
          answer: String(larger - smaller),
          explanation: `Du subtrahierst ${smaller} von ${larger}`,
          type: 'Subtraktion',
          questionType: 'text-input'
        };
      }
    }
    case 2: {
      const operations = ['add', 'subtract', 'multiply'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 5) + 1;
        return {
          id: 3,
          question: `${a} × ${b} = ?`,
          answer: String(a * b),
          explanation: `${a} mal ${b} ist ${a * b}`,
          type: 'Multiplikation',
          questionType: 'text-input'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 50) + 10;
        const b = Math.floor(Math.random() * 30) + 5;
        return {
          id: 4,
          question: `${a} + ${b} = ?`,
          answer: String(a + b),
          explanation: `Du addierst ${a} und ${b}`,
          type: 'Addition',
          questionType: 'text-input'
        };
      } else {
        const a = Math.floor(Math.random() * 80) + 20;
        const b = Math.floor(Math.random() * 20) + 5;
        return {
          id: 5,
          question: `${a} - ${b} = ?`,
          answer: String(a - b),
          explanation: `Du subtrahierst ${b} von ${a}`,
          type: 'Subtraktion',
          questionType: 'text-input'
        };
      }
    }
    case 3: {
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        return {
          id: 6,
          question: `${a} × ${b} = ?`,
          answer: String(a * b),
          explanation: `${a} mal ${b} ist ${a * b}`,
          type: 'Multiplikation',
          questionType: 'text-input'
        };
      } else if (operation === 'divide') {
        const answer = Math.floor(Math.random() * 10) + 1;
        const divisor = Math.floor(Math.random() * 9) + 2;
        return {
          id: 7,
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: String(answer),
          explanation: `${answer * divisor} geteilt durch ${divisor} ist ${answer}`,
          type: 'Division',
          questionType: 'text-input'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 400) + 100;
        const b = Math.floor(Math.random() * 200) + 50;
        return {
          id: 8,
          question: `${a} + ${b} = ?`,
          answer: String(a + b),
          explanation: `Du addierst ${a} und ${b}`,
          type: 'Addition',
          questionType: 'text-input'
        };
      } else {
        const a = Math.floor(Math.random() * 500) + 200;
        const b = Math.floor(Math.random() * 150) + 25;
        return {
          id: 9,
          question: `${a} - ${b} = ?`,
          answer: String(a - b),
          explanation: `Du subtrahierst ${b} von ${a}`,
          type: 'Subtraktion',
          questionType: 'text-input'
        };
      }
    }
    case 4: {
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 25) + 10;
        const b = Math.floor(Math.random() * 20) + 5;
        return {
          id: 10,
          question: `${a} × ${b} = ?`,
          answer: String(a * b),
          explanation: `${a} mal ${b} ist ${a * b}`,
          type: 'Multiplikation',
          questionType: 'text-input'
        };
      } else if (operation === 'divide') {
        const divisors = [5, 10, 25, 50, 100];
        const divisor = divisors[Math.floor(Math.random() * divisors.length)];
        const answer = Math.floor(Math.random() * 20) + 5;
        return {
          id: 11,
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: String(answer),
          explanation: `${answer * divisor} geteilt durch ${divisor} ist ${answer}`,
          type: 'Division',
          questionType: 'text-input'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 5000) + 1000;
        const b = Math.floor(Math.random() * 3000) + 500;
        return {
          id: 12,
          question: `${a} + ${b} = ?`,
          answer: String(a + b),
          explanation: `Du addierst ${a} und ${b}`,
          type: 'Addition',
          questionType: 'text-input'
        };
      } else {
        const a = Math.floor(Math.random() * 8000) + 2000;
        const b = Math.floor(Math.random() * 1500) + 200;
        return {
          id: 13,
          question: `${a} - ${b} = ?`,
          answer: String(a - b),
          explanation: `Du subtrahierst ${b} von ${a}`,
          type: 'Subtraktion',
          questionType: 'text-input'
        };
      }
    }
    case 5: {
      // Template-Bank Integration wird verwendet
      const operations = ['add', 'subtract', 'multiply', 'divide', 'negative'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'negative') {
        const isAddition = Math.random() > 0.5;
        const a = Math.floor(Math.random() * 10) - 5;
        const b = Math.floor(Math.random() * 8) - 4;
        if (isAddition) {
          return {
            id: 14,
            question: `${a} + ${b} = ?`,
            answer: String(a + b),
            explanation: `Du addierst ${a} und ${b}`,
            type: 'Negative Zahlen Addition',
            questionType: 'text-input'
          };
        } else {
          return {
            id: 15,
            question: `${a} - (${b}) = ?`,
            answer: String(a - b),
            explanation: `Du subtrahierst ${b} von ${a}`,
            type: 'Negative Zahlen Subtraktion',
            questionType: 'text-input'
          };
        }
      } else {
        // Fallback für andere Operationen
        const a = Math.floor(Math.random() * 50) + 10;
        const b = Math.floor(Math.random() * 30) + 5;
        return {
          id: 16,
          question: `${a} + ${b} = ?`,
          answer: String(a + b),
          explanation: `Du addierst ${a} und ${b}`,
          type: 'Addition',
          questionType: 'text-input'
        };
      }
    }
    default: {
      const operations = ['algebra', 'multiply', 'square', 'percentage'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'algebra') {
        const a = Math.floor(Math.random() * 50) + 10;
        const x = Math.floor(Math.random() * 30) + 5;
        const b = x + a;
        return {
          id: 17,
          question: `x + ${a} = ${b}, x = ?`,
          answer: String(x),
          explanation: `Um x zu finden, rechnest du ${b} - ${a} = ${x}`,
          type: 'Algebra',
          questionType: 'text-input'
        };
      } else if (operation === 'square') {
        const base = Math.floor(Math.random() * 15) + 5;
        return {
          id: 18,
          question: `${base}² = ?`,
          answer: String(base * base),
          explanation: `${base} hoch 2 ist ${base} × ${base} = ${base * base}`,
          type: 'Quadratzahl',
          questionType: 'text-input'
        };
      } else if (operation === 'percentage') {
        const base = [100, 200, 500, 1000][Math.floor(Math.random() * 4)];
        const percent = [10, 20, 25, 50, 75][Math.floor(Math.random() * 5)];
        const result = (base * percent) / 100;
        return {
          id: 19,
          question: `${percent}% von ${base} = ?`,
          answer: String(result),
          explanation: `${percent}% von ${base} ist (${base} × ${percent}) ÷ 100 = ${result}`,
          type: 'Prozentrechnung',
          questionType: 'text-input'
        };
      } else {
        const a = Math.floor(Math.random() * 200) + 50;
        const b = Math.floor(Math.random() * 100) + 25;
        return {
          id: 20,
          question: `${a} × ${b} = ?`,
          answer: String(a * b),
          explanation: `${a} mal ${b} ist ${a * b}`,
          type: 'Multiplikation',
          questionType: 'text-input'
        };
      }
    }
  }
};

// PHASE 3: Template-Bank Integration
const convertTemplateToProblems = (templates: any[]): Problem[] => {
  return templates.map((template, index) => ({
    id: template.id || index + 1000,
    question: template.question_text || 'Frage lädt...',
    answer: template.solution?.value || '0',
    explanation: template.explanation || 'Erklärung wird geladen...',
    type: template.domain || 'Mathematik',
    questionType: 'text-input' as const,
    options: template.options || undefined,
    correctAnswer: template.correct_answer || undefined
  }));
};

const generateUniqueProblems = (grade: number, count: number = 10): Problem[] => {
  const problems: Problem[] = [];
  const seenQuestions = new Set<string>();
  
  let attempts = 0;
  while (problems.length < count && attempts < count * 3) {
    const problem = generateProblem(grade);
    if (!seenQuestions.has(problem.question)) {
      seenQuestions.add(problem.question);
      problems.push(problem);
    }
    attempts++;
  }
  
  return problems;
};

// DEPRECATED: Use MathProblemOptimized instead!
// This component will be phased out in favor of pure AI-generated questions
export function MathProblem({ grade, onBack, onComplete, userId }: MathProblemProps) {
  const { settings } = useChildSettings(userId || '');
  const { updateProgress } = useAchievements(userId, { suppressToast: true });
  
  // PHASE 3: Template-Bank Integration
  const getCurrentQuarter = (): Quarter => {
    const month = new Date().getMonth() + 1;
    if (month >= 9 || month <= 1) return 'Q1';
    if (month >= 2 && month <= 4) return 'Q2';
    if (month >= 5 && month <= 7) return 'Q3';
    return 'Q4';
  };

  const { 
    problems: templateProblems,
    generateProblems, 
    isGenerating: isTemplateLoading, 
    error: templateError,
    hasProblems 
  } = useTemplateBankGeneration(
    'Mathematik',
    grade,
    userId || 'anonymous',
    10,
    getCurrentQuarter(),
    {
      enableQualityControl: true,
      fallbackToLegacy: true
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

  // PHASE 3: Load problems from Template-Bank on component mount
  useEffect(() => {
    const loadProblems = async () => {
      try {
        setIsLoadingProblems(true);
        console.log('🎯 Loading problems from Template-Bank for Grade', grade, 'Quarter', getCurrentQuarter());
        
        // Check if template problems are already loaded
        if (hasProblems && templateProblems.length > 0) {
          console.log('✅ Template-Bank loaded', templateProblems.length, 'questions');
          const convertedProblems = convertTemplateToProblems(templateProblems);
          setProblems(convertedProblems);
          setIsLoadingProblems(false);
          return;
        }

        // If no template problems, generate them
        if (!isTemplateLoading && templateProblems.length === 0) {
          await generateProblems();
        }
      } catch (error) {
        console.error('❌ Error loading template problems:', error);
        const fallbackProblems = generateUniqueProblems(grade, 10);
        setProblems(fallbackProblems);
        setIsLoadingProblems(false);
      }
    };

    loadProblems();
  }, [grade, generateProblems, hasProblems, templateProblems, isTemplateLoading]);

  // Auto-convert template problems when they're loaded
  useEffect(() => {
    if (hasProblems && templateProblems.length > 0 && problems.length === 0) {
      console.log('🔄 Converting template problems to local format');
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
    const answer = parseFloat(normalizedAnswer);
    
    if (isNaN(answer)) return;
    
    const questionTime = (Date.now() - questionStartTime) / 1000;
    setTotalTimeSpent(prev => prev + questionTime);
    setTotalQuestions(prev => prev + 1);
    
    // PHASE 1: Use answer directly from template (string comparison)
    const isCorrect = normalizedAnswer === currentProblem.answer || 
                     answer.toString() === currentProblem.answer ||
                     Math.abs(answer - parseFloat(currentProblem.answer)) < 0.001;
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedback('correct');
      setWaitingForNext(true);
      
      // PHASE 1: Use explanation directly from template
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
          
          if (achievementResult && achievementResult.length > 0) {
            setNewAchievements(achievementResult);
            setShowAchievements(true);
          }
        } catch (error) {
          console.error('Error updating achievements:', error);
        }
      }
      
      if (totalQuestions + 1 >= targetQuestions) {
        const { netMinutes } = calculateReward();
        await saveGameSession(netMinutes);
        onComplete(netMinutes);
        return;
      }
    } else {
      setStreak(0);
      setFeedback('incorrect');
      setWaitingForNext(true);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setWaitingForNext(false);
    setCurrentProblemIndex(prev => (prev + 1) % problems.length);
    setUserAnswer('');
    setShowExplanation(false);
    setExplanation('');
  };

  // Loading state
  if (isLoadingProblems || problems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-xl font-bold mb-4">Lade Aufgaben...</h2>
            <p className="text-muted-foreground">
              Template-Bank wird abgerufen für Klasse {grade}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalQuestions >= targetQuestions) {
    const { earnedMinutes, timeSpentMinutes, netMinutes, earnedSeconds } = calculateReward();
    
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4 animate-celebrate">🎉</div>
            <h2 className="text-2xl font-bold text-success mb-4">
              Session beendet!
            </h2>
            <p className="text-muted-foreground mb-6">
              Du hast {correctAnswers} von {targetQuestions} Aufgaben richtig gelöst!
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Verdient</div>
                <div className="text-lg font-bold text-primary">
                  +{earnedSeconds}s ({correctAnswers} × {settings?.math_seconds_per_task || 30}s)
                </div>
              </div>
              
              <div className="bg-destructive/10 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Benötigte Zeit</div>
                <div className="text-lg font-bold text-destructive">
                  -{timeSpentMinutes} Min
                </div>
              </div>
              
              <div className="bg-gradient-success text-success-foreground p-4 rounded-lg">
                <div className="text-sm opacity-90">Netto Handyzeit</div>
                <div className="text-2xl font-bold">
                  {netMinutes > 0 ? `+${netMinutes}` : '0'} Minuten
                </div>
              </div>
            </div>
            
            <Button onClick={onBack} variant="default" className="w-full">
              Zurück zur Auswahl
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}
            </Badge>
            
            {streak > 0 && (
              <Badge variant="default" className="flex items-center gap-2 bg-gradient-accent">
                <Star className="w-4 h-4" />
                {streak}x Streak!
              </Badge>
            )}
          </div>
        </div>

        {/* Reward Info */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Verdient: <strong className="text-primary">{correctAnswers * 2} Min</strong></span>
              <span>Zeit: <strong className="text-destructive">{Math.ceil((totalTimeSpent + (Date.now() - questionStartTime) / 1000) / 60)} Min</strong></span>
              <span>Netto: <strong className="text-success">{Math.max(0, correctAnswers * 2 - Math.ceil((totalTimeSpent + (Date.now() - questionStartTime) / 1000) / 60))} Min</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Fortschritt</span>
              <span className="text-sm text-muted-foreground">
                {totalQuestions} / {targetQuestions} Aufgaben
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Problem Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-center">
              <Badge variant="outline" className="mb-4">
                Klasse {grade} • {currentProblem?.type || 'Aufgabe'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold mb-6 text-foreground">
                {currentProblem?.question || 'Lade...'}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Deine Antwort..."
                  className="text-center text-2xl h-16 text-lg"
                  autoFocus
                  disabled={feedback !== null}
                />
                
                 {!waitingForNext ? (
                   <Button 
                     type="submit" 
                     variant="game" 
                     size="lg" 
                     className="w-full h-14 text-lg"
                     disabled={!userAnswer || feedback !== null}
                   >
                     Antwort prüfen
                   </Button>
                 ) : (
                   <Button 
                     type="button"
                     variant="default" 
                     size="lg" 
                     className="w-full h-14 text-lg"
                     onClick={handleNext}
                   >
                     Weiter
                   </Button>
                 )}
              </form>
            </div>

            {showExplanation && explanation && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-primary mb-2">Erklärung:</h3>
                <p className="text-sm leading-relaxed">{explanation}</p>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`text-center p-4 rounded-lg ${
                feedback === 'correct' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                <div className="flex items-center justify-center gap-2 text-xl mb-2">
                  {feedback === 'correct' ? (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Richtig! +2 Minuten
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6" />
                      Falsch! Die richtige Antwort ist {currentProblem?.answer}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Richtig</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{totalQuestions - correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Falsch</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">{streak}</div>
              <div className="text-sm text-muted-foreground">Streak</div>
            </CardContent>
          </Card>
        </div>

        <AchievementAnimation
          achievements={newAchievements}
          isVisible={showAchievements}
          onClose={() => {
            setShowAchievements(false);
            setNewAchievements([]);
          }}
        />
      </div>
    </div>
  );
}