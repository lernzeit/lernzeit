/**
 * Improved German Math Parser with Enhanced Capabilities
 * Integrates with the new architecture and provides better parsing
 */

export interface ParsedMathResult {
  success: boolean;
  answer?: number | string;
  steps?: string[];
  questionType?: 'arithmetic' | 'word-problem' | 'comparison' | 'geometry' | 'fraction';
  confidence?: number;
  metadata?: {
    operation?: string;
    operands?: number[];
    unit?: string;
    variables?: Record<string, number>;
  };
}

export class ImprovedGermanMathParser {
  /**
   * Enhanced parsing with multiple strategies - NO DEBUG OUTPUT
   */
  static parse(question: string): ParsedMathResult {
    // Enhanced parsing strategies
    const enhancedResult = this.enhancedParse(question);
    if (enhancedResult.success) {
      return enhancedResult;
    }

    // Pattern-based parsing
    const patternResult = this.patternBasedParse(question);
    if (patternResult.success) {
      return patternResult;
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Enhanced parsing for complex scenarios
   */
  private static enhancedParse(question: string): ParsedMathResult {
    const text = question.toLowerCase().trim();

    // Enhanced fraction comparison
    if (text.includes('bruch') && (text.includes('größer') || text.includes('kleiner'))) {
      return this.parseEnhancedFractionComparison(text);
    }

    // Enhanced word problems
    if (this.isWordProblem(text)) {
      return this.parseEnhancedWordProblem(text);
    }

    // Enhanced geometry
    if (this.isGeometryProblem(text)) {
      return this.parseEnhancedGeometry(text);
    }

    // Enhanced decimal operations
    if (text.includes(',') && /\d+,\d+/.test(text)) {
      return this.parseEnhancedDecimals(text);
    }

    return { success: false };
  }

  /**
   * Pattern-based parsing for structured questions
   */
  private static patternBasedParse(question: string): ParsedMathResult {
    const patterns = [
      // Enhanced arithmetic patterns
      {
        regex: /(\d+(?:,\d+)?)\s*([+\-×÷*\/])\s*(\d+(?:,\d+)?)\s*=\s*\?/,
        handler: this.parseArithmeticPattern
      },
      // Time calculations
      {
        regex: /(\d+)\s*stunden?\s*(?:und\s*)?(\d+)?\s*minuten?/i,
        handler: this.parseTimePattern
      },
      // Money calculations
      {
        regex: /(\d+(?:,\d+)?)\s*euro?\s*(?:und\s*)?(\d+)?\s*cents?/i,
        handler: this.parseMoneyPattern
      },
      // Percentage calculations
      {
        regex: /(\d+(?:,\d+)?)\s*%\s*(?:von|of)\s*(\d+(?:,\d+)?)/i,
        handler: this.parsePercentagePattern
      }
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern.regex);
      if (match) {
        const result = pattern.handler.call(this, match, question);
        if (result.success) {
          return result;
        }
      }
    }

    return { success: false };
  }

  /**
   * Enhanced fraction comparison parsing
   */
  private static parseEnhancedFractionComparison(text: string): ParsedMathResult {
    const fractionMatch = text.match(/1\/(\d+).*1\/(\d+)/);
    if (!fractionMatch) return { success: false };

    const [, denom1, denom2] = fractionMatch;
    const a = parseInt(denom1);
    const b = parseInt(denom2);

    if (isNaN(a) || isNaN(b)) return { success: false };

    const frac1 = 1 / a;
    const frac2 = 1 / b;
    
    let answer: string;
    if (text.includes('größer')) {
      answer = frac1 > frac2 ? `1/${a}` : `1/${b}`;
    } else {
      answer = frac1 < frac2 ? `1/${a}` : `1/${b}`;
    }

    const decimalAnswer = frac1 > frac2 ? frac1 : frac2;
    const formattedDecimal = decimalAnswer.toFixed(2).replace('.', ',');

    return {
      success: true,
      answer: formattedDecimal,
      questionType: 'fraction',
      confidence: 0.9,
      steps: [
        `1/${a} = ${(1/a).toFixed(3)}`,
        `1/${b} = ${(1/b).toFixed(3)}`,
        `Vergleich: ${frac1 > frac2 ? `1/${a} > 1/${b}` : `1/${a} < 1/${b}`}`,
        `Antwort: ${formattedDecimal}`
      ],
      metadata: {
        operation: 'fraction_comparison',
        operands: [a, b],
        variables: { a, b }
      }
    };
  }

  /**
   * Enhanced word problem parsing - FIXED for "Subtrahiere A von B" and negative numbers
   */
  private static parseEnhancedWordProblem(text: string): ParsedMathResult {
    // CRITICAL FIX: Handle "Subtrahiere A von B" = B - A
    const subtractFromMatch = text.match(/subtrahiere\s+(\d+(?:,\d+)?)\s+von\s+(\d+(?:,\d+)?)/i);
    if (subtractFromMatch) {
      const subtrahend = parseFloat(subtractFromMatch[1].replace(',', '.')); // A
      const minuend = parseFloat(subtractFromMatch[2].replace(',', '.'));    // B
      const result = minuend - subtrahend; // B - A
      
      return {
        success: true,
        answer: result.toString().replace('.', ','),
        questionType: 'word-problem',
        confidence: 0.98,
        steps: [`Subtrahiere ${subtrahend} von ${minuend}`, `${minuend} - ${subtrahend} = ${result}`],
        metadata: {
          operation: 'subtraction_from',
          operands: [minuend, subtrahend]
        }
      };
    }

    // Handle negative number addition: "Berechne 5 + (-3)"
    const negativeMatch = text.match(/berechne\s+(\d+(?:,\d+)?)\s*\+\s*\(\s*-\s*(\d+(?:,\d+)?)\s*\)/i);
    if (negativeMatch) {
      const num1 = parseFloat(negativeMatch[1].replace(',', '.'));
      const num2 = parseFloat(negativeMatch[2].replace(',', '.'));
      const result = num1 - num2; // 5 + (-3) = 5 - 3
      
      return {
        success: true,
        answer: result.toString().replace('.', ','),
        questionType: 'arithmetic',
        confidence: 0.95,
        steps: [`${num1} + (-${num2}) = ${num1} - ${num2} = ${result}`],
        metadata: {
          operation: 'negative_addition',
          operands: [num1, -num2]
        }
      };
    }

    // Extract numbers from the text for other operations
    const numbers = text.match(/\d+(?:,\d+)?/g)?.map(n => parseFloat(n.replace(',', '.'))) || [];
    
    if (numbers.length < 2) return { success: false };

    // Determine operation based on keywords
    let operation: string;
    let result: number;
    let steps: string[] = [];
    let unit = '';

    // Extract unit from text
    if (text.includes('euro')) unit = ' Euro';
    if (text.includes('brote') || text.includes('brötchen')) unit = ' Brote';
    if (text.includes('kekse')) unit = ' Kekse';
    if (text.includes('äpfel')) unit = ' Äpfel';
    if (text.includes('meter') || text.includes('cm')) unit = text.includes('cm') ? 'cm' : 'm';

    // FIXED: "pro Stunde" multiplication patterns
    if (text.includes('pro stunde') && text.includes('stunde')) {
      const proHourMatch = text.match(/(\d+).*pro stunde.*(\d+).*stunde/i);
      if (proHourMatch && numbers.length >= 2) {
        operation = 'multiplication';
        result = numbers[0] * numbers[1];
        steps = [`${numbers[0]} pro Stunde × ${numbers[1]} Stunden = ${result}${unit}`];
        
        return {
          success: true,
          answer: result + unit,
          questionType: 'word-problem',
          confidence: 0.95,
          steps,
          metadata: {
            operation,
            operands: numbers,
            unit
          }
        };
      }
    }

    // Other operations
    if (text.includes('zusammen') || text.includes('insgesamt') || text.includes('addier')) {
      operation = 'addition';
      result = numbers.reduce((sum, num) => sum + num, 0);
      steps = [`${numbers.join(' + ')} = ${result}${unit}`];
    } else if (text.includes('weniger') || text.includes('verliert') || text.includes('subtrah')) {
      operation = 'subtraction';
      result = numbers[0] - numbers[1];
      steps = [`${numbers[0]} - ${numbers[1]} = ${result}${unit}`];
    } else if (text.includes('mal') || text.includes('multipli') || text.includes('vervielfach')) {
      operation = 'multiplication';
      result = numbers[0] * numbers[1];
      steps = [`${numbers[0]} × ${numbers[1]} = ${result}${unit}`];
    } else if (text.includes('teil') || text.includes('divid') || text.includes('aufgeteilt')) {
      operation = 'division';
      result = Math.floor(numbers[0] / numbers[1]);
      steps = [`${numbers[0]} ÷ ${numbers[1]} = ${result}${unit}`];
    } else {
      return { success: false };
    }

    return {
      success: true,
      answer: result + unit,
      questionType: 'word-problem',
      confidence: 0.85,
      steps,
      metadata: {
        operation,
        operands: numbers,
        unit
      }
    };
  }

  /**
   * Enhanced geometry parsing - FIXED perimeter and area with units
   */
  private static parseEnhancedGeometry(text: string): ParsedMathResult {
    const numbers = text.match(/\d+(?:,\d+)?/g)?.map(n => parseFloat(n.replace(',', '.'))) || [];
    
    if (numbers.length === 0) return { success: false };

    let result: number;
    let steps: string[] = [];
    let operation: string;
    let unit = '';

    // Extract unit
    if (text.includes('cm')) unit = 'cm';
    else if (text.includes('m') && !text.includes('cm')) unit = 'm';

    if (text.includes('fläche') || text.includes('flächeninhalt')) {
      if (text.includes('rechteck') && numbers.length >= 2) {
        operation = 'rectangle_area';
        result = numbers[0] * numbers[1];
        const areaUnit = unit ? unit + '²' : '';
        steps = [`Fläche = Länge × Breite`, `Fläche = ${numbers[0]} × ${numbers[1]} = ${result}${areaUnit}`];
        
        return {
          success: true,
          answer: result + areaUnit,
          questionType: 'geometry',
          confidence: 0.9,
          steps,
          metadata: {
            operation,
            operands: numbers,
            unit: areaUnit
          }
        };
      } else if (text.includes('quadrat') && numbers.length >= 1) {
        operation = 'square_area';
        result = numbers[0] * numbers[0];
        const areaUnit = unit ? unit + '²' : '';
        steps = [`Fläche = Seitenlänge²`, `Fläche = ${numbers[0]}² = ${result}${areaUnit}`];
        
        return {
          success: true,
          answer: result + areaUnit,
          questionType: 'geometry',
          confidence: 0.9,
          steps,
          metadata: {
            operation,
            operands: [numbers[0]],
            unit: areaUnit
          }
        };
      }
    } else if (text.includes('umfang')) {
      if (text.includes('rechteck') && numbers.length >= 2) {
        operation = 'rectangle_perimeter';
        result = 2 * (numbers[0] + numbers[1]);
        steps = [`Umfang = 2 × (Länge + Breite)`, `Umfang = 2 × (${numbers[0]} + ${numbers[1]}) = 2 × ${numbers[0] + numbers[1]} = ${result}${unit}`];
        
        return {
          success: true,
          answer: result + unit,
          questionType: 'geometry',
          confidence: 0.9,
          steps,
          metadata: {
            operation,
            operands: numbers,
            unit
          }
        };
      } else if (text.includes('quadrat') && numbers.length >= 1) {
        operation = 'square_perimeter';
        result = 4 * numbers[0];
        steps = [`Umfang = 4 × Seitenlänge`, `Umfang = 4 × ${numbers[0]} = ${result}${unit}`];
        
        return {
          success: true,
          answer: result + unit,
          questionType: 'geometry',
          confidence: 0.9,
          steps,
          metadata: {
            operation,
            operands: [numbers[0]],
            unit
          }
        };
      }
    }

    return { success: false };
  }

  /**
   * Enhanced decimal parsing
   */
  private static parseEnhancedDecimals(text: string): ParsedMathResult {
    const decimalRegex = /(\d+,\d+)\s*([+\-×÷*\/])\s*(\d+,\d+)/;
    const match = text.match(decimalRegex);
    
    if (!match) return { success: false };

    const [, num1Str, operator, num2Str] = match;
    const num1 = parseFloat(num1Str.replace(',', '.'));
    const num2 = parseFloat(num2Str.replace(',', '.'));

    let result: number;
    let operation: string;

    switch (operator) {
      case '+':
        result = num1 + num2;
        operation = 'addition';
        break;
      case '-':
        result = num1 - num2;
        operation = 'subtraction';
        break;
      case '×':
      case '*':
        result = num1 * num2;
        operation = 'multiplication';
        break;
      case '÷':
      case '/':
        result = num1 / num2;
        operation = 'division';
        break;
      default:
        return { success: false };
    }

    const formattedResult = result.toFixed(2).replace('.', ',');

    return {
      success: true,
      answer: formattedResult,
      questionType: 'arithmetic',
      confidence: 0.95,
      steps: [`${num1Str} ${operator} ${num2Str} = ${formattedResult}`],
      metadata: {
        operation,
        operands: [num1, num2]
      }
    };
  }

  /**
   * Pattern handler methods
   */
  private static parseArithmeticPattern(match: RegExpMatchArray, question: string): ParsedMathResult {
    const [, num1Str, operator, num2Str] = match;
    const num1 = parseFloat(num1Str.replace(',', '.'));
    const num2 = parseFloat(num2Str.replace(',', '.'));

    let result: number;
    let operation: string;

    switch (operator) {
      case '+':
        result = num1 + num2;
        operation = 'addition';
        break;
      case '-':
        result = num1 - num2;
        operation = 'subtraction';
        break;
      case '×':
      case '*':
        result = num1 * num2;
        operation = 'multiplication';
        break;
      case '÷':
      case '/':
        result = num1 / num2;
        operation = 'division';
        break;
      default:
        return { success: false };
    }

    return {
      success: true,
      answer: result,
      questionType: 'arithmetic',
      confidence: 0.95,
      steps: [`${num1Str} ${operator} ${num2Str} = ${result}`],
      metadata: {
        operation,
        operands: [num1, num2]
      }
    };
  }

  private static parseTimePattern(match: RegExpMatchArray): ParsedMathResult {
    const [, hoursStr, minutesStr] = match;
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr || '0');
    
    const totalMinutes = hours * 60 + minutes;

    return {
      success: true,
      answer: totalMinutes,
      questionType: 'arithmetic',
      confidence: 0.8,
      steps: [`${hours} Stunden = ${hours * 60} Minuten`, `${hours * 60} + ${minutes} = ${totalMinutes} Minuten`],
      metadata: {
        operation: 'time_conversion',
        operands: [hours, minutes],
        unit: 'minutes'
      }
    };
  }

  private static parseMoneyPattern(match: RegExpMatchArray): ParsedMathResult {
    const [, euroStr, centStr] = match;
    const euros = parseFloat(euroStr.replace(',', '.'));
    const cents = parseInt(centStr || '0');
    
    const totalCents = euros * 100 + cents;

    return {
      success: true,
      answer: totalCents,
      questionType: 'arithmetic',
      confidence: 0.8,
      steps: [`${euros} Euro = ${euros * 100} Cent`, `${euros * 100} + ${cents} = ${totalCents} Cent`],
      metadata: {
        operation: 'money_conversion',
        operands: [euros, cents],
        unit: 'cents'
      }
    };
  }

  private static parsePercentagePattern(match: RegExpMatchArray): ParsedMathResult {
    const [, percentStr, baseStr] = match;
    const percent = parseFloat(percentStr.replace(',', '.'));
    const base = parseFloat(baseStr.replace(',', '.'));
    
    const result = (percent / 100) * base;
    
    // Handle special cases for common percentage problems
    let answer = result.toString();
    let unit = '';
    
    // Check for common units in percentage problems
    if (match.input?.includes('schüler')) {
      answer = Math.round(result) + ' Schüler';
      unit = ' Schüler';
    } else if (match.input?.includes('euro')) {
      answer = result.toFixed(2) + ' Euro';
      unit = ' Euro';
    } else {
      answer = result % 1 === 0 ? result.toString() : result.toFixed(2);
    }

    return {
      success: true,
      answer: answer,
      questionType: 'arithmetic',
      confidence: 0.9,
      steps: [`${percent}% von ${base}`, `${percent} ÷ 100 × ${base} = ${result}${unit}`],
      metadata: {
        operation: 'percentage',
        operands: [percent, base],
        unit
      }
    };
  }

  /**
   * Question type detection
   */
  private static detectQuestionType(question: string): 'arithmetic' | 'word-problem' | 'comparison' | 'geometry' | 'fraction' {
    const text = question.toLowerCase();
    
    if (text.includes('bruch')) return 'fraction';
    if (text.includes('fläche') || text.includes('umfang') || text.includes('rechteck') || text.includes('quadrat')) return 'geometry';
    if (text.includes('größer') || text.includes('kleiner') || text.includes('vergleich')) return 'comparison';
    if (text.match(/\d+\s*[+\-×÷*\/]\s*\d+/)) return 'arithmetic';
    
    return 'word-problem';
  }

  /**
   * Helper methods
   */
  private static isWordProblem(text: string): boolean {
    const wordProblemKeywords = [
      'hat', 'kauft', 'kostet', 'verkauft', 'bekommt', 'verliert',
      'zusammen', 'insgesamt', 'weniger', 'mehr', 'aufgeteilt'
    ];
    
    return wordProblemKeywords.some(keyword => text.includes(keyword));
  }

  private static isGeometryProblem(text: string): boolean {
    const geometryKeywords = ['fläche', 'umfang', 'rechteck', 'quadrat', 'kreis', 'dreieck'];
    return geometryKeywords.some(keyword => text.includes(keyword));
  }

  private static extractMetadata(question: string, answer: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract units
    if (question.includes('euro') || question.includes('cent')) metadata.unit = 'currency';
    if (question.includes('meter') || question.includes('cm')) metadata.unit = 'length';
    if (question.includes('minuten') || question.includes('stunden')) metadata.unit = 'time';
    
    // Extract operation type
    if (question.includes('+') || question.includes('addier')) metadata.operation = 'addition';
    if (question.includes('-') || question.includes('subtrah')) metadata.operation = 'subtraction';
    if (question.includes('×') || question.includes('mal')) metadata.operation = 'multiplication';
    if (question.includes('÷') || question.includes('teil')) metadata.operation = 'division';
    
    return metadata;
  }
}