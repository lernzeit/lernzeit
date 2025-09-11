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
 * Get the settings key for time per task based on English category
 */
export function getTimePerTaskKey(englishCategory: string): string {
  return `${englishCategory}_seconds_per_task`;
}