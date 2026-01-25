import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAIQuestion, type AIQuestion } from '@/hooks/useAIQuestion';
import { useAIExplanation } from '@/hooks/useAIExplanation';
import { Loader2, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export const LearningGame: React.FC<LearningGameProps> = ({
  grade,
  subject,
  onComplete,
  onBack,
  totalQuestions = 5
}) => {
  const { question, isLoading, error, generateQuestion } = useAIQuestion();
  const { explanation, isLoading: isLoadingExplanation, fetchExplanation, clearExplanation } = useAIExplanation();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime] = useState(Date.now());
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  // Answer states for different question types
  const [userTextAnswer, setUserTextAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [dragDropPlacements, setDragDropPlacements] = useState<Record<string, string[]>>({});
  const [fillBlanks, setFillBlanks] = useState<string[]>([]);

  // Load first question
  useEffect(() => {
    generateQuestion(grade, subject, difficulty);
  }, []);

  // Initialize answer state when question changes
  useEffect(() => {
    if (question) {
      resetAnswerState();
      if (question.questionType === 'SORT' && question.options) {
        setSortOrder([...question.options]);
      }
      if (question.questionType === 'FILL_BLANK' && question.correctAnswer?.blanks) {
        setFillBlanks(new Array(question.correctAnswer.blanks.length).fill(''));
      }
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

    if (correct) {
      setScore(prev => prev + 1);
      // Increase difficulty on correct answers
      if (difficulty === 'easy') setDifficulty('medium');
      else if (difficulty === 'medium' && Math.random() > 0.5) setDifficulty('hard');
      toast.success('Richtig! 🎉');
    } else {
      // Decrease difficulty on wrong answers
      if (difficulty === 'hard') setDifficulty('medium');
      else if (difficulty === 'medium') setDifficulty('easy');
      toast.error('Nicht ganz richtig');
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

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= totalQuestions) {
      // Game complete
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const earnedMinutes = Math.ceil(score * 0.5); // 30 seconds per correct answer
      
      onComplete({
        correct: score,
        total: totalQuestions,
        timeSpent,
        earnedMinutes,
        subject
      });
    } else {
      setCurrentIndex(prev => prev + 1);
      resetAnswerState();
      generateQuestion(grade, subject, difficulty);
    }
  };

  // Move sort item
  const moveSortItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...sortOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setSortOrder(newOrder);
  };

  if (isLoading && !question) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Frage wird erstellt...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-lg mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <Button onClick={() => generateQuestion(grade, subject, difficulty)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Nochmal versuchen
              </Button>
            </div>
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

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Frage {currentIndex + 1} von {totalQuestions}</span>
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
                <CardTitle className="text-xl leading-relaxed">{question.questionText}</CardTitle>
                <Badge variant={difficulty === 'easy' ? 'secondary' : difficulty === 'hard' ? 'destructive' : 'default'}>
                  {difficulty === 'easy' ? '⭐' : difficulty === 'hard' ? '⭐⭐⭐' : '⭐⭐'}
                </Badge>
              </div>
              {question.hint && !hasAnswered && (
                <p className="text-sm text-muted-foreground mt-2">💡 Tipp: {question.hint}</p>
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
                  text={question.questionText}
                  answers={fillBlanks}
                  options={question.options || []}
                  correctAnswers={question.correctAnswer?.blanks || []}
                  hasAnswered={hasAnswered}
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
              <div className="flex gap-3">
                {!hasAnswered ? (
                  <Button 
                    onClick={checkAnswer} 
                    className="flex-1"
                    disabled={!canSubmitAnswer()}
                  >
                    Antwort prüfen
                  </Button>
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Wähle links, dann rechts um zuzuordnen:</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {leftItems.map((item) => (
            <Button
              key={item}
              variant={selectedLeft === item ? 'default' : matches[item] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start",
                hasAnswered && matches[item] && isCorrectMatch(item, matches[item]) && "border-green-500",
                hasAnswered && matches[item] && !isCorrectMatch(item, matches[item]) && "border-red-500"
              )}
              onClick={() => !hasAnswered && setSelectedLeft(item)}
              disabled={hasAnswered}
            >
              {item}
              {matches[item] && <span className="ml-auto text-xs">→ {matches[item]}</span>}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {rightItems.map((item) => (
            <Button
              key={item}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (!hasAnswered && selectedLeft) {
                  onMatch(selectedLeft, item);
                  setSelectedLeft(null);
                }
              }}
              disabled={hasAnswered || !selectedLeft}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FillBlankRenderer: React.FC<{
  text: string;
  answers: string[];
  options: string[];
  correctAnswers: string[];
  hasAnswered: boolean;
  onChange: (index: number, value: string) => void;
}> = ({ text, answers, options, correctAnswers, hasAnswered, onChange }) => {
  const parts = text.split('___');
  
  return (
    <div className="space-y-4">
      <div className="text-lg leading-relaxed">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <Input
                type="text"
                value={answers[index] || ''}
                onChange={(e) => onChange(index, e.target.value)}
                disabled={hasAnswered}
                className={cn(
                  "inline-block w-32 mx-1 h-8",
                  hasAnswered && answers[index]?.toLowerCase().trim() === correctAnswers[index]?.toLowerCase().trim() && "border-green-500",
                  hasAnswered && answers[index]?.toLowerCase().trim() !== correctAnswers[index]?.toLowerCase().trim() && "border-red-500"
                )}
                placeholder="..."
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {options.length > 0 && !hasAnswered && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Wörter:</span>
          {options.map((option) => (
            <Badge key={option} variant="secondary">{option}</Badge>
          ))}
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
