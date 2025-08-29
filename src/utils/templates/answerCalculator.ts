
import { QuestionTemplate } from '../questionTemplates';
import { BulletproofAnswerCalculator, BulletproofCalculationResult } from './BulletproofAnswerCalculator';

export interface CalculationResult {
  answer: string | number;
  isValid: boolean;
  errors: string[];
  calculationSteps?: string[];
}

/**
 * DEPRECATED: Diese Klasse wird durch BulletproofAnswerCalculator ersetzt
 * Behält Kompatibilität für bestehenden Code bei
 */
export class AnswerCalculator {
  
  static calculateAnswer(template: QuestionTemplate, params: Record<string, any>): CalculationResult {
    console.log('⚠️ AnswerCalculator (deprecated) called, redirecting to BulletproofAnswerCalculator');
    
    // Redirect to bulletproof implementation
    const bulletproofResult = BulletproofAnswerCalculator.calculateAnswer(template, params);
    
    // Convert to legacy format for backward compatibility
    return {
      answer: bulletproofResult.answer,
      isValid: bulletproofResult.isValid,
      errors: bulletproofResult.errors,
      calculationSteps: bulletproofResult.steps
    };
    // All logic has been moved to BulletproofAnswerCalculator for reliability
  }

  private static validateInputs(template: QuestionTemplate, params: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check all required parameters are present
    for (const param of template.parameters) {
      if (!(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }
      
      const value = params[param.name];
      
      // Type validation
      if (param.type === 'number') {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Parameter ${param.name} must be a valid number, got: ${value}`);
        }
        
        // Range validation
        if (param.range) {
          const [min, max] = param.range;
          if (value < min || value > max) {
            errors.push(`Parameter ${param.name} (${value}) is outside range [${min}, ${max}]`);
          }
        }
      } else if (param.type === 'word') {
        if (typeof value !== 'string' || value.length === 0) {
          errors.push(`Parameter ${param.name} must be a non-empty string`);
        }
      }
      
      // Custom constraint validation
      if (param.constraints && !param.constraints(value, params)) {
        errors.push(`Parameter ${param.name} fails custom constraints`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private static verifyAnswer(
    template: QuestionTemplate, 
    params: Record<string, any>, 
    answer: string | number,
    calculationSteps: string[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic answer validation
    if (answer === '' || answer === null || answer === undefined) {
      errors.push('Answer cannot be empty');
      return { isValid: false, errors };
    }
    
    // Type-specific validation
    if (template.id.includes('math') || template.category === 'Mathematik') {
      // For math problems, verify numeric answers are reasonable
      if (typeof answer === 'number') {
        if (!isFinite(answer)) {
          errors.push('Math answer must be a finite number');
        }
        
        // Sanity check for basic operations
        if (template.id.includes('addition')) {
          const { a, b } = params;
          const expected = a + b;
          if (Math.abs(answer - expected) > 0.001) {
            errors.push(`Addition verification failed: ${a} + ${b} should equal ${expected}, got ${answer}`);
          }
        } else if (template.id.includes('multiplication')) {
          const { a } = params;
          let { b } = params;
          
          // Handle implicit multipliers
          if (b === undefined || b === null) {
            if (template.id.includes('by_2')) b = 2;
            else if (template.id.includes('by_5')) b = 5;
            else if (template.id.includes('by_6')) b = 6;
            else if (template.id.includes('by_7')) b = 7;
          }
          
          if (b !== undefined && b !== null) {
            const expected = a * b;
            if (Math.abs(answer - expected) > 0.001) {
              errors.push(`Multiplication verification failed: ${a} × ${b} should equal ${expected}, got ${answer}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Answer verification for ${template.id}:`, {
      template: template.id,
      params,
      answer,
      calculationSteps,
      isValid: errors.length === 0,
      errors
    });
    
    return { isValid: errors.length === 0, errors };
  }

  // Language helper methods
  private static countSyllables(word: string): number {
    const vowels = 'aeiouäöü';
    let count = 0;
    let previousWasVowel = false;
    
    for (const char of word.toLowerCase()) {
      const isVowel = vowels.includes(char);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    return Math.max(1, count);
  }

  private static getPlural(singular: string): string {
    const pluralMap: Record<string, string> = {
      'Hund': 'Hunde',
      'Katze': 'Katzen',
      'Buch': 'Bücher',
      'Auto': 'Autos',
      'Haus': 'Häuser',
      'Kind': 'Kinder',
      'Baum': 'Bäume',
      'Ball': 'Bälle'
    };
    return pluralMap[singular] || singular + 'e';
  }

  private static getPastTenseForm(verb: string): string {
    const pastTenseMap: Record<string, string> = {
      'spielen': 'spielte',
      'lernen': 'lernte',
      'machen': 'machte',
      'hören': 'hörte',
      'schauen': 'schaute',
      'kaufen': 'kaufte',
      'leben': 'lebte',
      'arbeiten': 'arbeitete',
      'gehen': 'ging',
      'essen': 'aß',
      'trinken': 'trank',
      'fahren': 'fuhr',
      'sehen': 'sah',
      'kommen': 'kam',
      'nehmen': 'nahm',
      'geben': 'gab'
    };
    return pastTenseMap[verb] || verb.replace('en', 'te');
  }

  private static getComparativeForm(adjective: string): string {
    const comparativeMap: Record<string, string> = {
      'groß': 'größer',
      'klein': 'kleiner',
      'schnell': 'schneller',
      'langsam': 'langsamer',
      'schön': 'schöner',
      'hoch': 'höher',
      'tief': 'tiefer',
      'warm': 'wärmer',
      'kalt': 'kälter'
    };
    return comparativeMap[adjective] || adjective + 'er';
  }

  private static getSuperlativeForm(adjective: string): string {
    const superlativeMap: Record<string, string> = {
      'groß': 'größten',
      'klein': 'kleinsten',
      'schnell': 'schnellsten',
      'schön': 'schönsten',
      'stark': 'stärksten',
      'schwach': 'schwächsten',
      'jung': 'jüngsten',
      'alt': 'ältesten'
    };
    return superlativeMap[adjective] || adjective + 'sten';
  }

  private static getSynonym(word: string): string {
    const synonymMap: Record<string, string> = {
      'schön': 'hübsch',
      'groß': 'riesig',
      'schnell': 'flink',
      'sprechen': 'reden',
      'gehen': 'laufen',
      'schauen': 'blicken',
      'klein': 'winzig',
      'gut': 'toll'
    };
    return synonymMap[word] || word;
  }

  private static getAntonym(word: string): string {
    const antonymMap: Record<string, string> = {
      'groß': 'klein',
      'hell': 'dunkel',
      'warm': 'kalt',
      'schnell': 'langsam',
      'alt': 'jung',
      'reich': 'arm',
      'schwer': 'leicht',
      'hoch': 'niedrig'
    };
    return antonymMap[word] || word;
  }
}
