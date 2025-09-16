
export type QuestionVariant = 'MULTIPLE_CHOICE' | 'SORT' | 'MATCH' | 'FREETEXT';

// New question type system
export interface NewBaseQuestion {
  id: string;
  grade: number;
  subject: string;
  variant: QuestionVariant;
  body: string;
  explanation: string;
  verifier_score: number;
  created_at: string;
}

export interface MCData { options: string[]; correct_idx: number }
export interface SortData { items: string[]; correct_order: number[] }
export interface MatchData { left: string[]; right: string[]; pairs: number[] }
export interface FreeData { expected: string; grading: 'exact' | 'levenshtein' }

export type Question =
  | (NewBaseQuestion & { variant: 'MULTIPLE_CHOICE'; data: MCData })
  | (NewBaseQuestion & { variant: 'SORT'; data: SortData })
  | (NewBaseQuestion & { variant: 'MATCH'; data: MatchData })
  | (NewBaseQuestion & { variant: 'FREETEXT'; data: FreeData });

// Legacy types - maintaining exact compatibility
export interface BaseQuestion {
  id: number;
  question: string;
  type: 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin';
  explanation?: string;
  templateId?: string; // Optional template ID for tracking
}

export interface TextInputQuestion extends BaseQuestion {
  questionType: 'text-input';
  answer: string | number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  questionType: 'multiple-choice';
  options: string[];
  correctAnswer: number; // index of correct option
}

export interface WordSelectionQuestion extends BaseQuestion {
  questionType: 'word-selection';
  sentence: string;
  selectableWords: Array<{
    word: string;
    isCorrect: boolean;
    index: number;
  }>;
}

export interface DragDropQuestion extends BaseQuestion {
  questionType: 'drag-drop';
  items: Array<{
    id: string;
    content: string;
    category: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    acceptsItems: string[]; // item ids that belong in this category
  }>;
}

export interface MatchingQuestion extends BaseQuestion {
  questionType: 'matching';
  leftItems: string[];
  rightItems: string[];
  correctMatches: Record<string, string>;
}

export interface SortQuestion extends BaseQuestion {
  questionType: 'sort';
  items: string[];           // Items to be sorted
  correctOrder: string[];    // Correct order of items
}

export type SelectionQuestion = TextInputQuestion | MultipleChoiceQuestion | WordSelectionQuestion | DragDropQuestion | MatchingQuestion | SortQuestion;
