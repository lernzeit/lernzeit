
import React from 'react';
import { Button } from '@/components/ui/button';
import { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '@/types/questionTypes';

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceQuestionType;
  selectedAnswer: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  disabled = false 
}: MultipleChoiceQuestionProps) {
  console.log('🔍 MultipleChoice Debug:', {
    questionType: question.questionType,
    hasOptions: !!question.options,
    optionsLength: question.options?.length,
    options: question.options,
    fullQuestion: question
  });

  // Enhanced fallback for insufficient options
  if (!question.options || question.options.length === 0) {
    console.log('⚠️ No options found for multiple choice, falling back to text input');
    return (
      <div className="space-y-4">
        <p className="text-xl font-medium mb-6 text-center">
          {question.question}
        </p>
        <div className="max-w-sm mx-auto">
          <input
            type="text"
            placeholder="Deine Antwort..."
            className="w-full h-12 px-4 border border-gray-300 rounded-lg text-center text-lg"
            disabled={disabled}
            onChange={(e) => {
              // Simulate selection for first option
              if (e.target.value.trim()) {
                onAnswerSelect(0);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Check for insufficient options (less than 2)
  if (question.options.length < 2) {
    console.log('⚠️ Insufficient options for multiple choice, showing single option with explanation');
    return (
      <div className="space-y-4">
        <p className="text-xl font-medium mb-6 text-center">
          {question.question}
        </p>
        <div className="max-w-md mx-auto space-y-3">
          <Button
            variant="default"
            className="w-full h-12 text-left justify-start"
            onClick={() => onAnswerSelect(0)}
            disabled={disabled}
          >
            <span className="font-medium mr-3">A)</span>
            {question.options[0]}
          </Button>
          <p className="text-sm text-gray-600 text-center">
            Dies ist die richtige Antwort.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xl font-medium mb-6 text-center">
        {question.question}
      </p>
      
      <div className="grid gap-3 max-w-md mx-auto">
        {question.options.map((option, index) => (
          <Button
            key={index}
            variant={selectedAnswer === index ? "default" : "outline"}
            className={`h-12 text-left justify-start ${
              selectedAnswer === index ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => onAnswerSelect(index)}
            disabled={disabled}
          >
            <span className="font-medium mr-3">{String.fromCharCode(65 + index)})</span>
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
