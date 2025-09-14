import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SortQuestion as SortQuestionType } from '@/types/questionTypes';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xl font-medium mb-4">
          {question.question}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Sortiere die Elemente in die richtige Reihenfolge. Du kannst sie per Drag & Drop verschieben oder die Pfeile verwenden.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {items.map((item, index) => (
          <Card 
            key={`${item}-${index}`}
            className={`p-4 border-2 transition-all duration-200 ${
              disabled ? 'opacity-50' : 'hover:border-primary/50 cursor-move'
            }`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="flex items-center justify-between">
              {/* Position number */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <span className="font-medium">{item}</span>
              </div>

              {/* Movement controls */}
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'up')}
                  disabled={disabled || index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'down')}
                  disabled={disabled || index === items.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reset button */}
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={resetOrder}
          disabled={disabled}
          className="inline-flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Neu mischen</span>
        </Button>
      </div>
    </div>
  );
}
