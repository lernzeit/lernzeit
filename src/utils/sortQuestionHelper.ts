/**
 * Helper functions for parsing and handling sort questions
 */

/**
 * Extract sortable items from a question prompt
 * Handles various formats like "5, 12, 3, 8" or "2 Äpfel 🍎, 3 Bananen 🍌, 1 Sternfrucht ⭐"
 */
export function extractItemsFromPrompt(prompt: string): string[] {
  // Try to find items in different patterns
  
  // Pattern 1: Numbers separated by commas (e.g., "5, 12, 3, 8")
  const numberPattern = /(\d+(?:\.\d+)?)/g;
  const numbers = prompt.match(numberPattern);
  
  // Pattern 2: Items with emojis (e.g., "2 Äpfel 🍎, 3 Bananen 🍌")
  const emojiPattern = /(\d+\s+[^,]+[^\s,])/g;
  const emojiItems = prompt.match(emojiPattern);
  
  // Pattern 3: Simple comma-separated items
  const colonIndex = prompt.indexOf(':');
  if (colonIndex !== -1) {
    const afterColon = prompt.substring(colonIndex + 1).trim();
    if (afterColon.includes(',')) {
      const items = afterColon.split(',').map(item => item.trim()).filter(item => item.length > 0);
      if (items.length > 1) {
        return items;
      }
    }
  }
  
  // Return the most appropriate match
  if (emojiItems && emojiItems.length > 1) {
    return emojiItems.map(item => item.trim());
  }
  
  if (numbers && numbers.length > 1) {
    return numbers;
  }
  
  // Fallback: try to split by common separators
  const fallbackItems = prompt
    .replace(/[^0-9a-zA-ZäöüÄÖÜß\s,.:!?🍎🍌⭐]/g, ' ')
    .split(/[,.]/)
    .map(item => item.trim())
    .filter(item => item.length > 0 && /\d/.test(item));
    
  return fallbackItems.length > 1 ? fallbackItems : [];
}

/**
 * Parse solution data from template format
 */
export function parseSolutionArray(solution: any): string[] {
  if (!solution) return [];
  
  if (Array.isArray(solution)) {
    return solution.map(item => String(item).trim());
  }
  
  if (typeof solution === 'object' && solution.value) {
    if (Array.isArray(solution.value)) {
      return solution.value.map(item => String(item).trim());
    }
    
    if (typeof solution.value === 'string') {
      // Handle comma-separated values
      return solution.value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
  }
  
  if (typeof solution === 'string') {
    return solution.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  return [];
}

/**
 * Create a sort question object from template data
 */
export function createSortQuestion(template: any): any {
  const items = template.variables?.numbers || extractItemsFromPrompt(template.student_prompt || '');
  const correctAnswer = parseSolutionArray(template.solution);
  
  return {
    ...template,
    questionType: template.question_type || 'SORT',
    question: template.student_prompt,
    items: items,
    correctAnswer: correctAnswer,
    // For compatibility with SortQuestion component
    solution: template.solution
  };
}