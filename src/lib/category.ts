/**
 * Category mapping utility for consistent German (frontend) / English (backend) translation
 * 
 * This ensures that the frontend always displays German category names while
 * the backend/database consistently uses English category names.
 */

export const CATEGORY_MAP = {
  // German -> English mapping
  'Mathematik': 'math',
  'Deutsch': 'german',
  'Englisch': 'english',
  'Sachkunde': 'science',
  'Geographie': 'geography',
  'Geschichte': 'history',
  'Physik': 'physics',
  'Biologie': 'biology',
  'Chemie': 'chemistry',
  'Latein': 'latin',
  
  // Also handle lowercase variants
  'mathematik': 'math',
  'deutsch': 'german',
  'englisch': 'english',
  'sachkunde': 'science',
  'geographie': 'geography',
  'geschichte': 'history',
  'physik': 'physics',
  'biologie': 'biology',
  'chemie': 'chemistry',
  'latein': 'latin',
  
  // Also handle variants with additional words
  'math': 'math',
  'german': 'german',
  'english': 'english',
  'science': 'science',
  'geography': 'geography',
  'history': 'history',
  'physics': 'physics',
  'biology': 'biology',
  'chemistry': 'chemistry',
  'latin': 'latin'
} as const;

/**
 * Convert German frontend category to English backend category
 */
export function toEnglishCategory(germanCategory: string): string {
  const normalized = germanCategory.trim();
  return CATEGORY_MAP[normalized as keyof typeof CATEGORY_MAP] || normalized.toLowerCase();
}

/**
 * Convert English backend category to German frontend category
 */
export function toGermanCategory(englishCategory: string): string {
  const englishKey = englishCategory.toLowerCase();
  
  switch (englishKey) {
    case 'math': return 'Mathematik';
    case 'german': return 'Deutsch';
    case 'english': return 'Englisch';
    case 'science': return 'Sachkunde';
    case 'geography': return 'Geographie';
    case 'history': return 'Geschichte';
    case 'physics': return 'Physik';
    case 'biology': return 'Biologie';
    case 'chemistry': return 'Chemie';
    case 'latin': return 'Latein';
    default: return englishCategory;
  }
}

/**
 * Grade constraints for subjects – defines which subjects are available at which grades.
 * This is the SINGLE SOURCE OF TRUTH used by CategorySelector, AI generators, etc.
 */
export const SUBJECT_GRADE_CONSTRAINTS: Record<string, { minGrade: number; maxGrade: number }> = {
  math:      { minGrade: 1, maxGrade: 10 },
  german:    { minGrade: 1, maxGrade: 10 },
  science:   { minGrade: 1, maxGrade: 4 },   // Sachkunde only Grundschule
  english:   { minGrade: 3, maxGrade: 10 },
  geography: { minGrade: 5, maxGrade: 10 },
  history:   { minGrade: 5, maxGrade: 10 },
  physics:   { minGrade: 5, maxGrade: 10 },
  biology:   { minGrade: 5, maxGrade: 10 },
  chemistry: { minGrade: 7, maxGrade: 10 },
  latin:     { minGrade: 5, maxGrade: 10 },
};

/**
 * Returns whether a subject is available for a given grade.
 */
export function isSubjectAvailableForGrade(subject: string, grade: number): boolean {
  const constraint = SUBJECT_GRADE_CONSTRAINTS[subject];
  if (!constraint) return true; // unknown subject → allow
  return grade >= constraint.minGrade && grade <= constraint.maxGrade;
}

/**
 * Get the settings key for time per task based on English category
 */
export function getTimePerTaskKey(englishCategory: string): string {
  return `${englishCategory}_seconds_per_task`;
}