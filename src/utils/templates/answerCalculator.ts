
import { QuestionTemplate } from '../questionTemplates';

export interface CalculationResult {
  answer: string | number;
  isValid: boolean;
  errors: string[];
  calculationSteps?: string[];
}

export class AnswerCalculator {
  
  static calculateAnswer(template: QuestionTemplate, params: Record<string, any>): CalculationResult {
    const errors: string[] = [];
    const calculationSteps: string[] = [];
    
    try {
      // Input validation
      const validationResult = this.validateInputs(template, params);
      if (!validationResult.isValid) {
        return {
          answer: '',
          isValid: false,
          errors: validationResult.errors,
          calculationSteps
        };
      }

      let answer: string | number = '';
      
      // Math calculations with proper validation
      if (template.id.includes('addition')) {
        const { a, b } = params;
        calculationSteps.push(`Addition: ${a} + ${b}`);
        answer = a + b;
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('subtraction')) {
        const { a, b } = params;
        calculationSteps.push(`Subtraction: ${a} - ${b}`);
        answer = a - b;
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('multiplication')) {
        // FIX: Properly handle multiplication parameters
        const a = params.a;
        let b = params.b;
        
        // Handle cases where b might be undefined or null
        if (b === undefined || b === null) {
          if (template.id.includes('by_2')) b = 2;
          else if (template.id.includes('by_5')) b = 5;
          else if (template.id.includes('by_6')) b = 6;
          else if (template.id.includes('by_7')) b = 7;
          else {
            errors.push(`Missing multiplier for template ${template.id}`);
            return { answer: '', isValid: false, errors, calculationSteps };
          }
        }
        
        calculationSteps.push(`Multiplication: ${a} × ${b}`);
        answer = a * b;
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('division')) {
        if (template.id.includes('remainder')) {
          const { dividend, divisor } = params;
          if (divisor === 0) {
            errors.push('Division by zero');
            return { answer: '', isValid: false, errors, calculationSteps };
          }
          
          const quotient = Math.floor(dividend / divisor);
          const remainder = dividend % divisor;
          calculationSteps.push(`Division with remainder: ${dividend} ÷ ${divisor}`);
          calculationSteps.push(`Quotient: ${quotient}, Remainder: ${remainder}`);
          answer = `${quotient} Rest ${remainder}`;
          
        } else {
          const { divisor, quotient } = params;
          if (divisor === 0) {
            errors.push('Division by zero');
            return { answer: '', isValid: false, errors, calculationSteps };
          }
          
          const dividend = divisor * quotient;
          params.dividend = dividend; // Update params for template rendering
          calculationSteps.push(`Reverse division: ${divisor} × ${quotient} = ${dividend}`);
          answer = quotient;
        }
        
      } else if (template.id.includes('counting_sequence')) {
        const { number } = params;
        calculationSteps.push(`Next number after: ${number}`);
        answer = number + 1;
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('counting_backwards')) {
        const { number } = params;
        calculationSteps.push(`Previous number before: ${number}`);
        answer = number - 1;
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('perimeter_rectangle')) {
        const { length, width } = params;
        calculationSteps.push(`Perimeter calculation: 2 × (${length} + ${width})`);
        answer = 2 * (length + width);
        calculationSteps.push(`Result: ${answer} cm`);
        
      } else if (template.id.includes('area_square')) {
        const { side } = params;
        calculationSteps.push(`Square area calculation: ${side} × ${side}`);
        answer = side * side;
        calculationSteps.push(`Result: ${answer} cm²`);
        
      } else if (template.id.includes('percentage')) {
        const { percentage, total } = params;
        calculationSteps.push(`Percentage calculation: ${percentage}% of ${total}`);
        answer = Math.round((percentage / 100) * total);
        calculationSteps.push(`Result: ${answer}`);
        
      } else if (template.id.includes('area_rectangle')) {
        const { length, width } = params;
        calculationSteps.push(`Area calculation: ${length} × ${width}`);
        answer = length * width;
        calculationSteps.push(`Result: ${answer} cm²`);
        
      } else if (template.id.includes('fraction_comparison')) {
        const { a, b } = params;
        calculationSteps.push(`Comparing fractions: 1/${a} vs 1/${b}`);
        
        // For unit fractions (1/n), larger denominator means smaller fraction
        // So 1/4 > 1/6 because 4 < 6
        const fraction1 = 1 / a;
        const fraction2 = 1 / b;
        
        calculationSteps.push(`1/${a} = ${fraction1.toFixed(3)}`);
        calculationSteps.push(`1/${b} = ${fraction2.toFixed(3)}`);
        
        if (fraction1 > fraction2) {
          answer = `1/${a}`;
          calculationSteps.push(`1/${a} is larger`);
        } else {
          answer = `1/${b}`;
          calculationSteps.push(`1/${b} is larger`);
        }
      }
      
      // German language calculations
      else if (template.id.includes('syllables')) {
        const word = params.word || params.animal || params.family || params.color;
        calculationSteps.push(`Counting syllables in: "${word}"`);
        answer = this.countSyllables(word);
        calculationSteps.push(`Result: ${answer} syllables`);
        
      } else if (template.id.includes('plural')) {
        const { singular } = params;
        calculationSteps.push(`Finding plural of: "${singular}"`);
        answer = this.getPlural(singular);
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('past_tense')) {
        const verb = params.verb || params.irregular_verb;
        calculationSteps.push(`Finding past tense of: "${verb}"`);
        answer = this.getPastTenseForm(verb);
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('comparative')) {
        const { adjective } = params;
        calculationSteps.push(`Finding comparative of: "${adjective}"`);
        answer = this.getComparativeForm(adjective);
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('superlative')) {
        const { adjective } = params;
        calculationSteps.push(`Finding superlative of: "${adjective}"`);
        answer = this.getSuperlativeForm(adjective);
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('letter_formation')) {
        const { letter } = params;
        calculationSteps.push(`Converting to uppercase: "${letter}"`);
        answer = letter.toUpperCase();
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('compound_words')) {
        const { word1, word2 } = params;
        calculationSteps.push(`Combining words: "${word1}" + "${word2}"`);
        answer = word1 + word2;
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('synonyms')) {
        const { word } = params;
        calculationSteps.push(`Finding synonym of: "${word}"`);
        answer = this.getSynonym(word);
        calculationSteps.push(`Result: "${answer}"`);
        
      } else if (template.id.includes('antonyms')) {
        const { word } = params;
        calculationSteps.push(`Finding antonym of: "${word}"`);
        answer = this.getAntonym(word);
        calculationSteps.push(`Result: "${answer}"`);
      }
      
      // Verify the calculated answer
      const verificationResult = this.verifyAnswer(template, params, answer, calculationSteps);
      
      return {
        answer,
        isValid: verificationResult.isValid,
        errors: verificationResult.errors,
        calculationSteps
      };
      
    } catch (error) {
      console.error('Calculation error:', error);
      errors.push(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        answer: '',
        isValid: false,
        errors,
        calculationSteps
      };
    }
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
