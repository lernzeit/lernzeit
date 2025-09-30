
import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameFeedbackProps {
  feedback: 'correct' | 'incorrect' | null;
  explanation?: string;
  correctAnswer?: string;
  userAnswer?: string;
  onQuestionFeedback?: (feedbackType: 'thumbs_up' | 'thumbs_down' | 'too_hard' | 'too_easy') => void;
  onSkipFeedback?: () => void;
}

export function GameFeedback({ 
  feedback, 
  explanation,
  correctAnswer,
  userAnswer,
  onQuestionFeedback,
  onSkipFeedback
}: GameFeedbackProps) {
  if (!feedback) return null;

  return (
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
          {feedback === 'correct' ? '🎉 Richtig!' : '❌ Falsch!'}
        </span>
      </div>
      
      {/* Show correct answer for incorrect responses */}
      {feedback === 'incorrect' && correctAnswer && (
        <div className="mt-3 p-3 bg-white/50 rounded-md border-l-4 border-green-500">
          <p className="text-sm font-medium mb-1 text-green-700">Richtige Antwort:</p>
          <p className="text-sm font-semibold text-green-800">{correctAnswer}</p>
          {userAnswer && (
            <p className="text-xs text-red-600 mt-1">Deine Antwort: {userAnswer}</p>
          )}
        </div>
      )}
      
      {/* Show explanation only for incorrect answers */}
      {feedback === 'incorrect' && explanation && (
        <div className="mt-3 p-3 bg-white/50 rounded-md">
          <p className="text-sm font-medium mb-2">Erklärung:</p>
          <div className="text-sm space-y-1">
            {explanation.split('\n').map((line, index) => (
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

      {/* Simple Emoji Feedback Buttons */}
      {onQuestionFeedback && (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-center mb-2 text-muted-foreground">Wie fandest du die Frage?</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onQuestionFeedback('thumbs_up')}
              className="text-2xl hover:bg-green-100 hover:border-green-300"
              title="Gut"
            >
              👍
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onQuestionFeedback('thumbs_down')}
              className="text-2xl hover:bg-red-100 hover:border-red-300"
              title="Schlecht"
            >
              👎
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onQuestionFeedback('too_hard')}
              className="text-2xl hover:bg-orange-100 hover:border-orange-300"
              title="Zu schwer"
            >
              😰
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onQuestionFeedback('too_easy')}
              className="text-2xl hover:bg-blue-100 hover:border-blue-300"
              title="Zu leicht"
            >
              😴
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4 justify-center">
        {onSkipFeedback && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSkipFeedback}
            className="flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            Weiter
          </Button>
        )}
      </div>
    </div>
  );
}
