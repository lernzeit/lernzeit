/**
 * Age-appropriate templates specifically designed for first grade students
 * Focus on visual, concrete, and simple concepts
 */
import { SelectionQuestion } from '@/types/questionTypes';

export interface FirstGradeTemplate {
  id: string;
  category: string;
  student_prompt: string;
  question_type: 'multiple-choice' | 'text-input' | 'sort';
  solution: { value: string | string[] };
  distractors?: string[];
  items?: string[];
  visual_support: boolean;
  difficulty: 'easy';
}

/**
 * Visual counting questions with emojis
 */
export const countingTemplates: FirstGradeTemplate[] = [
  {
    id: 'G1-COUNT-APPLES',
    category: 'math',
    student_prompt: 'Wie viele Äpfel siehst du? 🍎🍎🍎',
    question_type: 'text-input',
    solution: { value: '3' },
    distractors: ['2', '4', '1'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-COUNT-STARS',
    category: 'math',
    student_prompt: 'Zähle die Sterne: ⭐⭐⭐⭐⭐',
    question_type: 'text-input',
    solution: { value: '5' },
    distractors: ['4', '6', '3'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-COUNT-ANIMALS',
    category: 'math',
    student_prompt: 'Wie viele Tiere sind das? 🐶🐱🐶',
    question_type: 'text-input',
    solution: { value: '3' },
    distractors: ['2', '4', '1'],
    visual_support: true,
    difficulty: 'easy'
  }
];

/**
 * Size and comparison questions with obvious visual differences
 */
export const comparisonTemplates: FirstGradeTemplate[] = [
  {
    id: 'G1-SIZE-ELEPHANT-MOUSE',
    category: 'math',
    student_prompt: 'Was ist größer?',
    question_type: 'multiple-choice',
    solution: { value: '🐘' },
    distractors: ['🐭', '🐧', '🐱'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-SIZE-GIRAFFE-PENGUIN',
    category: 'math',
    student_prompt: 'Welches Tier ist größer?',
    question_type: 'multiple-choice',
    solution: { value: '🦒' },
    distractors: ['🐧', '🐭', '🐱'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-NUMBER-COMPARE',
    category: 'math',
    student_prompt: 'Welche Zahl ist größer: 8 oder 3?',
    question_type: 'multiple-choice',
    solution: { value: '8' },
    distractors: ['3', '5', '1'],
    visual_support: false,
    difficulty: 'easy'
  }
];

/**
 * Shape recognition with clear visual elements
 */
export const shapeTemplates: FirstGradeTemplate[] = [
  {
    id: 'G1-SHAPE-CIRCLE',
    category: 'shapes',
    student_prompt: 'Welche Form ist rund?',
    question_type: 'multiple-choice',
    solution: { value: '🔵' },
    distractors: ['⬜', '🔺', '⭐'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-SHAPE-SQUARE',
    category: 'shapes',
    student_prompt: 'Welche Form hat vier gleiche Seiten?',
    question_type: 'multiple-choice',
    solution: { value: '⬜' },
    distractors: ['🔵', '🔺', '⭐'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-SHAPE-TRIANGLE',
    category: 'shapes',
    student_prompt: 'Welche Form hat drei Ecken?',
    question_type: 'multiple-choice',
    solution: { value: '🔺' },
    distractors: ['🔵', '⬜', '⭐'],
    visual_support: true,
    difficulty: 'easy'
  }
];

/**
 * Color sorting and recognition
 */
export const colorTemplates: FirstGradeTemplate[] = [
  {
    id: 'G1-COLOR-TRAFFIC-LIGHT',
    category: 'colors',
    student_prompt: 'Sortiere die Ampelfarben richtig (von oben nach unten):',
    question_type: 'sort',
    solution: { value: ['🔴', '🟡', '🟢'] },
    items: ['🟢', '🔴', '🟡'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-COLOR-PRIMARY',
    category: 'colors',
    student_prompt: 'Welche Farbe siehst du hier? 🔵',
    question_type: 'multiple-choice',
    solution: { value: 'Blau' },
    distractors: ['Rot', 'Gelb', 'Grün'],
    visual_support: true,
    difficulty: 'easy'
  }
];

/**
 * Simple addition with visual support
 */
export const additionTemplates: FirstGradeTemplate[] = [
  {
    id: 'G1-ADD-VISUAL-1',
    category: 'math',
    student_prompt: '🍎🍎 + 🍎 = ?',
    question_type: 'text-input',
    solution: { value: '3' },
    distractors: ['2', '4', '1'],
    visual_support: true,
    difficulty: 'easy'
  },
  {
    id: 'G1-ADD-VISUAL-2',
    category: 'math',
    student_prompt: '⭐⭐ + ⭐⭐ = ?',
    question_type: 'text-input',
    solution: { value: '4' },
    distractors: ['3', '5', '2'],
    visual_support: true,
    difficulty: 'easy'
  }
];

/**
 * Get all first-grade templates
 */
export function getAllFirstGradeTemplates(): FirstGradeTemplate[] {
  return [
    ...countingTemplates,
    ...comparisonTemplates,
    ...shapeTemplates,
    ...colorTemplates,
    ...additionTemplates
  ];
}

/**
 * Convert first-grade template to SelectionQuestion
 */
export function convertFirstGradeTemplate(template: FirstGradeTemplate): SelectionQuestion {
  const baseQuestion = {
    id: Math.floor(Math.random() * 1000000), // Generate numeric ID
    question: template.student_prompt,
    type: template.question_type as any,
    explanation: `Richtige Antwort: ${Array.isArray(template.solution.value) ? template.solution.value.join(', ') : template.solution.value}`,
    templateId: template.id
  };

  switch (template.question_type) {
    case 'multiple-choice':
      const allOptions = [
        template.solution.value as string,
        ...(template.distractors || [])
      ];
      const shuffledOptions = [...allOptions].sort(() => Math.random() - 0.5);
      const correctIndex = shuffledOptions.findIndex(opt => opt === template.solution.value);
      
      return {
        ...baseQuestion,
        questionType: 'multiple-choice',
        options: shuffledOptions,
        correctAnswer: correctIndex >= 0 ? correctIndex : 0
      };

    case 'sort':
      return {
        ...baseQuestion,
        questionType: 'sort',
        items: template.items || [],
        correctOrder: template.solution.value as string[]
      };

    case 'text-input':
    default:
      return {
        ...baseQuestion,
        questionType: 'text-input',
        answer: template.solution.value as string
      };
  }
}

/**
 * Generate first-grade questions on demand
 */
export function generateFirstGradeQuestions(category: string, count: number = 5): SelectionQuestion[] {
  const allTemplates = getAllFirstGradeTemplates();
  const categoryTemplates = category === 'general' 
    ? allTemplates 
    : allTemplates.filter(t => t.category === category.toLowerCase());

  if (categoryTemplates.length === 0) {
    // Fallback to math templates if category not found
    const mathTemplates = allTemplates.filter(t => t.category === 'math');
    const selectedTemplates = mathTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    
    return selectedTemplates.map(convertFirstGradeTemplate);
  }

  const selectedTemplates = categoryTemplates
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return selectedTemplates.map(convertFirstGradeTemplate);
}