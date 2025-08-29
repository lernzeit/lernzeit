/**
 * Step-by-Step Explainer for Math Questions
 * Simplified implementation focused on math problems
 */

import { SelectionQuestion } from '@/types/questionTypes';

export interface ExplanationStep {
  step: number;
  description: string;
  calculation?: string;
}

export interface MathExplanation {
  summary: string;
  steps: ExplanationStep[];
  tips?: string[];
}

export class StepByStepExplainer {
  /**
   * Generate explanation for a math question with dynamic parameter extraction
   */
  static generateExplanation(
    question: SelectionQuestion,
    answer: any,
    grade: number,
    params?: Record<string, any>
  ): MathExplanation {
    const questionText = question.question.toLowerCase();
    
    // Detect operation type
    if (questionText.includes('+')) {
      return this.explainAddition(question, answer, grade);
    } else if (questionText.includes('-')) {
      return this.explainSubtraction(question, answer, grade);
    } else if (questionText.includes('×') || questionText.includes('*')) {
      return this.explainMultiplication(question, answer, grade);
    } else if (questionText.includes('÷') || questionText.includes('/')) {
      return this.explainDivision(question, answer, grade);
    } else if (questionText.includes('umfang') || questionText.includes('perimeter')) {
      return this.explainPerimeter(question, answer, grade);
    } else if (questionText.includes('fläche') || questionText.includes('area')) {
      return this.explainArea(question, answer, grade);
    }

    // Default explanation
    return {
      summary: `Die Lösung ist ${answer}.`,
      steps: [
        {
          step: 1,
          description: 'Lies die Aufgabe sorgfältig durch'
        },
        {
          step: 2,
          description: 'Bestimme die gesuchte Größe'
        },
        {
          step: 3,
          description: `Das Ergebnis ist ${answer}`
        }
      ]
    };
  }

  private static explainAddition(question: SelectionQuestion, answer: any, grade: number, params?: Record<string, any>): MathExplanation {
    // Use parameters if available, otherwise extract from question
    let numbers: number[] = [];
    
    if (params) {
      numbers = Object.values(params).filter(v => typeof v === 'number') as number[];
    }
    
    if (numbers.length === 0) {
      numbers = question.question.match(/\d+/g)?.map(Number) || [];
    }
    
    if (numbers.length >= 2) {
      const [a, b] = numbers;
      return {
        summary: `Addiere ${a} + ${b} = ${answer}`,
        steps: [
          { step: 1, description: `Erkenne die erste Zahl: ${a}` },
          { step: 2, description: `Erkenne die zweite Zahl: ${b}` },
          { step: 3, description: `Addiere: ${a} + ${b}`, calculation: `${a} + ${b} = ${answer}` }
        ],
        tips: this.getGradeTips('addition', grade)
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static explainSubtraction(question: SelectionQuestion, answer: any, grade: number): MathExplanation {
    const numbers = question.question.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length >= 2) {
      return {
        summary: `Subtrahiere ${numbers[0]} - ${numbers[1]} = ${answer}`,
        steps: [
          { step: 1, description: `Erkenne die erste Zahl: ${numbers[0]}` },
          { step: 2, description: `Erkenne die zweite Zahl: ${numbers[1]}` },
          { step: 3, description: `Subtrahiere: ${numbers[0]} - ${numbers[1]}`, calculation: `${numbers[0]} - ${numbers[1]} = ${answer}` }
        ],
        tips: grade <= 2 ? ['Beginne mit der größeren Zahl und zähle rückwärts'] : []
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static explainMultiplication(question: SelectionQuestion, answer: any, grade: number): MathExplanation {
    const numbers = question.question.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length >= 2) {
      return {
        summary: `Multipliziere ${numbers[0]} × ${numbers[1]} = ${answer}`,
        steps: [
          { step: 1, description: `Erkenne die erste Zahl: ${numbers[0]}` },
          { step: 2, description: `Erkenne die zweite Zahl: ${numbers[1]}` },
          { step: 3, description: `Multipliziere: ${numbers[0]} × ${numbers[1]}`, calculation: `${numbers[0]} × ${numbers[1]} = ${answer}` }
        ],
        tips: grade <= 3 ? ['Multiplikation ist wiederholte Addition'] : []
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static explainDivision(question: SelectionQuestion, answer: any, grade: number): MathExplanation {
    const numbers = question.question.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length >= 2) {
      return {
        summary: `Dividiere ${numbers[0]} ÷ ${numbers[1]} = ${answer}`,
        steps: [
          { step: 1, description: `Erkenne die erste Zahl: ${numbers[0]}` },
          { step: 2, description: `Erkenne die zweite Zahl: ${numbers[1]}` },
          { step: 3, description: `Dividiere: ${numbers[0]} ÷ ${numbers[1]}`, calculation: `${numbers[0]} ÷ ${numbers[1]} = ${answer}` }
        ],
        tips: ['Division ist das Gegenteil der Multiplikation']
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static explainPerimeter(question: SelectionQuestion, answer: any, grade: number): MathExplanation {
    const numbers = question.question.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length >= 2) {
      const [length, width] = numbers;
      return {
        summary: `Umfang des Rechtecks: 2 × (${length} + ${width}) = ${answer}`,
        steps: [
          { step: 1, description: `Länge: ${length}` },
          { step: 2, description: `Breite: ${width}` },
          { step: 3, description: `Formel: 2 × (Länge + Breite)` },
          { step: 4, description: `Berechnung: 2 × (${length} + ${width})`, calculation: `2 × ${length + width} = ${answer}` }
        ],
        tips: ['Der Umfang ist die Summe aller Seitenlängen']
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static explainArea(question: SelectionQuestion, answer: any, grade: number): MathExplanation {
    const numbers = question.question.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length >= 2) {
      const [length, width] = numbers;
      return {
        summary: `Fläche des Rechtecks: ${length} × ${width} = ${answer}`,
        steps: [
          { step: 1, description: `Länge: ${length}` },
          { step: 2, description: `Breite: ${width}` },
          { step: 3, description: `Formel: Länge × Breite` },
          { step: 4, description: `Berechnung: ${length} × ${width}`, calculation: `${length} × ${width} = ${answer}` }
        ],
        tips: ['Die Fläche wird in Quadrateinheiten gemessen']
      };
    }

    return this.getDefaultExplanation(answer);
  }

  private static getDefaultExplanation(answer: any): MathExplanation {
    return {
      summary: `Die Lösung ist ${answer}.`,
      steps: [
        { step: 1, description: 'Lies die Aufgabe sorgfältig durch' },
        { step: 2, description: 'Bestimme die gesuchte Größe' },
        { step: 3, description: `Das Ergebnis ist ${answer}` }
      ]
    };
  }

  /**
   * Get age-appropriate tips based on grade level and operation
   */
  private static getGradeTips(operation: string, grade: number): string[] {
    const tipMap: Record<string, Record<number, string[]>> = {
      addition: {
        1: ['Du kannst deine Finger zum Zählen verwenden', 'Beginne mit der größeren Zahl und zähle weiter'],
        2: ['Denke an die Zahlenreihe', 'Nutze Hilfsmittel wie Rechensteine'],
        3: ['Denke in Zehnerschritten', 'Zerlege große Zahlen in kleinere Teile'],
        4: ['Nutze das Kopfrechnen', 'Erkenne Zahlenmuster']
      },
      subtraction: {
        1: ['Beginne mit der größeren Zahl und zähle rückwärts', 'Nutze Gegenstände zum Wegnehmen'],
        2: ['Denke an das Ergänzen zur größeren Zahl', 'Nutze die Zahlenreihe rückwärts'],
        3: ['Nutze den Zehnerübergang', 'Zerlege in einfachere Schritte'],
        4: ['Prüfe dein Ergebnis durch Addition', 'Nutze Kopfrechentricks']
      },
      multiplication: {
        2: ['Multiplikation ist wiederholte Addition', 'Nutze das kleine Einmaleins'],
        3: ['Lerne die Einmaleinsreihen auswendig', 'Nutze Kommutativgesetz: 3×4 = 4×3'],
        4: ['Nutze Zerlegungen: 6×8 = 6×4×2', 'Denke in Quadraten: 5×5 = 25']
      },
      division: {
        3: ['Division ist das Gegenteil der Multiplikation', 'Denke: "Wie oft passt die Zahl hinein?"'],
        4: ['Nutze das Einmaleins zur Kontrolle', 'Prüfe mit der Umkehraufgabe']
      }
    };

    const gradeLevel = Math.max(1, Math.min(4, grade));
    return tipMap[operation]?.[gradeLevel] || [];
  }
}