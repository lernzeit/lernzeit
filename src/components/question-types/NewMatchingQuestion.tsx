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
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
      {/* Question */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {question.question}
        </h2>
        
        {!hasCompleted && (
          <p className="text-base text-muted-foreground">
            Tippe links auf ein Element, dann rechts auf die passende Zuordnung
          </p>
        )}

        {hasCompleted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full">
            <Check className="h-5 w-5" />
            <span className="font-medium">Aufgabe abgeschlossen!</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Items to match */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 pb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-2">
              Begriffe
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="space-y-3">
            {question.leftItems.filter(item => !matches[item]).map(leftItem => (
              <button
                key={leftItem}
                onClick={() => handleLeftClick(leftItem)}
                disabled={disabled || hasCompleted}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all text-left
                  ${disabled || hasCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                  ${selectedLeft === leftItem 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-base">{leftItem}</span>
                  {selectedLeft === leftItem && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <div className="h-3 w-3 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Matched items summary */}
          {Object.keys(matches).length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Zugeordnet ({Object.keys(matches).length})
              </div>
              {Object.entries(matches).map(([left, right]) => {
                const isCorrect = right === question.correctMatches[left];
                return (
                  <div 
                    key={left} 
                    className={`
                      p-3 rounded-lg border-2 text-sm
                      ${isCorrect 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-red-300 bg-red-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{left}</div>
                        <div className="text-xs text-muted-foreground truncate">→ {right}</div>
                      </div>
                      {isCorrect ? (
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 pb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-2">
              Zuordnungen
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="space-y-3">
            {question.rightItems.map(rightItem => {
              const isMatched = Object.values(matches).includes(rightItem);
              const matchKey = selectedLeft ? `${selectedLeft}-${rightItem}` : '';
              const feedbackState = feedback[matchKey];
              
              return (
                <button
                  key={rightItem}
                  onClick={() => handleRightClick(rightItem)}
                  disabled={disabled || hasCompleted || isMatched || !selectedLeft}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left
                    ${disabled || hasCompleted || isMatched ? 'opacity-30 cursor-not-allowed' : ''}
                    ${!selectedLeft ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'}
                    ${feedbackState === 'correct' ? 'border-green-500 bg-green-50' : ''}
                    ${feedbackState === 'incorrect' ? 'border-red-500 bg-red-50' : ''}
                    ${!feedbackState && !isMatched && selectedLeft ? 'hover:border-primary/50 hover:bg-primary/5' : ''}
                    ${!feedbackState && !isMatched && !selectedLeft ? 'border-border' : ''}
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium text-base ${isMatched ? 'line-through opacity-50' : ''}`}>
                      {rightItem}
                    </span>
                    {feedbackState === 'correct' && (
                      <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    )}
                    {feedbackState === 'incorrect' && (
                      <X className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {Object.keys(matches).length}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            von {question.leftItems.length}
          </div>
        </div>
      </div>
    </div>
  );
}