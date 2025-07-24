import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useScreenTimeLimit } from '@/hooks/useScreenTimeLimit';
import { useAchievements, NewAchievement } from '@/hooks/useAchievements';
import { AchievementPopup } from '@/components/AchievementPopup';
import { useSimpleQuestionGeneration } from '@/hooks/useSimpleQuestionGeneration';
import { GameProgress } from '@/components/game/GameProgress';
import { QuestionRenderer } from '@/components/game/QuestionRenderer';
import { GameFeedback } from '@/components/game/GameFeedback';

interface CategoryMathProblemProps {
  category: string;
  grade: number;
  onComplete: (timeEarned: number, category: string) => void;
  onBack: () => void;
  userId: string;
}

export function CategoryMathProblem({ category, grade, onComplete, onBack, userId }: CategoryMathProblemProps) {
  const [currentProblem, setCurrentProblem] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedMultipleChoice, setSelectedMultipleChoice] = useState<number | null>(null);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([]);
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const [isQuestionComplete, setIsQuestionComplete] = useState(false);

  const { toast } = useToast();
  const { settings } = useChildSettings(userId);
  const { canEarnMoreTime } = useScreenTimeLimit(userId);
  const { updateProgress } = useAchievements(userId);

  const totalQuestions = 5;
  const { 
    problems, 
    isGenerating,
    generationSource,
    sessionId,
    generateProblems 
  } = useSimpleQuestionGeneration(category, grade, userId, totalQuestions);

  // Timer effect
  useEffect(() => {
    if (!gameStarted) return;
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStarted]);

  // Initialize game
  useEffect(() => {
    if (problems.length === 0 && !isGenerating && !gameStarted) {
      console.log('🎮 Initializing simple game...');
      generateProblems();
    } else if (problems.length > 0 && !gameStarted) {
      console.log('🎮 Starting game with problems...');
      setGameStarted(true);
    }
  }, [problems.length, isGenerating, gameStarted, generateProblems]);

  const resetAnswerState = useCallback(() => {
    setUserAnswer('');
    setSelectedMultipleChoice(null);
    setSelectedWords([]);
    setIsQuestionComplete(false);
  }, []);

  const handleWordToggle = useCallback((wordIndex: number) => {
    setSelectedWords(prev => 
      prev.includes(wordIndex) 
        ? prev.filter(i => i !== wordIndex)
        : [...prev, wordIndex]
    );
  }, []);

  const handleMatchingComplete = useCallback((isCorrect: boolean) => {
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsQuestionComplete(true);
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (currentProblem + 1 >= totalQuestions) {
      completeGame();
    } else {
      setCurrentProblem(prev => prev + 1);
      resetAnswerState();
      setFeedback(null);
    }
  }, [currentProblem, totalQuestions, resetAnswerState]);

  const checkAnswer = useCallback(() => {
    if (!problems[currentProblem]) return;

    const problem = problems[currentProblem];
    let isCorrect = false;

    switch (problem.questionType) {
      case 'multiple-choice':
        isCorrect = selectedMultipleChoice === problem.correctAnswer;
        break;
        
      case 'word-selection':
        const correctWordIndices = problem.selectableWords
          .filter(word => word.isCorrect)
          .map(word => word.index);
        
        const sortedSelected = [...selectedWords].sort((a, b) => a - b);
        const sortedCorrect = [...correctWordIndices].sort((a, b) => a - b);
        
        isCorrect = sortedSelected.length === sortedCorrect.length &&
                   sortedSelected.every((index, i) => index === sortedCorrect[i]);
        break;
        
      case 'text-input':
      default:
        if (problem.questionType === 'text-input') {
          const userValue = parseFloat(userAnswer.trim());
          const correctValue = typeof problem.answer === 'number' ? problem.answer : parseFloat(problem.answer.toString());
          isCorrect = typeof problem.answer === 'number' 
            ? Math.abs(userValue - correctValue) < 0.01
            : userAnswer.trim().toLowerCase() === problem.answer.toString().toLowerCase();
        }
        break;
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsQuestionComplete(true);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
  }, [currentProblem, problems, selectedMultipleChoice, selectedWords, userAnswer]);

  const completeGame = useCallback(async () => {
    const categoryMapping: { [key: string]: keyof typeof settings } = {
      'Mathematik': 'math_seconds_per_task',
      'Deutsch': 'german_seconds_per_task',
      'Englisch': 'english_seconds_per_task',
      'Geographie': 'geography_seconds_per_task',
      'Geschichte': 'history_seconds_per_task',
      'Physik': 'physics_seconds_per_task',
      'Biologie': 'biology_seconds_per_task',
      'Chemie': 'chemistry_seconds_per_task',
      'Latein': 'latin_seconds_per_task'
    };

    const categoryToDbMapping: { [key: string]: string } = {
      'Mathematik': 'math',
      'Deutsch': 'german',
      'Englisch': 'english',
      'Geographie': 'geography',
      'Geschichte': 'history',
      'Physik': 'physics',
      'Biologie': 'biology',
      'Chemie': 'chemistry',
      'Latein': 'latin'
    };

    const secondsPerTask = settings?.[categoryMapping[category]] || 30;
    let timeEarned = 0;

    if (canEarnMoreTime) {
      const theoreticalTimeEarned = correctAnswers * secondsPerTask;
      timeEarned = Math.max(0, theoreticalTimeEarned - timeElapsed);
    }

    try {
      const { error } = await supabase.from('learning_sessions').insert({
        user_id: userId,
        category: categoryToDbMapping[category] || category.toLowerCase(),
        grade: grade,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        time_spent: timeElapsed,
        time_earned: timeEarned,
      });

      if (error) throw error;

      await updateAchievements();
      onComplete(timeEarned, category);
    } catch (error: any) {
      console.error('Fehler beim Speichern der Lernsession:', error);
      toast({
        title: "Fehler",
        description: "Die Lernsession konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  }, [correctAnswers, timeElapsed, settings, category, grade, totalQuestions, canEarnMoreTime, userId, toast, onComplete]);

  const updateAchievements = useCallback(async () => {
    const categoryMap: { [key: string]: string } = {
      'Mathematik': 'math',
      'Deutsch': 'german',
      'Englisch': 'english',
      'Geographie': 'geography',
      'Geschichte': 'history',
      'Physik': 'physics',
      'Biologie': 'biology',
      'Chemie': 'chemistry',
      'Latein': 'latin'
    };

    const achievementCategory = categoryMap[category] || 'general';

    try {
      const achievements: NewAchievement[] = [];
      const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      const averageTimePerQuestion = totalQuestions > 0 ? timeElapsed / totalQuestions : 0;

      const dailyAchievements = await updateProgress('general', 'daily_activity', 1);
      achievements.push(...dailyAchievements);

      for (let i = 0; i < totalQuestions; i++) {
        const isCorrect = i < correctAnswers;
        
        const accuracyAchievements = await updateProgress(
          'general', 
          'accuracy_streak', 
          1, 
          isCorrect, 
          false, 
          averageTimePerQuestion
        );
        achievements.push(...accuracyAchievements);

        if (isCorrect) {
          const efficiencyAchievements = await updateProgress(
            'general', 
            'learning_efficiency', 
            1, 
            true, 
            false, 
            averageTimePerQuestion
          );
          achievements.push(...efficiencyAchievements);
        }

        const masteryAchievements = await updateProgress(
          achievementCategory, 
          'subject_mastery', 
          1, 
          isCorrect, 
          false, 
          averageTimePerQuestion
        );
        achievements.push(...masteryAchievements);
      }

      if (achievements.length > 0) {
        setNewAchievements(achievements);
        setShowAchievementPopup(true);
      }
    } catch (error) {
      console.error('Error updating achievements:', error);
    }
  }, [category, correctAnswers, timeElapsed, totalQuestions, updateProgress]);

  const canSubmit = useCallback(() => {
    const currentQuestionData = problems[currentProblem];
    if (!currentQuestionData) return false;

    switch (currentQuestionData.questionType) {
      case 'multiple-choice':
        return selectedMultipleChoice !== null;
      case 'word-selection':
        return selectedWords.length > 0;
      case 'matching':
        return false;
      case 'text-input':
      default:
        return userAnswer.trim() !== '';
    }
  }, [currentProblem, problems, selectedMultipleChoice, selectedWords, userAnswer]);

  const currentQuestionData = problems[currentProblem];

  if (isGenerating || !currentQuestionData || !gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Aufgaben werden erstellt...</p>
            <p className="text-sm text-muted-foreground mt-2">
              System: {generationSource === 'ai' ? 'KI-Generierung' : 'Vereinfachte Generierung'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {showAchievementPopup && (
        <AchievementPopup 
          achievements={newAchievements}
          onClose={() => setShowAchievementPopup(false)}
        />
      )}

      <div className="min-h-screen bg-gradient-bg p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">{category} - Klasse {grade}</CardTitle>
                <GameProgress 
                  currentProblem={currentProblem}
                  totalQuestions={totalQuestions}
                  timeElapsed={timeElapsed}
                  feedback={feedback}
                />
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-center text-lg">
                Aufgabe {currentProblem + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <QuestionRenderer
                question={currentQuestionData}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                selectedMultipleChoice={selectedMultipleChoice}
                setSelectedMultipleChoice={setSelectedMultipleChoice}
                selectedWords={selectedWords}
                setSelectedWords={setSelectedWords}
                onWordToggle={handleWordToggle}
                onMatchingComplete={handleMatchingComplete}
                feedback={feedback}
              />

              <GameFeedback
                feedback={feedback}
                currentQuestion={currentQuestionData}
                currentProblem={currentProblem}
                totalQuestions={totalQuestions}
                onNext={handleNextQuestion}
              />

              {!feedback && currentQuestionData.questionType !== 'matching' && (
                <div className="text-center">
                  <Button 
                    onClick={checkAnswer}
                    disabled={!canSubmit()}
                    className="w-full max-w-sm"
                  >
                    Antwort prüfen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
