/**
 * Specialized validator for first-grade content
 * Ensures questions are age-appropriate and UI-compatible
 */
import { ValidationResult } from './ContentValidator';

export interface FirstGradeValidationResult extends ValidationResult {
  ageAppropriate: boolean;
  uiCompatible: boolean;
  hasVisualSupport: boolean;
}

export class FirstGradeValidator {
  private static instance: FirstGradeValidator;

  static getInstance(): FirstGradeValidator {
    if (!FirstGradeValidator.instance) {
      FirstGradeValidator.instance = new FirstGradeValidator();
    }
    return FirstGradeValidator.instance;
  }

  /**
   * Validate content specifically for first graders
   */
  async validateFirstGradeTemplate(template: any): Promise<FirstGradeValidationResult> {
    const issues: string[] = [];
    let qualityScore = 0.8;
    let shouldExclude = false;

    // Check for subjective or opinion-based questions
    const subjectiveIssues = this.detectSubjectiveContent(template.student_prompt || '');
    issues.push(...subjectiveIssues);
    if (subjectiveIssues.length > 0) {
      qualityScore = 0.2;
      shouldExclude = true;
    }

    // Check for questions requiring visual elements not provided
    const visualIssues = this.detectMissingVisualSupport(template);
    issues.push(...visualIssues);
    if (visualIssues.length > 0) {
      qualityScore = 0.3;
      shouldExclude = true;
    }

    // Check for age-inappropriate complexity
    const complexityIssues = this.detectInappropriateComplexity(template.student_prompt || '');
    issues.push(...complexityIssues);
    if (complexityIssues.length > 0) {
      qualityScore = Math.max(0.4, qualityScore - 0.3);
    }

    // Check for UI compatibility
    const uiIssues = this.detectUIIncompatibility(template);
    issues.push(...uiIssues);
    const uiCompatible = uiIssues.length === 0;
    
    // Check for proper visual support
    const hasVisualSupport = this.hasAdequateVisualSupport(template);
    if (!hasVisualSupport) {
      issues.push('Fehlende visuelle Unterstützung für Erstklässler');
      qualityScore = Math.max(0.5, qualityScore - 0.2);
    }

    const ageAppropriate = !shouldExclude && complexityIssues.length === 0;

    return {
      isValid: !shouldExclude && issues.length < 3,
      issues,
      qualityScore,
      shouldExclude,
      ageAppropriate,
      uiCompatible,
      hasVisualSupport
    };
  }

  /**
   * Detect subjective or opinion-based content inappropriate for first grade
   */
  private detectSubjectiveContent(prompt: string): string[] {
    const issues: string[] = [];
    const subjectivePatterns = [
      /lieblings/i,
      /schönste/i,
      /beste/i,
      /gefällt.*dir/i,
      /magst.*du/i,
      /findest.*du/i,
      /meinung/i,
      /denkst.*du/i
    ];

    for (const pattern of subjectivePatterns) {
      if (pattern.test(prompt)) {
        issues.push('Subjektive/Meinungsbasierte Frage ungeeignet für Erstklässler');
        break;
      }
    }

    return issues;
  }

  /**
   * Detect questions that require visual elements not provided in the UI
   */
  private detectMissingVisualSupport(template: any): string[] {
    const issues: string[] = [];
    const prompt = template.student_prompt || '';

    // Check for shape questions without actual shapes
    if (/kreis|dreieck|rechteck|quadrat/i.test(prompt) && 
        !/🔵|🔺|⬜|🟩|🟨|🟦|🟪|🟫|⚫|⚪/.test(prompt)) {
      issues.push('Frage über Formen ohne visuelle Darstellung der Formen');
    }

    // Check for size comparisons without context
    if (/größer|kleiner|länger|kürzer/i.test(prompt) && 
        !/🐘|🐭|🦒|🐧|🏠|🏢/.test(prompt) && 
        !this.hasNumberComparison(prompt)) {
      issues.push('Größenvergleich ohne visuelle Referenz oder Zahlen');
    }

    // Check for counting questions without countable elements
    if (/wie.*viele|zähle|anzahl/i.test(prompt) && 
        !/[🍎🍊🍌🐶🐱⭐🌟]/i.test(prompt) && 
        !this.hasCountableNumbers(prompt)) {
      issues.push('Zählfrage ohne zählbare Elemente dargestellt');
    }

    return issues;
  }

  /**
   * Detect content that's too complex for first graders
   */
  private detectInappropriateComplexity(prompt: string): string[] {
    const issues: string[] = [];

    // Check for numbers beyond grade 1 range (typically 1-20)
    const numbers = prompt.match(/\d+/g);
    if (numbers) {
      const maxNumber = Math.max(...numbers.map(n => parseInt(n)));
      if (maxNumber > 20) {
        issues.push(`Zahlen zu groß für Klasse 1: ${maxNumber} (max. 20)`);
      }
    }

    // Check for complex operations
    const complexPatterns = [
      /multiplik|mal.*nehmen/i,
      /divid|teil.*durch/i,
      /bruch|drittel|viertel/i,
      /prozent/i
    ];

    for (const pattern of complexPatterns) {
      if (pattern.test(prompt)) {
        issues.push('Mathematische Operation zu komplex für Klasse 1');
        break;
      }
    }

    return issues;
  }

  /**
   * Detect UI compatibility issues
   */
  private detectUIIncompatibility(template: any): string[] {
    const issues: string[] = [];

    // Check for multiple choice with insufficient options
    if (template.question_type === 'multiple-choice') {
      const optionsCount = template.distractors?.length || 0;
      if (optionsCount < 3) {
        issues.push('Multiple-Choice-Frage hat zu wenige Antwortoptionen');
      }
    }

    // Check for sort questions with insufficient items
    if (template.question_type === 'sort') {
      const itemsText = template.student_prompt || '';
      const items = this.extractSortableItems(itemsText);
      if (items.length < 2) {
        issues.push('Sortierfrage hat zu wenige sortierbare Elemente');
      }
    }

    return issues;
  }

  /**
   * Check if template has adequate visual support for first graders
   */
  private hasAdequateVisualSupport(template: any): boolean {
    const prompt = template.student_prompt || '';
    
    // Visual elements that help first graders
    const visualElements = [
      /[🍎🍊🍌🐶🐱⭐🌟🔵🔺⬜🟩🟨🟦🟪🟫⚫⚪🐘🐭🦒🐧]/,
      /\b[1-9]\b.*\b[1-9]\b/, // Simple number comparisons
      /ampel|rot|grün|gelb/i // Traffic light colors
    ];

    return visualElements.some(pattern => pattern.test(prompt));
  }

  /**
   * Helper: Check if prompt contains number comparison
   */
  private hasNumberComparison(prompt: string): boolean {
    const numbers = prompt.match(/\d+/g);
    return numbers && numbers.length >= 2;
  }

  /**
   * Helper: Check if prompt contains countable numbers
   */
  private hasCountableNumbers(prompt: string): boolean {
    const numbers = prompt.match(/\b([1-9]|1[0-9]|20)\b/g);
    return numbers && numbers.length > 0;
  }

  /**
   * Helper: Extract sortable items from text
   */
  private extractSortableItems(text: string): string[] {
    // Extract emoji sequences or numbered lists
    const emojiMatches = text.match(/[🍎🍊🍌🐶🐱⭐🌟🔵🔺⬜🟩🟨🟦🟪🟫⚫⚪]/g) || [];
    const numberMatches = text.match(/\b\d+\b/g) || [];
    
    return [...emojiMatches, ...numberMatches];
  }

  /**
   * Get recommended question types for first grade
   */
  getRecommendedQuestionTypes(): string[] {
    return [
      'multiple-choice', // Simple A/B/C choices with visual elements
      'text-input',      // Simple number input
      'sort'             // Visual sorting with 2-3 items max
    ];
  }

  /**
   * Generate age-appropriate alternatives for problematic content
   */
  generateFirstGradeAlternatives(category: string): any[] {
    const alternatives = [];

    switch (category.toLowerCase()) {
      case 'math':
      case 'zahlen':
        alternatives.push(
          {
            student_prompt: 'Wie viele 🍎 siehst du? 🍎🍎🍎',
            solution: { value: '3' },
            question_type: 'text-input',
            distractors: ['2', '4', '5']
          },
          {
            student_prompt: 'Was ist größer? 🐘 oder 🐭?',
            solution: { value: '🐘' },
            question_type: 'multiple-choice',
            distractors: ['🐭', '🐧', '🐱']
          }
        );
        break;

      case 'shapes':
      case 'formen':
        alternatives.push(
          {
            student_prompt: 'Welche Form ist rund? 🔵 ⬜ 🔺',
            solution: { value: '🔵' },
            question_type: 'multiple-choice',
            distractors: ['⬜', '🔺', '⭐']
          }
        );
        break;

      case 'colors':
      case 'farben':
        alternatives.push(
          {
            student_prompt: 'Sortiere die Ampelfarben richtig: 🔴 🟡 🟢',
            solution: { value: ['🔴', '🟡', '🟢'] },
            question_type: 'sort',
            items: ['🟢', '🔴', '🟡']
          }
        );
        break;
    }

    return alternatives;
  }
}

export const firstGradeValidator = FirstGradeValidator.getInstance();