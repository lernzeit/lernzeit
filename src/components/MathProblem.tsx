import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
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
      // Klasse 1: Zahlen 1-20, Addition und Subtraktion
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const isAddition = Math.random() > 0.3; // Mehr Addition für Anfänger
      if (isAddition && a + b <= 20) {
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        return {
          question: `${larger} - ${smaller} = ?`,
          answer: larger - smaller,
          type: 'Subtraktion'
        };
      }
    }
    case 2: {
      // Klasse 2: Zahlen 1-100, Einmaleins 1x1 bis 5x5
      const operations = ['add', 'subtract', 'multiply'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 5) + 1; // 1-5
        const b = Math.floor(Math.random() * 5) + 1; // 1-5
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 50) + 10; // 10-59
        const b = Math.floor(Math.random() * 30) + 5;  // 5-34
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const a = Math.floor(Math.random() * 80) + 20; // 20-99
        const b = Math.floor(Math.random() * 20) + 5;  // 5-24
        return {
          question: `${a} - ${b} = ?`,
          answer: a - b,
          type: 'Subtraktion'
        };
      }
    }
    case 3: {
      // Klasse 3: Einmaleins bis 10x10, Division, größere Zahlen
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 10) + 1; // 1-10
        const b = Math.floor(Math.random() * 10) + 1; // 1-10
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      } else if (operation === 'divide') {
        const answer = Math.floor(Math.random() * 10) + 1; // 1-10
        const divisor = Math.floor(Math.random() * 9) + 2; // 2-10
        return {
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: answer,
          type: 'Division'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 400) + 100; // 100-499
        const b = Math.floor(Math.random() * 200) + 50;  // 50-249
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const a = Math.floor(Math.random() * 500) + 200; // 200-699
        const b = Math.floor(Math.random() * 150) + 25;  // 25-174
        return {
          question: `${a} - ${b} = ?`,
          answer: a - b,
          type: 'Subtraktion'
        };
      }
    }
    case 4: {
      // Klasse 4: Große Zahlen, schwierigere Multiplikation/Division, Brucheinführung
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 25) + 10; // 10-34
        const b = Math.floor(Math.random() * 20) + 5;  // 5-24
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      } else if (operation === 'divide') {
        const divisors = [5, 10, 25, 50, 100];
        const divisor = divisors[Math.floor(Math.random() * divisors.length)];
        const answer = Math.floor(Math.random() * 20) + 5; // 5-24
        return {
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: answer,
          type: 'Division'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 5000) + 1000; // 1000-5999
        const b = Math.floor(Math.random() * 3000) + 500;  // 500-3499
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const a = Math.floor(Math.random() * 8000) + 2000; // 2000-9999
        const b = Math.floor(Math.random() * 1500) + 200;  // 200-1699
        return {
          question: `${a} - ${b} = ?`,
          answer: a - b,
          type: 'Subtraktion'
        };
      }
    }
    case 5: {
      // CURRICULUM-COMPLIANT: Grade 5 Q1 focuses on negative numbers, NOT fractions!
      // Fractions only come in Grade 5 Q2!
      const operations = ['add', 'subtract', 'multiply', 'divide', 'negative'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'negative') {
        const isAddition = Math.random() > 0.5;
        const a = Math.floor(Math.random() * 10) - 5; // -5 bis 4
        const b = Math.floor(Math.random() * 8) - 4; // -4 bis 3
        if (isAddition) {
          return {
            question: `${a} + ${b} = ?`,
            answer: a + b,
            type: 'Negative Zahlen Addition'
          };
        } else {
          return {
            question: `${a} - (${b}) = ?`,
            answer: a - b,
            type: 'Negative Zahlen Subtraktion'
          };
        }
      } else if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 50) + 20; // 20-69
        const b = Math.floor(Math.random() * 30) + 10; // 10-39
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      } else if (operation === 'divide') {
        const divisors = [10, 20, 25, 50, 100];
        const divisor = divisors[Math.floor(Math.random() * divisors.length)];
        const answer = Math.floor(Math.random() * 50) + 10; // 10-59
        return {
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: answer,
          type: 'Division'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 50000) + 10000; // 10000-59999
        const b = Math.floor(Math.random() * 20000) + 5000;  // 5000-24999
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const a = Math.floor(Math.random() * 80000) + 20000; // 20000-99999
        const b = Math.floor(Math.random() * 15000) + 2000;  // 2000-16999
        return {
          question: `${a} - ${b} = ?`,
          answer: a - b,
          type: 'Subtraktion'
        };
      }
    }
    case 6: {
      // Klasse 6: Negative Zahlen, Brüche, Algebra-Basics
      const operations = ['add', 'subtract', 'multiply', 'divide', 'negative', 'fraction'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      // PHASE 4: Remove curriculum-inappropriate content for Grade 5
      // Grade 5 Q1 should focus on negative numbers, NOT fractions 
      if (operation === 'negative') {
        const isAddition = Math.random() > 0.5;
        const a = Math.floor(Math.random() * 10) - 5; // -5 bis 4
        const b = Math.floor(Math.random() * 8) - 4; // -4 bis 3
        if (isAddition) {
          return {
            question: `${a} + ${b} = ?`,
            answer: a + b,
            type: 'Negative Zahlen Addition'
          };
        } else {
          return {
            question: `${a} - (${b}) = ?`,
            answer: a - b,
            type: 'Negative Zahlen Subtraktion'
          };
        }
      } else if (operation === 'multiply') {
        const a = Math.floor(Math.random() * 80) + 40; // 40-119
        const b = Math.floor(Math.random() * 40) + 20; // 20-59
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      } else if (operation === 'divide') {
        const divisors = [12, 15, 20, 24, 30, 40, 50];
        const divisor = divisors[Math.floor(Math.random() * divisors.length)];
        const answer = Math.floor(Math.random() * 25) + 15; // 15-39
        return {
          question: `${answer * divisor} ÷ ${divisor} = ?`,
          answer: answer,
          type: 'Division'
        };
      } else if (operation === 'add') {
        const a = Math.floor(Math.random() * 100000) + 50000; // 50000-149999
        const b = Math.floor(Math.random() * 50000) + 10000;  // 10000-59999
        return {
          question: `${a} + ${b} = ?`,
          answer: a + b,
          type: 'Addition'
        };
      } else {
        const a = Math.floor(Math.random() * 150000) + 50000; // 50000-199999
        const b = Math.floor(Math.random() * 30000) + 5000;   // 5000-34999
        return {
          question: `${a} - ${b} = ?`,
          answer: a - b,
          type: 'Subtraktion'
        };
      }
    }
    default: {
      // Klasse 7+: Erweiterte Algebra, Gleichungen, Geometrie
      const operations = ['algebra', 'multiply', 'square', 'percentage'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      if (operation === 'algebra') {
        // Einfache Gleichungen: x + a = b
        const a = Math.floor(Math.random() * 50) + 10; // 10-59
        const x = Math.floor(Math.random() * 30) + 5;  // 5-34
        const b = x + a;
        return {
          question: `x + ${a} = ${b}, x = ?`,
          answer: x,
          type: 'Algebra'
        };
      } else if (operation === 'square') {
        const base = Math.floor(Math.random() * 15) + 5; // 5-19
        return {
          question: `${base}² = ?`,
          answer: base * base,
          type: 'Quadratzahl'
        };
      } else if (operation === 'percentage') {
        const base = [100, 200, 500, 1000][Math.floor(Math.random() * 4)];
        const percent = [10, 20, 25, 50, 75][Math.floor(Math.random() * 5)];
        return {
          question: `${percent}% von ${base} = ?`,
          answer: (base * percent) / 100,
          type: 'Prozentrechnung'
        };
      } else {
        const a = Math.floor(Math.random() * 200) + 50; // 50-249
        const b = Math.floor(Math.random() * 100) + 25; // 25-124
        return {
          question: `${a} × ${b} = ?`,
          answer: a * b,
          type: 'Multiplikation'
        };
      }
    }
  }
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

export function MathProblem({ grade, onBack, onComplete, userId }: MathProblemProps) {
  const { settings } = useChildSettings(userId || '');
  const { updateProgress } = useAchievements(userId, { suppressToast: true });
  
  const [problems] = useState<Problem[]>(() => generateUniqueProblems(grade, 10));
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

  const fetchExplanation = async (problem: Problem) => {
    try {
      const { data, error } = await supabase.functions.invoke('explain-answer', {
        body: {
          question: problem.question,
          answer: problem.answer.toString(),
          grade: grade,
          subject: 'mathematik'
        }
      });
      
      if (data?.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanation(`Super! Die richtige Antwort ist ${problem.answer}. ${
          grade <= 2 
            ? 'Du kannst dir die Zahlen vorstellen oder an den Fingern abzählen.' 
            : grade <= 4 
            ? 'Bei solchen Aufgaben gehst du Schritt für Schritt vor und rechnest sorgfältig.' 
            : 'Du findest das Ergebnis, indem du die Aufgabe strukturiert angehst.'
        }`);
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      setExplanation(`Richtig! Das Ergebnis ist ${problem.answer}. Gut gemacht!`);
    }
  };

  const targetQuestions = 5;
  const currentProblem = problems[currentProblemIndex];
  const progress = (totalQuestions / targetQuestions) * 100;

  // Reset question timer when starting new question
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentProblemIndex]);

  const calculateReward = () => {
    // Calculate based on child settings for math
    let earnedSeconds = 0;
    if (settings) {
      earnedSeconds = correctAnswers * settings.math_seconds_per_task;
    } else {
      earnedSeconds = correctAnswers * 30; // fallback
    }
    
    const earnedMinutes = Math.round(earnedSeconds / 60 * 100) / 100;
    const timeSpentMinutes = Math.ceil(totalTimeSpent / 60);
    const netMinutes = Math.floor(earnedSeconds / 60); // Store whole minutes only
    
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
    // Support both comma and dot as decimal separator
    const normalizedAnswer = userAnswer.replace(',', '.');
    const answer = parseFloat(normalizedAnswer);
    
    if (isNaN(answer)) return;
    
    const questionTime = (Date.now() - questionStartTime) / 1000;
    setTotalTimeSpent(prev => prev + questionTime);
    setTotalQuestions(prev => prev + 1);
    
    if (answer === currentProblem.answer) {
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedback('correct');
      setWaitingForNext(true);
      
      // PHASE 4: Fetch AI explanation for correct answers
      await fetchExplanation(currentProblem);
      setShowExplanation(true);
      
      // Update achievements
      if (userId) {
        try {
          console.log('🎯 Calling updateProgress with:', {
            category: 'math',
            type: 'questions_solved',
            increment: 1
          });
          
          const achievementResult = await updateProgress(
            'math',
            'questions_solved', 
            1
          );
          
          console.log('🏆 Achievement result:', achievementResult);
          
          if (achievementResult && achievementResult.length > 0) {
            setNewAchievements(achievementResult);
            setShowAchievements(true);
          }
        } catch (error) {
          console.error('Error updating achievements:', error);
        }
      }
      
      if (totalQuestions + 1 >= targetQuestions) {
        // Session beendet - sofortiger Abschluss ohne Verzögerung
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