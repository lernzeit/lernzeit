/**
 * Converts database template format to frontend question format
 */

import { MultipleChoiceQuestion, SelectionQuestion } from '@/types/questionTypes';

interface TemplateFromDB {
  id: string;
  student_prompt: string;
  question_type: string;
  variables?: Record<string, string>;
  distractors?: string[] | { options?: string[] };
  solution?: { value: string | number };
  explanation?: string;
  [key: string]: any;
}

/**
 * Converts a template from database format to MultipleChoiceQuestion format
 */
export function convertTemplateToMultipleChoice(template: TemplateFromDB): any {
  console.log('🔄 Converting template to multiple choice:', {
    id: template.id,
    variables: template.variables,
    distractors: template.distractors,
    solution: template.solution
  });

  // Extract the correct answer value
  const correctValue = template.solution?.value || '';
  
  // Handle different distractor formats
  let distractorKeys: string[] = [];
  if (Array.isArray(template.distractors)) {
    distractorKeys = template.distractors;
  } else if (template.distractors && typeof template.distractors === 'object' && 'options' in template.distractors) {
    distractorKeys = (template.distractors as { options: string[] }).options || [];
  }

  // Build options array and find correct answer index
  const options: string[] = [];
  let correctAnswer = 0;

  if (template.variables && typeof template.variables === 'object') {
    // Get all keys (A, B, C, D) in order
    const allKeys = Object.keys(template.variables).sort();
    
    allKeys.forEach((key, index) => {
      const optionText = template.variables![key];
      options.push(optionText);
      
      // Check if this is the correct answer
      if (key === correctValue || optionText === correctValue) {
        correctAnswer = index;
      }
    });
  } else {
    // Fallback: if no variables, use distractors as options
    console.warn('⚠️ No variables found, using fallback logic');
    options.push(...distractorKeys, String(correctValue));
    correctAnswer = options.length - 1;
  }

  // Validate that we have options
  if (options.length === 0) {
    console.error('❌ No options generated for template:', template.id);
    // Create a fallback with at least one option
    options.push(String(correctValue));
    correctAnswer = 0;
  }

  console.log('✅ Converted to multiple choice:', {
    optionsCount: options.length,
    options: options,
    correctAnswer: correctAnswer,
    correctValue: options[correctAnswer]
  });

  return {
    id: template.id,
    question: template.student_prompt,
    questionType: 'multiple-choice',
    type: 'math',
    options: options,
    correctAnswer: correctAnswer,
    explanation: template.explanation || '',
    templateId: template.id
  };
}

/**
 * Converts any template to the appropriate SelectionQuestion format
 */
export function convertTemplateToQuestion(template: TemplateFromDB): SelectionQuestion {
  const questionType = template.question_type?.toUpperCase() || 'FREETEXT';

  switch (questionType) {
    case 'MULTIPLE_CHOICE':
    case 'MC':
      return convertTemplateToMultipleChoice(template);
    
    // Add other question types as needed
    case 'FREETEXT':
    default:
      return {
        id: template.id,
        question: template.student_prompt,
        questionType: 'text-input' as const,
        type: 'math' as any,
        answer: String(template.solution?.value || ''),
        explanation: template.explanation || ''
      } as any;
  }
}
