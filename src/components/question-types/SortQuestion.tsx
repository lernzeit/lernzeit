import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SortQuestion as SortQuestionType } from '@/types/questionTypes';
import { ArrowUpDown, Shuffle } from 'lucide-react';

interface SortQuestionProps {
  question: SortQuestionType;
  currentOrder: string[] | null;
  onOrderChange: (order: string[]) => void;
  disabled?: boolean;
}

export function SortQuestion({ 
  question, 
  currentOrder, 
  onOrderChange, 
  disabled = false 
}: SortQuestionProps) {
  const [items, setItems] = useState<string[]>([]);

  // Initialize with shuffled items if no current order exists
  useEffect(() => {
    if (currentOrder && currentOrder.length > 0) {
      setItems(currentOrder);
    } else {
      // Start with shuffled items (but keep original available)
      const shuffled = [...question.items].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      onOrderChange(shuffled);
    }
  }, [question.items, currentOrder, onOrderChange]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      // Swap items
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      setItems(newItems);
      onOrderChange(newItems);
    }
  };

  const resetOrder = () => {
    if (disabled) return;
    
    const shuffled = [...question.items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    onOrderChange(shuffled);
  };

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (disabled) return;
    
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex) {
      const newItems = [...items];
      const draggedItem = newItems[dragIndex];
      
      // Remove dragged item
      newItems.splice(dragIndex, 1);
      // Insert at new position
      newItems.splice(dropIndex, 0, draggedItem);
      
      setItems(newItems);
      onOrderChange(newItems);
    }
  };

  // Determine if we're sorting numbers or text
  const isNumericSort = items.every(item => !isNaN(parseFloat(item.replace(/[.,]/g, '').replace(/\s/g, ''))));
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 px-4">
      {/* Question */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {question.question}
        </h2>
        
        {/* Instructions */}
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-full">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {isNumericSort ? "Sortiere von klein nach groß" : "Sortiere alphabetisch"}
          </span>
        </div>
      </div>

      {/* Sortable Items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`group relative ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          >
            <Card className={`
              transition-all duration-200
              ${disabled ? 'opacity-60' : 'hover:shadow-lg hover:-translate-y-1'}
              border-2
            `}>
              <div className="flex items-center gap-4 p-4 md:p-6">
                {/* Position Number */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-xl md:text-2xl font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Value Display */}
                <div className="flex-1 min-w-0">
                  <div className={`text-3xl md:text-4xl font-black tracking-tight ${
                    isNumericSort ? 'font-mono' : 'font-sans'
                  }`}>
                    {item}
                  </div>
                </div>

                {/* Move Buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveItem(index, 'up')}
                    disabled={disabled || index === 0}
                    className="h-10 w-10 rounded-lg disabled:opacity-30"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveItem(index, 'down')}
                    disabled={disabled || index === items.length - 1}
                    className="h-10 w-10 rounded-lg disabled:opacity-30"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Shuffle Button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          size="lg"
          onClick={resetOrder}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-6 py-6 text-base font-medium"
        >
          <Shuffle className="h-5 w-5" />
          <span>Neu mischen</span>
        </Button>
      </div>
    </div>
  );
}
