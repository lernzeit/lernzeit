import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useExplanation } from '@/hooks/useExplanation';
import { toast } from 'sonner';
import type { Question } from '@/hooks/useQuestions';

interface SimplifiedQuestionRendererProps {
  question: Question;
  grade: number;
  onAnswer: (isCorrect: boolean) => void;
}

export const SimplifiedQuestionRenderer: React.FC<SimplifiedQuestionRendererProps> = ({
  question,
  grade,
  onAnswer
}) => {
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sortedItems, setSortedItems] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const { explanation, isLoading: isLoadingExplanation, fetchExplanation } = useExplanation();

  const handleSubmit = () => {
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
    onAnswer(correct);

    if (correct) {
      toast.success('Richtig! 🎉');
    } else {
      toast.error('Nicht ganz richtig. Versuche es nochmal!');
    }
  };

  const handleExplainClick = async () => {
    try {
      const correctAnswerText = getCorrectAnswerText();
      await fetchExplanation(
        question.question_text,
        correctAnswerText,
        grade,
        'math' // TODO: Get from topic
      );
    } catch (error) {
      toast.error('Erklärung konnte nicht geladen werden');
    }
  };

  const getCorrectAnswerText = (): string => {
    switch (question.question_type) {
      case 'FREETEXT':
        return question.correct_answer?.value?.toString() || '';
      case 'MULTIPLE_CHOICE':
        const correctOptionIndex = question.correct_answer?.value;
        return question.options?.[correctOptionIndex] || correctOptionIndex;
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
              className="text-lg"
            />
          </div>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {(question.options || []).map((option: string, index: number) => (
              <Button
                key={index}
                variant={selectedOption === option ? 'default' : 'outline'}
                className="w-full justify-start text-left p-4"
                onClick={() => !hasAnswered && setSelectedOption(option)}
                disabled={hasAnswered}
              >
                {option}
              </Button>
            ))}
          </div>
        );

      case 'SORT':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ziehe die Elemente in die richtige Reihenfolge
            </p>
            {/* TODO: Implement drag-and-drop */}
            <div className="space-y-2">
              {(question.options || []).map((item: string, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  {item}
                </div>
              ))}
            </div>
          </div>
        );

      case 'MATCH':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {(question.options?.leftItems || []).map((item: string) => (
                <div key={item} className="p-3 border rounded-lg">
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(question.options?.rightItems || []).map((item: string) => (
                <div key={item} className="p-3 border rounded-lg">
                  {item}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <p>Unbekannter Fragetyp</p>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{question.question_text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderQuestion()}

        <div className="flex gap-2">
          {!hasAnswered && (
            <Button onClick={handleSubmit} className="flex-1">
              Antwort prüfen
            </Button>
          )}

          {hasAnswered && (
            <Button
              variant="outline"
              onClick={handleExplainClick}
              disabled={isLoadingExplanation}
              className="flex items-center gap-2"
            >
              {isLoadingExplanation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              Erklärung anzeigen
            </Button>
          )}
        </div>

        {explanation && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-2">💡 Erklärung:</p>
            <p className="text-sm">{explanation}</p>
          </div>
        )}

        {hasAnswered && (
          <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="font-medium">
              {isCorrect ? '✅ Richtig!' : '❌ Nicht ganz richtig'}
            </p>
            {!isCorrect && (
              <p className="text-sm mt-1">
                Richtige Antwort: {getCorrectAnswerText()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
