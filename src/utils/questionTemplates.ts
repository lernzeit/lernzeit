export interface QuestionTemplate {
  id: string;
  category: string;
  grade: number;
  type: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching' | 'drag-drop';
  template: string;
  parameters: TemplateParameter[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
}

export interface TemplateParameter {
  name: string;
  type: 'number' | 'word' | 'list';
  range?: [number, number];
  values?: string[];
  constraints?: (value: any, params: Record<string, any>) => boolean;
}

export interface GeneratedQuestion {
  id: number;
  questionType: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching' | 'drag-drop';
  question: string;
  answer: string | number;
  type: string;
  explanation?: string;
  options?: string[];
  correctAnswer?: number;
  selectableWords?: Array<{
    word: string;
    isCorrect: boolean;
    index: number;
  }>;
  items?: Array<{
    id: string;
    content: string;
    category: string;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    acceptsItems: string[];
  }>;
  // Matching question properties
  leftItems?: string[];
  rightItems?: string[];
  correctMatches?: Record<string, string>;
}

import { germanTemplates } from './templates/germanTemplates';
import { mathTemplates } from './templates/mathTemplates';
import { extendedMathTemplates } from './templates/extendedMathTemplates';
import { extendedGermanTemplates } from './templates/extendedGermanTemplates';
import { scienceTemplates } from './templates/scienceTemplates';
import { TemplateCore } from './templates/templateCore';

// Comprehensive template definitions for all subjects and grades
export const questionTemplates: QuestionTemplate[] = [
  ...germanTemplates,
  ...extendedGermanTemplates,
  ...mathTemplates,
  ...extendedMathTemplates,
  ...scienceTemplates,
  
  // =================== ENGLISCH ===================
  
  // Grade 1 English Templates
  {
    id: 'english_1_colors_basic',
    category: 'Englisch',
    grade: 1,
    type: 'multiple-choice',
    template: 'What color is this? (Ein {object} ist normalerweise...)',
    parameters: [
      { name: 'object', type: 'word', values: ['Apfel', 'Gras', 'Sonne', 'Himmel', 'Schnee'] }
    ],
    explanation: 'Farben auf Englisch',
    difficulty: 'easy',
    topics: ['colors', 'vocabulary']
  },
  {
    id: 'english_1_numbers_basic',
    category: 'Englisch',
    grade: 1,
    type: 'text-input',
    template: 'Wie heißt die Zahl {number} auf Englisch?',
    parameters: [
      { name: 'number', type: 'number', range: [1, 10] }
    ],
    explanation: 'Zahlen auf Englisch',
    difficulty: 'easy',
    topics: ['numbers', 'vocabulary']
  },
  {
    id: 'english_1_greetings',
    category: 'Englisch',
    grade: 1,
    type: 'multiple-choice',
    template: 'Wie sagst du "Hallo" auf Englisch?',
    parameters: [],
    explanation: 'Englische Begrüßungen',
    difficulty: 'easy',
    topics: ['greetings', 'vocabulary', 'phrases']
  },

  // Grade 2 English Templates
  {
    id: 'english_2_animals_basic',
    category: 'Englisch',
    grade: 2,
    type: 'matching',
    template: 'Verbinde die deutschen Tiernamen mit den englischen:',
    parameters: [
      { name: 'animals', type: 'list', values: ['Hund-Dog', 'Katze-Cat', 'Vogel-Bird'] }
    ],
    explanation: 'Tiernamen auf Englisch',
    difficulty: 'medium',
    topics: ['animals', 'vocabulary']
  },
  {
    id: 'english_2_family_members',
    category: 'Englisch',
    grade: 2,
    type: 'text-input',
    template: 'Wie heißt "{german_word}" auf Englisch?',
    parameters: [
      { name: 'german_word', type: 'word', values: ['Mutter', 'Vater', 'Schwester', 'Bruder', 'Oma', 'Opa'] }
    ],
    explanation: 'Familienmitglieder auf Englisch',
    difficulty: 'medium',
    topics: ['family', 'vocabulary']
  },

  // =================== GEOGRAPHIE ===================
  
  // Grade 2 Geography Templates
  {
    id: 'geography_2_german_cities',
    category: 'Geographie',
    grade: 2,
    type: 'multiple-choice',
    template: 'In welchem Bundesland liegt die Stadt {city}?',
    parameters: [
      { name: 'city', type: 'word', values: ['München', 'Hamburg', 'Berlin', 'Köln', 'Dresden'] }
    ],
    explanation: 'Deutsche Bundesländer und Städte',
    difficulty: 'medium',
    topics: ['germany', 'states', 'cities']
  },
  {
    id: 'geography_2_continents_basic',
    category: 'Geographie',
    grade: 2,
    type: 'matching',
    template: 'Ordne die Länder den richtigen Kontinenten zu:',
    parameters: [
      { name: 'countries', type: 'list', values: ['Deutschland', 'China', 'Brasilien', 'Australien'] }
    ],
    explanation: 'Kontinente und Länder',
    difficulty: 'medium',
    topics: ['continents', 'countries']
  },

  // =================== NATURWISSENSCHAFTEN ===================
  
  // Grade 2 Science Templates
  {
    id: 'science_2_animals_habitats',
    category: 'Naturwissenschaften',
    grade: 2,
    type: 'matching',
    template: 'Ordne die Tiere ihren Lebensräumen zu:',
    parameters: [
      { name: 'animals', type: 'list', values: ['Fisch', 'Vogel', 'Bär', 'Kamel'] }
    ],
    explanation: 'Tiere und ihre Lebensräume',
    difficulty: 'easy',
    topics: ['animals', 'habitats', 'biology']
  },
  {
    id: 'science_2_plant_parts',
    category: 'Naturwissenschaften',
    grade: 2,
    type: 'word-selection',
    template: 'Welche Teile gehören zu einer Pflanze?',
    parameters: [
      { name: 'plant_parts', type: 'list', values: ['Wurzel', 'Stamm', 'Blätter', 'Blüte'] }
    ],
    explanation: 'Teile einer Pflanze',
    difficulty: 'easy',
    topics: ['plants', 'biology', 'parts']
  }
];

// Template selection and generation utilities
export function getTemplatesForCategory(category: string, grade: number): QuestionTemplate[] {
  return questionTemplates.filter(t => t.category === category && t.grade === grade);
}

export function getTemplatesByDifficulty(category: string, grade: number, difficulty: 'easy' | 'medium' | 'hard'): QuestionTemplate[] {
  return questionTemplates.filter(t => 
    t.category === category && 
    t.grade === grade && 
    t.difficulty === difficulty
  );
}

export function selectTemplateIntelligently(
  availableTemplates: QuestionTemplate[], 
  usedTemplates: Map<string, number>,
  preferredDifficulty?: 'easy' | 'medium' | 'hard'
): QuestionTemplate | null {
  if (availableTemplates.length === 0) return null;

  // Filter by difficulty if specified
  let candidateTemplates = preferredDifficulty 
    ? availableTemplates.filter(t => t.difficulty === preferredDifficulty)
    : availableTemplates;

  // If no templates match the preferred difficulty, use all available
  if (candidateTemplates.length === 0) {
    candidateTemplates = availableTemplates;
  }

  // Sort by usage count (least used first) and then by variety
  const sortedTemplates = candidateTemplates.sort((a, b) => {
    const usageA = usedTemplates.get(a.id) || 0;
    const usageB = usedTemplates.get(b.id) || 0;
    
    if (usageA !== usageB) {
      return usageA - usageB; // Prefer less used templates
    }
    
    // If usage is equal, prefer different question types for variety
    if (a.type !== b.type) {
      return Math.random() - 0.5;
    }
    
    return Math.random() - 0.5; // Random if everything else is equal
  });

  return sortedTemplates[0];
}

export function generateQuestionFromTemplate(template: QuestionTemplate, usedCombinations: Set<string>): GeneratedQuestion | null {
  return TemplateCore.generateQuestionFromTemplate(template, usedCombinations);
}

// Quality assurance function
export function validateTemplate(template: QuestionTemplate): boolean {
  // Check required fields
  if (!template.id || !template.category || !template.grade || !template.type) {
    return false;
  }
  
  // Check parameters
  for (const param of template.parameters) {
    if (!param.name || !param.type) {
      return false;
    }
    
    if (param.type === 'number' && !param.range) {
      return false;
    }
    
    if ((param.type === 'word' || param.type === 'list') && (!param.values || param.values.length === 0)) {
      return false;
    }
  }
  
  return true;
}

// Get template statistics
export function getTemplateStats() {
  const stats = {
    total: questionTemplates.length,
    byCategory: {} as Record<string, number>,
    byGrade: {} as Record<number, number>,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>
  };
  
  questionTemplates.forEach(template => {
    // By category
    stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
    
    // By grade
    stats.byGrade[template.grade] = (stats.byGrade[template.grade] || 0) + 1;
    
    // By difficulty
    stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1;
    
    // By type
    stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
  });
  
  return stats;
}
