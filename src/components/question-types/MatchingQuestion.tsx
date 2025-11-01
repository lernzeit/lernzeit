
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface MatchingItem {
  id: string;
  content: string;
  category: string;
}

interface MatchingCategory {
  id: string;
  name: string;
  acceptsItems: string[];
}

interface MatchingQuestionType {
  id: number;
  questionType: 'matching';
  question: string;
  type: string;
  explanation?: string;
  items: MatchingItem[];
  categories: MatchingCategory[];
}

interface MatchingQuestionProps {
  question: MatchingQuestionType;
  onComplete: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export function MatchingQuestion({ question, onComplete, disabled = false }: MatchingQuestionProps) {
  // Validate question structure
  if (!question.items || !question.categories || !Array.isArray(question.items) || !Array.isArray(question.categories)) {
    console.error('❌ MatchingQuestion: Invalid question structure', question);
    return (
      <div className="p-4 border border-destructive rounded-lg">
        <p className="text-destructive">This question type is not properly configured. Please try a different question.</p>
      </div>
    );
  }

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [wrongAttempts, setWrongAttempts] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [hasCompleted, setHasCompleted] = useState(false);

  // Debug logging
  console.log('🎯 MatchingQuestion state:', {
    question: question.question,
    matchesCount: Object.keys(matches).length,
    totalItems: question.items.length,
    disabled,
    hasCompleted
  });

  // Check if game is complete
  useEffect(() => {
    const totalItems = question.items.length;
    const matchedItems = Object.keys(matches).length;
    
    if (matchedItems === totalItems && !hasCompleted && !disabled) {
      console.log('🎯 Game completing with matches:', matches);
      
      // Check if all matches are correct
      const allCorrect = question.items.every(item => {
        const matchedCategory = matches[item.id];
        const isCorrect = matchedCategory === item.category;
        console.log(`🔍 Item ${item.id} -> ${matchedCategory}, expected: ${item.category}, correct: ${isCorrect}`);
        return isCorrect;
      });
      
      console.log('🎯 Final result:', { allCorrect, matches });
      setHasCompleted(true);
      
      // Delay to show final feedback before completing
      setTimeout(() => {
        onComplete(allCorrect);
      }, 1000);
    }
  }, [matches, question.items, hasCompleted, disabled, onComplete]);

  const handleItemClick = (itemId: string) => {
    if (disabled || matches[itemId] || hasCompleted) return;
    
    console.log('🎯 Item clicked:', itemId);
    setSelectedItem(selectedItem === itemId ? null : itemId);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (disabled || !selectedItem || hasCompleted) return;
    
    console.log('🎯 Category clicked:', categoryId, 'with selected item:', selectedItem);
    
    // Find the correct category for the selected item
    const item = question.items.find(i => i.id === selectedItem);
    if (!item) return;
    
    const isCorrect = item.category === categoryId;
    const matchKey = `${selectedItem}-${categoryId}`;
    
    if (isCorrect) {
      // Correct match
      setMatches(prev => ({ ...prev, [selectedItem]: categoryId }));
      setFeedback(prev => ({ ...prev, [matchKey]: 'correct' }));
      console.log('✅ Correct match:', selectedItem, '→', categoryId);
    } else {
      // Wrong match
      setWrongAttempts(prev => [...prev, matchKey]);
      setFeedback(prev => ({ ...prev, [matchKey]: 'incorrect' }));
      console.log('❌ Wrong match:', selectedItem, '→', categoryId);
    }
    
    // Reset selections
    setSelectedItem(null);
    
    // Clear feedback after delay
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, [matchKey]: null }));
    }, 1500);
  };

  const getItemsInCategory = (categoryId: string) => {
    return question.items.filter(item => matches[item.id] === categoryId);
  };

  const getUnmatchedItems = () => {
    return question.items.filter(item => !matches[item.id]);
  };

  const getItemFeedbackClass = (itemId: string) => {
    const item = question.items.find(i => i.id === itemId);
    if (!item) return '';
    
    if (matches[itemId]) {
      const isCorrect = matches[itemId] === item.category;
      return isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
    }
    
    return selectedItem === itemId ? 'border-blue-500 bg-blue-50' : '';
  };

  const getCategoryFeedbackClass = (categoryId: string) => {
    if (!selectedItem || hasCompleted) return '';
    
    const matchKey = `${selectedItem}-${categoryId}`;
    const feedbackState = feedback[matchKey];
    
    if (feedbackState === 'correct') {
      return 'border-green-500 bg-green-50';
    } else if (feedbackState === 'incorrect') {
      return 'border-red-500 bg-red-50';
    }
    
    return 'hover:border-blue-300 hover:bg-blue-50';
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
            Tippe auf ein Element und dann auf die passende Kategorie
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
        {/* Left column: Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 pb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-2">
              Elemente
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="space-y-3">
            {getUnmatchedItems().map(item => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                disabled={disabled || hasCompleted}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all text-left
                  ${disabled || hasCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                  ${selectedItem === item.id
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-base">{item.content}</span>
                  {selectedItem === item.id && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <div className="h-3 w-3 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 pb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-2">
              Kategorien
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="space-y-3">
            {question.categories.map(category => {
              const itemsInCategory = getItemsInCategory(category.id);
              const matchKey = selectedItem ? `${selectedItem}-${category.id}` : '';
              const feedbackState = feedback[matchKey];
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  disabled={disabled || hasCompleted || !selectedItem}
                  className={`
                    w-full min-h-[120px] p-4 rounded-xl border-2 transition-all text-left
                    ${disabled || hasCompleted ? 'opacity-50 cursor-not-allowed' : ''}
                    ${!selectedItem ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'}
                    ${feedbackState === 'correct' ? 'border-green-500 bg-green-50' : ''}
                    ${feedbackState === 'incorrect' ? 'border-red-500 bg-red-50' : ''}
                    ${!feedbackState && selectedItem ? 'hover:border-primary/50 hover:bg-primary/5' : ''}
                    ${!feedbackState && !selectedItem ? 'border-border' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-base">{category.name}</h4>
                    {feedbackState === 'correct' && (
                      <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    )}
                    {feedbackState === 'incorrect' && (
                      <X className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  {/* Items in category */}
                  <div className="space-y-2">
                    {itemsInCategory.map(item => {
                      const isCorrect = matches[item.id] === item.category;
                      return (
                        <div
                          key={item.id}
                          className={`
                            p-2 rounded-lg border-2 text-sm
                            ${isCorrect 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-red-300 bg-red-50'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.content}</span>
                            {isCorrect ? (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
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
            von {question.items.length}
          </div>
        </div>
      </div>
    </div>
  );
}
