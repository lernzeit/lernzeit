import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { MatchingQuestion } from '@/types/questionTypes';

interface MatchingQuestionProps {
  question: MatchingQuestion;
  onComplete: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export function NewMatchingQuestion({ question, onComplete, disabled = false }: MatchingQuestionProps) {
  // Validate question structure
  if (!question.leftItems || !question.rightItems || !question.correctMatches) {
    console.error('❌ NewMatchingQuestion: Invalid question structure', question);
    return (
      <div className="p-4 border border-destructive rounded-lg">
        <p className="text-destructive">This question type is not properly configured. Please try a different question.</p>
      </div>
    );
  }

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [hasCompleted, setHasCompleted] = useState(false);

  // Check if game is complete
  useEffect(() => {
    const totalItems = question.leftItems.length;
    const matchedItems = Object.keys(matches).length;
    
    if (matchedItems === totalItems && !hasCompleted && !disabled) {
      // Check if all matches are correct
      const allCorrect = question.leftItems.every(leftItem => {
        const matchedRight = matches[leftItem];
        const expectedRight = question.correctMatches[leftItem];
        return matchedRight === expectedRight;
      });
      
      setHasCompleted(true);
      
      setTimeout(() => {
        onComplete(allCorrect);
      }, 1000);
    }
  }, [matches, question.leftItems, question.correctMatches, hasCompleted, disabled, onComplete]);

  const handleLeftClick = (leftItem: string) => {
    if (disabled || matches[leftItem] || hasCompleted) return;
    setSelectedLeft(selectedLeft === leftItem ? null : leftItem);
  };

  const handleRightClick = (rightItem: string) => {
    if (disabled || !selectedLeft || hasCompleted) return;
    
    const expectedRight = question.correctMatches[selectedLeft];
    const isCorrect = rightItem === expectedRight;
    const matchKey = `${selectedLeft}-${rightItem}`;
    
    if (isCorrect) {
      setMatches(prev => ({ ...prev, [selectedLeft]: rightItem }));
      setFeedback(prev => ({ ...prev, [matchKey]: 'correct' }));
    } else {
      setFeedback(prev => ({ ...prev, [matchKey]: 'incorrect' }));
    }
    
    setSelectedLeft(null);
    
    // Clear feedback after delay
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, [matchKey]: null }));
    }, 1500);
  };

  const getLeftItemClass = (leftItem: string) => {
    if (matches[leftItem]) {
      const expectedRight = question.correctMatches[leftItem];
      const actualRight = matches[leftItem];
      const isCorrect = actualRight === expectedRight;
      return isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
    }
    return selectedLeft === leftItem ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300';
  };

  const getRightItemClass = (rightItem: string) => {
    if (!selectedLeft || hasCompleted) return 'border-gray-200 hover:border-gray-300';
    
    const matchKey = `${selectedLeft}-${rightItem}`;
    const feedbackState = feedback[matchKey];
    
    if (feedbackState === 'correct') {
      return 'border-green-500 bg-green-50';
    } else if (feedbackState === 'incorrect') {
      return 'border-red-500 bg-red-50';
    }
    
    // Check if this right item is already matched
    const isAlreadyMatched = Object.values(matches).includes(rightItem);
    if (isAlreadyMatched) {
      return 'border-gray-200 bg-gray-50 opacity-50';
    }
    
    return 'border-gray-200 hover:border-blue-300 hover:bg-blue-50';
  };

  return (
    <div className="space-y-6">
      <p className="text-xl font-medium mb-6 text-center">
        {question.question}
      </p>
      
      {!hasCompleted && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          Klicke auf ein Element links und dann auf das passende Element rechts
        </p>
      )}

      {hasCompleted && (
        <p className="text-sm text-success text-center mb-4 font-medium">
          🎉 Aufgabe abgeschlossen! Weiter zur nächsten Frage...
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-4">
          <h3 className="font-medium text-center text-lg">Begriffe</h3>
          
          <div className="space-y-2">
            {question.leftItems.filter(item => !matches[item]).map(leftItem => (
              <div
                key={leftItem}
                onClick={() => handleLeftClick(leftItem)}
                className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                  disabled || hasCompleted ? 'opacity-50 cursor-not-allowed' : ''
                } ${getLeftItemClass(leftItem)}`}
              >
                <div className="flex items-center justify-between">
                  <span>{leftItem}</span>
                  {selectedLeft === leftItem && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Show matched items */}
          {Object.keys(matches).length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground">Zugeordnet:</h4>
              {Object.entries(matches).map(([left, right]) => {
                const isCorrect = right === question.correctMatches[left];
                return (
                  <div key={left} className={`p-2 rounded border ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{left} → {right}</span>
                      {isCorrect ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <h3 className="font-medium text-center text-lg">Definitionen</h3>
          
          <div className="space-y-2">
            {question.rightItems.map(rightItem => {
              const isMatched = Object.values(matches).includes(rightItem);
              const matchKey = selectedLeft ? `${selectedLeft}-${rightItem}` : '';
              const feedbackState = feedback[matchKey];
              
              return (
                <div
                  key={rightItem}
                  onClick={() => handleRightClick(rightItem)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    disabled || hasCompleted || isMatched ? 'cursor-not-allowed' : 
                    selectedLeft ? 'cursor-pointer' : 'cursor-default'
                  } ${getRightItemClass(rightItem)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={isMatched ? 'opacity-50' : ''}>{rightItem}</span>
                    {feedbackState === 'correct' && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                    {feedbackState === 'incorrect' && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="text-center text-sm text-muted-foreground">
        {Object.keys(matches).length} von {question.leftItems.length} zugeordnet
      </div>
    </div>
  );
}