
import { QuestionTemplate } from '../questionTemplates';
import { GermanMathParser, MathParseResult } from '../math/germanMathParser';
import { ImprovedGermanMathParser, ParsedMathResult } from '../math/ImprovedGermanMathParser';

export interface CalculationResult {
  answer: string | number;
  isValid: boolean;
  errors: string[];
  calculationSteps?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Unified Answer Calculator - Uses existing parsers for reliable calculation
 * Consolidated from all redundant calculator implementations
 */
export class AnswerCalculator {
  
  static calculateAnswer(template: QuestionTemplate, params: Record<string, any>, questionText?: string): CalculationResult {
    console.log('🎯 AnswerCalculator started:', { template: template.id, params, questionText });
    
    try {
      // Input validation
      const inputValidation = this.validateInputs(template, params);
      if (!inputValidation.isValid) {
        return {
          answer: '',
          isValid: false,
          errors: inputValidation.errors,
          calculationSteps: ['Input validation failed'],
          confidence: 0
        };
      }

      // Step 1: Parser-based calculation (highest priority)
      if (questionText) {
        const parserResult = this.calculateUsingParsers(questionText);
        if (parserResult.isValid && (parserResult.confidence || 0) >= 0.7) {
          console.log('✅ Parser-based calculation successful:', parserResult);
          return parserResult;
        }
      }

      // Step 2: Dynamic parameter-based calculation
      const paramResult = this.calculateUsingParameters(template, params);
      if (paramResult.isValid) {
        console.log('✅ Parameter-based calculation successful:', paramResult);
        return paramResult;
      }

      // Step 3: Fallback to safe default
      return {
        answer: '',
        isValid: false,
        errors: ['Could not calculate answer using available methods'],
        calculationSteps: ['All calculation methods failed'],
        confidence: 0
      };

    } catch (error) {
      console.error('❌ Critical error in AnswerCalculator:', error);
      return {
        answer: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        calculationSteps: ['Critical error occurred'],
        confidence: 0
      };
    }
  }

  /**
   * Use existing mature parsers for calculation
   */
  private static calculateUsingParsers(questionText: string): CalculationResult {
    const steps: string[] = [];
    
    try {
      steps.push('Using ImprovedGermanMathParser');
      
      // Try improved parser first
      const improvedResult: ParsedMathResult = ImprovedGermanMathParser.parse(questionText);
      
      if (improvedResult.success && improvedResult.answer !== undefined) {
        steps.push(`Parser successful: ${improvedResult.answer}`);
        steps.push(...(improvedResult.steps || []));
        
        return {
          answer: improvedResult.answer,
          isValid: true,
          errors: [],
          calculationSteps: steps,
          confidence: improvedResult.confidence || 0.9,
          metadata: improvedResult.metadata
        };
      }

      // Fallback to basic parser
      steps.push('Fallback to GermanMathParser');
      const basicResult: MathParseResult = GermanMathParser.parse(questionText);
      
      if (basicResult.success && basicResult.answer !== undefined) {
        steps.push(`Basic parser successful: ${basicResult.answer}`);
        steps.push(...(basicResult.steps || []));
        
        return {
          answer: basicResult.answer,
          isValid: true,
          errors: [],
          calculationSteps: steps,
          confidence: 0.8,
          metadata: { operation: basicResult.expression ? 'parsed_expression' : 'unknown' }
        };
      }

      return {
        answer: '',
        isValid: false,
        errors: ['Parsers could not process the question'],
        calculationSteps: steps,
        confidence: 0
      };

    } catch (error) {
      return {
        answer: '',
        isValid: false,
        errors: [`Parser error: ${error instanceof Error ? error.message : 'Unknown'}`],
        calculationSteps: steps,
        confidence: 0
      };
    }
  }

  /**
   * Calculate using template parameters dynamically
   */
  private static calculateUsingParameters(template: QuestionTemplate, params: Record<string, any>): CalculationResult {
    const steps: string[] = [];
    
    try {
      steps.push(`Dynamic parameter calculation for template ${template.id}`);
      
      // Extract numeric parameters
      const numbers = Object.values(params).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      
      if (numbers.length >= 2) {
        // Detect operation type from template or parameters
        const operation = this.detectOperation(template, params);
        const result = this.performOperation(operation, numbers);
        
        if (result !== null) {
          steps.push(`Operation: ${operation} on ${numbers.slice(0, 2).join(', ')}`);
          steps.push(`Result: ${result}`);
          
          return {
            answer: result,
            isValid: true,
            errors: [],
            calculationSteps: steps,
            confidence: 0.85,
            metadata: { operation, operands: numbers.slice(0, 2) }
          };
        }
      }

      // Single parameter operations
      if (numbers.length === 1) {
        const singleResult = this.handleSingleParameter(template, params, numbers[0]);
        if (singleResult) {
          steps.push(singleResult.step);
          return {
            answer: singleResult.answer,
            isValid: true,
            errors: [],
            calculationSteps: steps,
            confidence: 0.8,
            metadata: singleResult.metadata
          };
        }
      }

      return {
        answer: '',
        isValid: false,
        errors: ['Could not determine calculation method from parameters'],
        calculationSteps: steps,
        confidence: 0
      };

    } catch (error) {
      return {
        answer: '',
        isValid: false,
        errors: [`Parameter calculation error: ${error instanceof Error ? error.message : 'Unknown'}`],
        calculationSteps: steps,
        confidence: 0
      };
    }
  }

  /**
   * Dynamically detect operation type
   */
  private static detectOperation(template: QuestionTemplate, params: Record<string, any>): string {
    const id = template.id.toLowerCase();
    const category = template.category?.toLowerCase() || '';
    
    // Check template ID for operation hints
    if (id.includes('addition') || id.includes('add') || id.includes('plus')) return 'addition';
    if (id.includes('subtraction') || id.includes('sub') || id.includes('minus')) return 'subtraction';
    if (id.includes('multiplication') || id.includes('mult') || id.includes('times')) return 'multiplication';
    if (id.includes('division') || id.includes('div')) return 'division';
    if (id.includes('area') || id.includes('fläche')) return 'multiplication';
    if (id.includes('perimeter') || id.includes('umfang')) return 'perimeter';
    
    // Check parameter names for hints
    const paramNames = Object.keys(params).join(' ').toLowerCase();
    if (paramNames.includes('sum') || paramNames.includes('total')) return 'addition';
    if (paramNames.includes('difference')) return 'subtraction';
    if (paramNames.includes('product')) return 'multiplication';
    if (paramNames.includes('quotient')) return 'division';
    if (paramNames.includes('length') && paramNames.includes('width')) return 'multiplication';
    
    // Default to addition for multiple numbers
    return 'addition';
  }

  /**
   * Perform mathematical operation
   */
  private static performOperation(operation: string, numbers: number[]): number | null {
    if (numbers.length < 2) return null;
    
    const [a, b] = numbers;
    
    switch (operation) {
      case 'addition': return a + b;
      case 'subtraction': return a - b;
      case 'multiplication': return a * b;
      case 'division': return b !== 0 ? a / b : null;
      case 'perimeter': return 2 * (a + b); // Rectangle perimeter
      default: return a + b; // Safe default
    }
  }

  /**
   * Handle single parameter calculations
   */
  private static handleSingleParameter(template: QuestionTemplate, params: Record<string, any>, value: number): { answer: number; step: string; metadata: any } | null {
    const id = template.id.toLowerCase();
    
    // Square area
    if (id.includes('square') && id.includes('area')) {
      return {
        answer: value * value,
        step: `Square area: ${value} × ${value} = ${value * value}`,
        metadata: { operation: 'square_area', operands: [value] }
      };
    }
    
    // Square perimeter
    if (id.includes('square') && id.includes('perimeter')) {
      return {
        answer: 4 * value,
        step: `Square perimeter: 4 × ${value} = ${4 * value}`,
        metadata: { operation: 'square_perimeter', operands: [value] }
      };
    }
    
    return null;
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
