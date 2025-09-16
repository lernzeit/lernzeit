import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SortQuestion as SortQuestionType } from '@/types/questionTypes';
import { ChevronUp, ChevronDown, RotateCcw, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xl font-medium mb-2">
          {question.question}
        </p>
        {/* Clear sorting direction indicator */}
        <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg max-w-sm mx-auto">
          <ArrowUp className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {isNumericSort ? "Kleinste zuerst" : "A-Z sortieren"}
          </span>
          <ArrowDown className="h-4 w-4 text-green-600" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ziehe die Zahlen in die richtige Reihenfolge oder nutze die Pfeile
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-2">
        {items.map((item, index) => (
          <Card 
            key={`${item}-${index}`}
            className={`relative group transition-all duration-200 ${
              disabled 
                ? 'opacity-50' 
                : 'hover:shadow-md hover:scale-[1.02] cursor-move active:scale-[0.98]'
            } ${index === 0 ? 'border-green-200 bg-green-50/50' : 'border-2'}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="flex items-center p-4">
              {/* Drag handle */}
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                
                {/* Position indicator */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 
                    ? 'bg-green-100 text-green-700 border-2 border-green-200' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                
                {/* The actual number/value - make it prominent */}
                <div className={`text-xl font-black ${
                  isNumericSort ? 'font-mono' : 'font-sans'
                } ${index === 0 ? 'text-green-700' : 'text-foreground'}`}>
                  {item}
                </div>
              </div>

              {/* Movement controls */}
              <div className="flex flex-col gap-1 opacity-70 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'up')}
                  disabled={disabled || index === 0}
                  className="h-7 w-7 p-0 hover:bg-primary/10"
                  title="Nach oben"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'down')}
                  disabled={disabled || index === items.length - 1}
                  className="h-7 w-7 p-0 hover:bg-primary/10"
                  title="Nach unten"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* First position indicator */}
            {index === 0 && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                Kleinste
              </div>
            )}
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
          className="inline-flex items-center gap-2 hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Neu mischen</span>
        </Button>
      </div>
    </div>
  );
}
