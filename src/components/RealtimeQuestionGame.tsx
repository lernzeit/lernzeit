import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lightbulb, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useRealtimeQuestion } from '@/hooks/useRealtimeQuestion';
import { useExplanation } from '@/hooks/useExplanation';
import { toast } from 'sonner';
import { NewMatchingQuestion } from './question-types/NewMatchingQuestion';

interface RealtimeQuestionGameProps {
  topic_id: string;
  grade: number;
  subject: string;
  topic_title: string;
  onCorrectAnswer?: () => void;
  onWrongAnswer?: () => void;
}

export const RealtimeQuestionGame: React.FC<RealtimeQuestionGameProps> = ({
  topic_id,
  grade,
  subject,
  topic_title,
  onCorrectAnswer,
  onWrongAnswer
}) => {
  const { question, isLoading: isLoadingQuestion, generateQuestion } = useRealtimeQuestion();
  const { explanation, isLoading: isLoadingExplanation, fetchExplanation, clearExplanation } = useExplanation();

  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sortedItems, setSortedItems] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Load first question
  useEffect(() => {
    loadNewQuestion();
  }, []);

  const loadNewQuestion = async () => {
    setHasAnswered(false);
    setIsCorrect(false);
    setUserAnswer('');
    setSelectedOption(null);
    setSortedItems([]);
    setMatches({});
    clearExplanation();

    try {
      await generateQuestion(topic_id, grade, subject, topic_title);
    } catch (error) {
      toast.error('Frage konnte nicht geladen werden');
    }
  };

  const handleSubmit = () => {
    if (!question) return;

    let correct = false;

    switch (question.question_type) {
      case 'FREETEXT':
        const correctValue = question.correct_answer?.value?.toString().toLowerCase().trim();
        const userValue = userAnswer.toLowerCase().trim();
        correct = correctValue === userValue;
        break;

      case 'MULTIPLE_CHOICE':
        correct = selectedOption === question.correct_answer?.value;
        break;

      case 'SORT':
        const correctOrder = question.correct_answer?.order || [];
        correct = JSON.stringify(sortedItems) === JSON.stringify(correctOrder);
        break;

      case 'MATCH':
        const correctPairs = question.correct_answer?.pairs || [];
        const userPairs = Object.entries(matches);
        correct = correctPairs.every(([left, right]: [string, string]) => 
          matches[left] === right
        ) && userPairs.length === correctPairs.length;
        break;
    }

    setIsCorrect(correct);
    setHasAnswered(true);

    if (correct) {
      toast.success('Richtig! 🎉');
      onCorrectAnswer?.();
    } else {
      toast.error('Nicht ganz richtig.');
      onWrongAnswer?.();
    }
  };

  const handleExplainClick = async () => {
    if (!question) return;

    try {
      const correctAnswerText = getCorrectAnswerText();
      await fetchExplanation(
        question.question_text,
        correctAnswerText,
        grade,
        subject
      );
    } catch (error) {
      toast.error('Erklärung konnte nicht geladen werden');
    }
  };

  const getCorrectAnswerText = (): string => {
    if (!question) return '';

    switch (question.question_type) {
      case 'FREETEXT':
        return question.correct_answer?.value?.toString() || '';
      case 'MULTIPLE_CHOICE':
        return question.correct_answer?.value || '';
      case 'SORT':
        return (question.correct_answer?.order || []).join(', ');
      case 'MATCH':
        return (question.correct_answer?.pairs || [])
          .map(([a, b]: [string, string]) => `${a} → ${b}`)
          .join(', ');
      default:
        return '';
    }
  };

  const renderQuestion = () => {
    if (!question) return null;

    switch (question.question_type) {
      case 'FREETEXT':
        return (
          <div className="space-y-4">
            <Input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Deine Antwort..."
              disabled={hasAnswered}
              className="text-lg p-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !hasAnswered) {
                  handleSubmit();
                }
              }}
            />
          </div>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {(question.options || []).map((option: string, index: number) => {
              const isSelected = selectedOption === option;
              const isCorrectAnswer = hasAnswered && option === question.correct_answer?.value;
              const isWrongSelection = hasAnswered && isSelected && !isCorrectAnswer;

              return (
                <Button
                  key={index}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full justify-start text-left p-6 text-base transition-all ${
                    isCorrectAnswer ? 'bg-green-500 hover:bg-green-600 border-green-600' : ''
                  } ${isWrongSelection ? 'bg-red-500 hover:bg-red-600 border-red-600' : ''}`}
                  onClick={() => !hasAnswered && setSelectedOption(option)}
                  disabled={hasAnswered}
                >
                  {isCorrectAnswer && <CheckCircle2 className="mr-2 h-5 w-5" />}
                  {isWrongSelection && <XCircle className="mr-2 h-5 w-5" />}
                  {option}
                </Button>
              );
            })}
          </div>
        );

      case 'SORT':
        // TODO: Implement drag-and-drop sorting
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sortiere die Elemente (Drag & Drop folgt)
            </p>
            {(question.options || []).map((item: string, index: number) => (
              <div key={index} className="p-4 border-2 rounded-xl hover:border-primary/50 transition-all cursor-move">
                {item}
              </div>
            ))}
          </div>
        );

      case 'MATCH':
        return (
          <NewMatchingQuestion
            question={{
              id: Date.now(), // Temporary numeric ID for realtime questions
              question: question.question_text,
              type: 'math', // Will be dynamic based on subject
              questionType: 'matching',
              leftItems: question.options?.leftItems || [],
              rightItems: question.options?.rightItems || [],
              correctMatches: Object.fromEntries(question.correct_answer?.pairs || [])
            }}
            onComplete={(isCorrect) => {
              setIsCorrect(isCorrect);
              setHasAnswered(true);
              if (isCorrect) {
                toast.success('Richtig! 🎉');
                onCorrectAnswer?.();
              } else {
                toast.error('Nicht ganz richtig.');
                onWrongAnswer?.();
              }
            }}
            disabled={hasAnswered}
          />
        );

      default:
        return <p>Unbekannter Fragetyp</p>;
    }
  };

  if (isLoadingQuestion) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!question) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Keine Frage geladen</p>
          <Button onClick={loadNewQuestion}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Frage laden
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="text-xl">{question.question_text}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Klasse {grade} • {topic_title}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {question.question_type !== 'MATCH' && renderQuestion()}
        {question.question_type === 'MATCH' && (
          <div className="mt-4">
            {renderQuestion()}
          </div>
        )}

        {question.question_type !== 'MATCH' && (
          <div className="flex gap-2">
            {!hasAnswered && (
              <Button onClick={handleSubmit} className="flex-1" size="lg">
                Antwort prüfen
              </Button>
            )}

            {hasAnswered && (
              <>
                {!isCorrect && (
                  <Button
                    variant="outline"
                    onClick={handleExplainClick}
                    disabled={isLoadingExplanation}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    {isLoadingExplanation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    Erklärung anzeigen
                  </Button>
                )}
                <Button onClick={loadNewQuestion} className="flex-1" size="lg">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Nächste Frage
                </Button>
              </>
            )}
          </div>
        )}

        {explanation && !isCorrect && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Erklärung:
            </p>
            <p className="text-sm leading-relaxed">{explanation}</p>
          </div>
        )}

        {hasAnswered && question.question_type !== 'MATCH' && (
          <div className={`p-4 rounded-lg transition-all animate-in fade-in ${
            isCorrect 
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
          }`}>
            <p className="font-medium flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Richtig!
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Nicht ganz richtig
                </>
              )}
            </p>
            {!isCorrect && (
              <p className="text-sm mt-2">
                Richtige Antwort: <span className="font-medium">{getCorrectAnswerText()}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
