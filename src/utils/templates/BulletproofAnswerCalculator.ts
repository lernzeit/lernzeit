/**
 * BULLETPROOF ANSWER CALCULATOR
 * 
 * Systematische, fehlerfreie Lösung für alle Arten von Mathe-Aufgaben.
 * Nutzt die bereits vorhandenen, ausgereiften Parser für maximale Zuverlässigkeit.
 */

import { QuestionTemplate } from '../questionTemplates';
import { GermanMathParser, MathParseResult } from '../math/germanMathParser';
import { ImprovedGermanMathParser, ParsedMathResult } from '../math/ImprovedGermanMathParser';

export interface BulletproofCalculationResult {
  answer: string | number;
  isValid: boolean;
  confidence: number; // 0-1, how confident we are in the result
  calculationMethod: 'parser' | 'template' | 'fallback';
  steps: string[];
  errors: string[];
  metadata?: {
    operation?: string;
    operands?: number[];
    unit?: string;
  };
}

export class BulletproofAnswerCalculator {
  
  /**
   * MAIN ENTRY POINT - Berechnet Antworten mit höchster Zuverlässigkeit
   */
  static calculateAnswer(
    template: QuestionTemplate, 
    params: Record<string, any>,
    questionText?: string
  ): BulletproofCalculationResult {
    console.log('🎯 BulletproofAnswerCalculator started:', { template: template.id, params, questionText });
    
    try {
      // SCHRITT 1: Input-Validierung
      const inputValidation = this.validateInputs(template, params);
      if (!inputValidation.isValid) {
        return {
          answer: '',
          isValid: false,
          confidence: 0,
          calculationMethod: 'fallback',
          steps: ['Input-Validierung fehlgeschlagen'],
          errors: inputValidation.errors
        };
      }

      // SCHRITT 2: Parser-basierte Berechnung (HÖCHSTE PRIORITÄT)
      if (questionText) {
        const parserResult = this.calculateUsingParsers(questionText);
        if (parserResult.isValid && parserResult.confidence >= 0.8) {
          console.log('✅ Parser-basierte Berechnung erfolgreich:', parserResult);
          return parserResult;
        }
      }

      // SCHRITT 3: Template-basierte Berechnung
      const templateResult = this.calculateUsingTemplate(template, params);
      if (templateResult.isValid) {
        console.log('✅ Template-basierte Berechnung erfolgreich:', templateResult);
        return templateResult;
      }

      // SCHRITT 4: Erweiterte Fallback-Berechnung
      const fallbackResult = this.calculateUsingFallback(template, params, questionText);
      console.log('⚠️ Fallback-Berechnung verwendet:', fallbackResult);
      return fallbackResult;

    } catch (error) {
      console.error('❌ Kritischer Fehler in BulletproofAnswerCalculator:', error);
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'fallback',
        steps: ['Kritischer Fehler aufgetreten'],
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler']
      };
    }
  }

  /**
   * SCHRITT 2: Parser-basierte Berechnung (nutzt vorhandene, ausgereifte Parser)
   */
  private static calculateUsingParsers(questionText: string): BulletproofCalculationResult {
    const steps: string[] = [];
    
    try {
      steps.push('Verwende ausgereiften ImprovedGermanMathParser');
      
      // Zuerst den verbesserten Parser versuchen
      const improvedResult: ParsedMathResult = ImprovedGermanMathParser.parse(questionText);
      
      if (improvedResult.success && improvedResult.answer !== undefined) {
        steps.push(`Parser erfolgreich: ${improvedResult.answer}`);
        steps.push(...(improvedResult.steps || []));
        
        return {
          answer: improvedResult.answer,
          isValid: true,
          confidence: improvedResult.confidence || 0.9,
          calculationMethod: 'parser',
          steps,
          errors: [],
          metadata: improvedResult.metadata
        };
      }

      // Fallback auf Basis-Parser
      steps.push('Fallback auf GermanMathParser');
      const basicResult: MathParseResult = GermanMathParser.parse(questionText);
      
      if (basicResult.success && basicResult.answer !== undefined) {
        steps.push(`Basis-Parser erfolgreich: ${basicResult.answer}`);
        steps.push(...(basicResult.steps || []));
        
        return {
          answer: basicResult.answer,
          isValid: true,
          confidence: 0.8,
          calculationMethod: 'parser',
          steps,
          errors: [],
          metadata: {
            operation: basicResult.expression ? 'parsed_expression' : 'unknown'
          }
        };
      }

      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'parser',
        steps,
        errors: ['Parser konnte Aufgabe nicht verarbeiten']
      };

    } catch (error) {
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'parser',
        steps,
        errors: [`Parser-Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`]
      };
    }
  }

  /**
   * SCHRITT 3: Template-basierte Berechnung (systematisch für alle Template-Typen)
   */
  private static calculateUsingTemplate(
    template: QuestionTemplate, 
    params: Record<string, any>
  ): BulletproofCalculationResult {
    const steps: string[] = [];
    const errors: string[] = [];
    
    try {
      steps.push(`Template-basierte Berechnung für ${template.id}`);
      
      // Spezielle Template-Handler
      const handlers = this.getTemplateHandlers();
      
      for (const handler of handlers) {
        if (handler.matches(template)) {
          steps.push(`Verwende Handler: ${handler.name}`);
          const result = handler.calculate(template, params, steps);
          
          if (result.isValid) {
            return {
              ...result,
              calculationMethod: 'template',
              steps,
              errors
            };
          } else {
            errors.push(`Handler ${handler.name} fehlgeschlagen: ${result.errors.join(', ')}`);
          }
        }
      }

      // Kein Handler gefunden
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'template',
        steps,
        errors: [`Kein passender Handler für Template ${template.id} gefunden`]
      };

    } catch (error) {
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'template',
        steps,
        errors: [`Template-Handler Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`]
      };
    }
  }

  /**
   * SCHRITT 4: Erweiterte Fallback-Berechnung
   */
  private static calculateUsingFallback(
    template: QuestionTemplate, 
    params: Record<string, any>,
    questionText?: string
  ): BulletproofCalculationResult {
    const steps: string[] = [];
    steps.push('Fallback-Berechnung aktiviert');

    // Grundlegende mathematische Operationen als letzter Ausweg
    try {
      if (template.category === 'Mathematik' || template.category === 'math') {
        // Versuche numerische Parameter zu finden
        const numbers = Object.values(params).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
        
        if (numbers.length >= 2) {
          // Einfache Operationen basierend auf Template-ID
          if (template.id.includes('addition') || template.id.includes('add')) {
            const result = numbers[0] + numbers[1];
            steps.push(`Fallback Addition: ${numbers[0]} + ${numbers[1]} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.6,
              calculationMethod: 'fallback',
              steps,
              errors: ['Verwendung von Fallback-Logik'],
              metadata: { operation: 'addition', operands: numbers.slice(0, 2) }
            };
          }
          
          if (template.id.includes('subtraction') || template.id.includes('sub')) {
            const result = numbers[0] - numbers[1];
            steps.push(`Fallback Subtraktion: ${numbers[0]} - ${numbers[1]} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.6,
              calculationMethod: 'fallback',
              steps,
              errors: ['Verwendung von Fallback-Logik'],
              metadata: { operation: 'subtraction', operands: numbers.slice(0, 2) }
            };
          }
          
          if (template.id.includes('multiplication') || template.id.includes('mult')) {
            const result = numbers[0] * numbers[1];
            steps.push(`Fallback Multiplikation: ${numbers[0]} × ${numbers[1]} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.6,
              calculationMethod: 'fallback',
              steps,
              errors: ['Verwendung von Fallback-Logik'],
              metadata: { operation: 'multiplication', operands: numbers.slice(0, 2) }
            };
          }
        }
      }

      // Wenn alles andere fehlschlägt - sichere Standardantwort
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'fallback',
        steps: [...steps, 'Alle Berechnungsmethoden fehlgeschlagen'],
        errors: ['Aufgabe konnte nicht berechnet werden']
      };

    } catch (error) {
      return {
        answer: '',
        isValid: false,
        confidence: 0,
        calculationMethod: 'fallback',
        steps,
        errors: [`Fallback-Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`]
      };
    }
  }

  /**
   * Template-Handler für verschiedene Aufgabentypen
   */
  private static getTemplateHandlers() {
    return [
      // Addition Handler
      {
        name: 'AdditionHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('addition') || template.id.includes('add') || template.id.includes('plus'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          const { a, b } = params;
          if (typeof a === 'number' && typeof b === 'number') {
            const result = a + b;
            steps.push(`Addition: ${a} + ${b} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.95,
              errors: [],
              metadata: { operation: 'addition', operands: [a, b] }
            };
          }
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Addition Parameter'] };
        }
      },
      
      // Subtraktion Handler  
      {
        name: 'SubtractionHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('subtraction') || template.id.includes('minus') || template.id.includes('sub'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          const { a, b } = params;
          if (typeof a === 'number' && typeof b === 'number') {
            const result = a - b;
            steps.push(`Subtraktion: ${a} - ${b} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.95,
              errors: [],
              metadata: { operation: 'subtraction', operands: [a, b] }
            };
          }
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Subtraktions Parameter'] };
        }
      },
      
      // Multiplikation Handler
      {
        name: 'MultiplicationHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('multiplication') || template.id.includes('mult') || template.id.includes('times'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          let { a, b } = params;
          
          // Handle implicit multipliers
          if (b === undefined || b === null) {
            if (template.id.includes('by_2')) b = 2;
            else if (template.id.includes('by_5')) b = 5;
            else if (template.id.includes('by_6')) b = 6;
            else if (template.id.includes('by_7')) b = 7;
            else if (template.id.includes('by_10')) b = 10;
          }
          
          if (typeof a === 'number' && typeof b === 'number') {
            const result = a * b;
            steps.push(`Multiplikation: ${a} × ${b} = ${result}`);
            return {
              answer: result,
              isValid: true,
              confidence: 0.95,
              errors: [],
              metadata: { operation: 'multiplication', operands: [a, b] }
            };
          }
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Multiplikations Parameter'] };
        }
      },
      
      // Division Handler
      {
        name: 'DivisionHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('division') || template.id.includes('div') || template.id.includes('divide'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          const { dividend, divisor, quotient } = params;
          
          if (template.id.includes('remainder') || template.id.includes('rest')) {
            if (typeof dividend === 'number' && typeof divisor === 'number' && divisor !== 0) {
              const quotientResult = Math.floor(dividend / divisor);
              const remainder = dividend % divisor;
              const result = `${quotientResult} Rest ${remainder}`;
              steps.push(`Division mit Rest: ${dividend} ÷ ${divisor} = ${result}`);
              return {
                answer: result,
                isValid: true,
                confidence: 0.95,
                errors: [],
                metadata: { operation: 'division_with_remainder', operands: [dividend, divisor] }
              };
            }
          } else {
            if (typeof divisor === 'number' && typeof quotient === 'number' && divisor !== 0) {
              const result = quotient;
              steps.push(`Division: ${divisor} × ${quotient} = ${divisor * quotient}`);
              return {
                answer: result,
                isValid: true,
                confidence: 0.95,
                errors: [],
                metadata: { operation: 'division', operands: [divisor, quotient] }
              };
            }
          }
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Divisions Parameter oder Division durch Null'] };
        }
      },
      
      // Geometrie Handler
      {
        name: 'GeometryHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('area') || template.id.includes('perimeter') || template.id.includes('fläche') || template.id.includes('umfang'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          if (template.id.includes('area_square') || template.id.includes('quadrat')) {
            const { side } = params;
            if (typeof side === 'number') {
              const result = side * side;
              steps.push(`Quadratfläche: ${side} × ${side} = ${result} cm²`);
              return {
                answer: result,
                isValid: true,
                confidence: 0.95,
                errors: [],
                metadata: { operation: 'square_area', operands: [side], unit: 'cm²' }
              };
            }
          }
          
          if (template.id.includes('area_rectangle') || template.id.includes('rechteck')) {
            const { length, width } = params;
            if (typeof length === 'number' && typeof width === 'number') {
              const result = length * width;
              steps.push(`Rechteckfläche: ${length} × ${width} = ${result} cm²`);
              return {
                answer: result,
                isValid: true,
                confidence: 0.95,
                errors: [],
                metadata: { operation: 'rectangle_area', operands: [length, width], unit: 'cm²' }
              };
            }
          }
          
          if (template.id.includes('perimeter_rectangle')) {
            const { length, width } = params;
            if (typeof length === 'number' && typeof width === 'number') {
              const result = 2 * (length + width);
              steps.push(`Rechteck-Umfang: 2 × (${length} + ${width}) = ${result} cm`);
              return {
                answer: result,
                isValid: true,
                confidence: 0.95,
                errors: [],
                metadata: { operation: 'rectangle_perimeter', operands: [length, width], unit: 'cm' }
              };
            }
          }
          
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Geometrie Parameter'] };
        }
      },
      
      // Bruch-Vergleich Handler
      {
        name: 'FractionComparisonHandler',
        matches: (template: QuestionTemplate) => 
          template.id.includes('fraction_comparison') || template.id.includes('bruch'),
        calculate: (template: QuestionTemplate, params: Record<string, any>, steps: string[]) => {
          const { a, b } = params;
          if (typeof a === 'number' && typeof b === 'number' && a > 0 && b > 0) {
            const fraction1 = 1 / a;
            const fraction2 = 1 / b;
            
            steps.push(`Bruchvergleich: 1/${a} vs 1/${b}`);
            steps.push(`1/${a} = ${fraction1.toFixed(4)}, 1/${b} = ${fraction2.toFixed(4)}`);
            
            const largerFraction = fraction1 > fraction2 ? `1/${a}` : `1/${b}`;
            const largerDecimal = Math.max(fraction1, fraction2);
            
            steps.push(`Größerer Bruch: ${largerFraction} = ${largerDecimal.toFixed(2).replace('.', ',')}`);
            
            return {
              answer: largerDecimal.toFixed(2).replace('.', ','),
              isValid: true,
              confidence: 0.95,
              errors: [],
              metadata: { operation: 'fraction_comparison', operands: [a, b] }
            };
          }
          return { answer: '', isValid: false, confidence: 0, errors: ['Ungültige Bruch-Parameter'] };
        }
      }
    ];
  }

  /**
   * Input-Validierung
   */
  private static validateInputs(template: QuestionTemplate, params: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Überprüfe Template-Validität
    if (!template || !template.id) {
      errors.push('Template ist ungültig oder fehlt');
      return { isValid: false, errors };
    }
    
    // Überprüfe Parameter-Objekt
    if (!params || typeof params !== 'object') {
      errors.push('Parameter-Objekt ist ungültig');
      return { isValid: false, errors };
    }
    
    // Überprüfe Template-Parameter
    if (template.parameters && Array.isArray(template.parameters)) {
      for (const paramDef of template.parameters) {
        if (!(paramDef.name in params)) {
          errors.push(`Fehlender Parameter: ${paramDef.name}`);
          continue;
        }
        
        const value = params[paramDef.name];
        
        // Type-Validierung
        if (paramDef.type === 'number') {
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            errors.push(`Parameter ${paramDef.name} muss eine gültige endliche Zahl sein, erhalten: ${value}`);
          }
          
          // Range-Validierung
          if (paramDef.range && typeof value === 'number') {
            const [min, max] = paramDef.range;
            if (value < min || value > max) {
              errors.push(`Parameter ${paramDef.name} (${value}) außerhalb des gültigen Bereichs [${min}, ${max}]`);
            }
          }
        } else if (paramDef.type === 'word') {
          if (typeof value !== 'string' || value.length === 0) {
            errors.push(`Parameter ${paramDef.name} muss ein nicht-leerer String sein`);
          }
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}