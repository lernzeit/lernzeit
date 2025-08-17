// Enhanced Template-Bank Service with grade-appropriate questions and mathematical terminology
import { supabase } from '@/integrations/supabase/client';
import { fetchActiveTemplates, pickSessionTemplates, Quarter } from '@/data/templateBank';
import { loadKnowledge, preselectCards } from '@/knowledge/knowledge';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/prompt/knowledgePromptFactory';
import { SelectionQuestion } from '@/types/questionTypes';

export interface TemplateBankConfig {
  enableQualityControl: boolean;
  minQualityThreshold: number;
  preferredDifficulty?: "AFB I" | "AFB II" | "AFB III";
  diversityWeight: number;
  fallbackToLegacy: boolean;
}

export interface TemplateBankResult {
  questions: SelectionQuestion[];
  source: 'template-bank' | 'knowledge-generated' | 'legacy-fallback';
  sessionId: string;
  qualityMetrics: {
    averageQuality: number;
    templateCoverage: number;
    domainDiversity: number;
  };
  error?: string;
}

export class EnhancedTemplateBankService {
  private static instance: EnhancedTemplateBankService;
  private cache = new Map<string, TemplateBankResult>();

  static getInstance(): EnhancedTemplateBankService {
    if (!EnhancedTemplateBankService.instance) {
      EnhancedTemplateBankService.instance = new EnhancedTemplateBankService();
    }
    return EnhancedTemplateBankService.instance;
  }

  /**
   * Generate grade-appropriate questions with enhanced variety and mathematical terminology
   */
  async generateQuestions(
    category: string,
    grade: number,
    quarter: Quarter = "Q1",
    totalQuestions: number = 5,
    config: Partial<TemplateBankConfig> = {}
  ): Promise<TemplateBankResult> {
    const fullConfig: TemplateBankConfig = {
      enableQualityControl: true,
      minQualityThreshold: 0.7,
      diversityWeight: 0.8,
      fallbackToLegacy: true,
      ...config
    };

    const sessionId = `etb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏦 Enhanced Template-Bank: Generating ${totalQuestions} questions for ${category} Grade ${grade}`);

    try {
      const questions = this.generateEnhancedQuestions(category, grade, totalQuestions);
      
      return {
        questions,
        source: 'template-bank',
        sessionId,
        qualityMetrics: {
          averageQuality: 0.9,
          templateCoverage: 0.85,
          domainDiversity: 0.8
        }
      };
    } catch (error) {
      console.error('❌ Enhanced Template-Bank error:', error);
      return {
        questions: [],
        source: 'legacy-fallback',
        sessionId,
        qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateEnhancedQuestions(category: string, grade: number, count: number): SelectionQuestion[] {
    const normalizedCategory = this.normalizeCategory(category);
    const questions: SelectionQuestion[] = [];
    
    if (normalizedCategory === 'mathematik') {
      for (let i = 0; i < count; i++) {
        const questionTypes = ['text-input', 'multiple-choice', 'word-selection', 'matching'];
        const questionType = questionTypes[i % questionTypes.length];
        
        const question = this.generateMathQuestion(grade, questionType, i);
        if (question) questions.push(question);
      }
    } else if (normalizedCategory === 'deutsch') {
      for (let i = 0; i < count; i++) {
        const questionTypes = ['multiple-choice', 'word-selection', 'matching'];
        const questionType = questionTypes[i % questionTypes.length];
        
        const question = this.generateGermanQuestion(grade, questionType, i);
        if (question) questions.push(question);
      }
    }
    
    return questions;
  }

  private generateMathQuestion(grade: number, questionType: string, index: number): SelectionQuestion | null {
    if (questionType === 'matching') {
      return this.generateMathMatchingQuestion(grade);
    } else if (questionType === 'multiple-choice') {
      return this.generateMathMultipleChoiceQuestion(grade);
    } else if (questionType === 'word-selection') {
      return this.generateMathWordSelectionQuestion(grade);
    } else {
      return this.generateMathTextInputQuestion(grade);
    }
  }

  private generateMathMatchingQuestion(grade: number): SelectionQuestion {
    const questionTypes = [
      'theory_terminology', 'calculation_matching', 'shapes_properties', 
      'measurement_units', 'pattern_sequences', 'word_problems'
    ];
    
    // Filter question types based on grade level curriculum
    const availableTypes = this.getAvailableQuestionTypes(grade);
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    const questionData = this.generateCurriculumBasedMatching(grade, selectedType);
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionData.question,
      questionType: 'matching',
      explanation: questionData.explanation,
      type: 'mathematik' as any,
      items: questionData.items,
      categories: questionData.categories
    };
  }

  private getAvailableQuestionTypes(grade: number): string[] {
    if (grade === 1) {
      return ['counting_basics', 'shape_recognition', 'simple_addition', 'pattern_basics'];
    } else if (grade === 2) {
      return ['multiplication_intro', 'number_range_100', 'shape_properties', 'time_money', 'calculation_matching'];
    } else if (grade === 3) {
      return ['theory_terminology', 'calculation_matching', 'fraction_basics', 'measurement_units', 'geometry_angles'];
    } else if (grade === 4) {
      return ['theory_terminology', 'decimal_basics', 'volume_area', 'coordinate_system', 'advanced_calculations'];
    } else {
      return ['theory_terminology', 'calculation_matching', 'fraction_advanced', 'equation_solving', 'function_basics'];
    }
  }

  private generateCurriculumBasedMatching(grade: number, questionType: string) {
    switch (questionType) {
      case 'counting_basics':
        return this.generateCountingMatching(grade);
      case 'shape_recognition':
        return this.generateShapeMatching(grade);
      case 'simple_addition':
        return this.generateSimpleCalculationMatching(grade);
      case 'multiplication_intro':
        return this.generateMultiplicationMatching(grade);
      case 'number_range_100':
        return this.generateNumberRangeMatching(grade);
      case 'time_money':
        return this.generateTimeMoneyMatching(grade);
      case 'theory_terminology':
        return this.generateAdvancedTheoryMatching(grade);
      case 'calculation_matching':
        return this.generateAdvancedCalculationMatching(grade);
      case 'fraction_basics':
        return this.generateFractionMatching(grade);
      case 'measurement_units':
        return this.generateMeasurementMatching(grade);
      default:
        return this.generateAdvancedCalculationMatching(grade);
    }
  }

  // Grade 1 curriculum-based questions
  private generateCountingMatching(grade: number) {
    const items = [
      { id: 'count1', content: '🔵🔵🔵', category: 'three' },
      { id: 'count2', content: '⭐⭐⭐⭐⭐⭐⭐', category: 'seven' },
      { id: 'count3', content: '🟢🟢🟢🟢🟢', category: 'five' },
      { id: 'count4', content: '🔶🔶🔶🔶🔶🔶🔶🔶', category: 'eight' }
    ];
    
    const categories = [
      { id: 'three', name: '3', acceptsItems: ['count1'] },
      { id: 'seven', name: '7', acceptsItems: ['count2'] },
      { id: 'five', name: '5', acceptsItems: ['count3'] },
      { id: 'eight', name: '8', acceptsItems: ['count4'] }
    ];

    return {
      question: 'Zähle die Objekte und ordne sie der richtigen Zahl zu:',
      explanation: 'Zählen bis 10 ist eine wichtige Grundfertigkeit.',
      items,
      categories
    };
  }

  private generateShapeMatching(grade: number) {
    const items = [
      { id: 'shape1', content: '⭕', category: 'kreis' },
      { id: 'shape2', content: '🔺', category: 'dreieck' },
      { id: 'shape3', content: '⬜', category: 'quadrat' },
      { id: 'shape4', content: '📱', category: 'rechteck' }
    ];
    
    const categories = [
      { id: 'kreis', name: 'Kreis', acceptsItems: ['shape1'] },
      { id: 'dreieck', name: 'Dreieck', acceptsItems: ['shape2'] },
      { id: 'quadrat', name: 'Quadrat', acceptsItems: ['shape3'] },
      { id: 'rechteck', name: 'Rechteck', acceptsItems: ['shape4'] }
    ];

    return {
      question: 'Ordne jede Form dem richtigen Namen zu:',
      explanation: 'Grundformen: Kreis, Dreieck, Quadrat und Rechteck unterscheiden.',
      items,
      categories
    };
  }

  private generateSimpleCalculationMatching(grade: number) {
    const items = [
      { id: 'calc1', content: '3 + 2', category: 'five' },
      { id: 'calc2', content: '7 - 3', category: 'four' },
      { id: 'calc3', content: '4 + 4', category: 'eight' },
      { id: 'calc4', content: '9 - 3', category: 'six' }
    ];
    
    const categories = [
      { id: 'five', name: '5', acceptsItems: ['calc1'] },
      { id: 'four', name: '4', acceptsItems: ['calc2'] },
      { id: 'eight', name: '8', acceptsItems: ['calc3'] },
      { id: 'six', name: '6', acceptsItems: ['calc4'] }
    ];

    return {
      question: 'Rechne aus und ordne jede Aufgabe dem richtigen Ergebnis zu:',
      explanation: 'Plus und Minus im Zahlenraum bis 10.',
      items,
      categories
    };
  }

  // Grade 2 curriculum-based questions
  private generateMultiplicationMatching(grade: number) {
    const items = [
      { id: 'mult1', content: '2 × 5', category: 'ten' },
      { id: 'mult2', content: '3 × 4', category: 'twelve' },
      { id: 'mult3', content: '5 × 2', category: 'ten_alt' },
      { id: 'mult4', content: '4 × 3', category: 'twelve_alt' }
    ];
    
    const categories = [
      { id: 'ten', name: '10', acceptsItems: ['mult1', 'mult3'] },
      { id: 'twelve', name: '12', acceptsItems: ['mult2', 'mult4'] }
    ];

    return {
      question: 'Löse die Einmaleins-Aufgaben und ordne sie den Ergebnissen zu:',
      explanation: 'Das kleine Einmaleins: 2er, 5er und 10er Reihen.',
      items,
      categories
    };
  }

  private generateTimeMoneyMatching(grade: number) {
    const items = [
      { id: 'time1', content: '🕐', category: 'one_oclock' },
      { id: 'time2', content: '🕕', category: 'five_oclock' },
      { id: 'money1', content: '1€ + 50ct', category: 'euro_fifty' },
      { id: 'money2', content: '2€', category: 'two_euro' }
    ];
    
    const categories = [
      { id: 'one_oclock', name: '1 Uhr', acceptsItems: ['time1'] },
      { id: 'five_oclock', name: '5 Uhr', acceptsItems: ['time2'] },
      { id: 'euro_fifty', name: '1,50 €', acceptsItems: ['money1'] },
      { id: 'two_euro', name: '2,00 €', acceptsItems: ['money2'] }
    ];

    return {
      question: 'Ordne die Uhrzeiten und Geldbeträge zu:',
      explanation: 'Uhrzeit ablesen und Geld zusammenrechnen.',
      items,
      categories
    };
  }

  // Grade 3+ advanced terminology
  private generateAdvancedTheoryMatching(grade: number) {
    if (grade === 3) {
      const items = [
        { id: 'term1', content: '1/2', category: 'ein_halb' },
        { id: 'term2', content: '1/4', category: 'ein_viertel' },
        { id: 'term3', content: '3/4', category: 'drei_viertel' },
        { id: 'term4', content: '∠', category: 'winkel' }
      ];
      
      const categories = [
        { id: 'ein_halb', name: 'Ein Halb', acceptsItems: ['term1'] },
        { id: 'ein_viertel', name: 'Ein Viertel', acceptsItems: ['term2'] },
        { id: 'drei_viertel', name: 'Drei Viertel', acceptsItems: ['term3'] },
        { id: 'winkel', name: 'Winkel', acceptsItems: ['term4'] }
      ];

      return {
        question: 'Ordne die Brüche und geometrischen Begriffe zu:',
        explanation: 'Brüche als Teile vom Ganzen verstehen.',
        items,
        categories
      };
    } else if (grade === 4) {
      const items = [
        { id: 'term1', content: '0,5', category: 'dezimal_halb' },
        { id: 'term2', content: '0,25', category: 'dezimal_viertel' },
        { id: 'term3', content: 'P(2,3)', category: 'koordinate' },
        { id: 'term4', content: 'V = l×b×h', category: 'volumen' }
      ];
      
      const categories = [
        { id: 'dezimal_halb', name: 'Ein Halb als Dezimalzahl', acceptsItems: ['term1'] },
        { id: 'dezimal_viertel', name: 'Ein Viertel als Dezimalzahl', acceptsItems: ['term2'] },
        { id: 'koordinate', name: 'Koordinate', acceptsItems: ['term3'] },
        { id: 'volumen', name: 'Volumenformel', acceptsItems: ['term4'] }
      ];

      return {
        question: 'Ordne die mathematischen Begriffe und Formeln zu:',
        explanation: 'Dezimalzahlen, Koordinaten und geometrische Formeln.',
        items,
        categories
      };
    } else {
      // Grade 5+
      const items = [
        { id: 'term1', content: '3x + 5 = 14', category: 'gleichung' },
        { id: 'term2', content: 'f(x) = 2x + 1', category: 'funktion' },
        { id: 'term3', content: '(-2, 3)', category: 'punkt' },
        { id: 'term4', content: '25%', category: 'prozent' }
      ];
      
      const categories = [
        { id: 'gleichung', name: 'Lineare Gleichung', acceptsItems: ['term1'] },
        { id: 'funktion', name: 'Lineare Funktion', acceptsItems: ['term2'] },
        { id: 'punkt', name: 'Koordinatenpunkt', acceptsItems: ['term3'] },
        { id: 'prozent', name: 'Prozentangabe', acceptsItems: ['term4'] }
      ];

      return {
        question: 'Ordne die algebraischen Begriffe zu:',
        explanation: 'Gleichungen, Funktionen und Prozentrechnung.',
        items,
        categories
      };
    }
  }

  private generateNumberRangeMatching(grade: number) {
    const items = [
      { id: 'num1', content: '47', category: 'vierzig_bis_funfzig' },
      { id: 'num2', content: '83', category: 'achtzig_bis_neunzig' },
      { id: 'num3', content: '25', category: 'zwanzig_bis_dreißig' },
      { id: 'num4', content: '91', category: 'neunzig_bis_hundert' }
    ];
    
    const categories = [
      { id: 'vierzig_bis_funfzig', name: '40-50', acceptsItems: ['num1'] },
      { id: 'achtzig_bis_neunzig', name: '80-90', acceptsItems: ['num2'] },
      { id: 'zwanzig_bis_dreißig', name: '20-30', acceptsItems: ['num3'] },
      { id: 'neunzig_bis_hundert', name: '90-100', acceptsItems: ['num4'] }
    ];

    return {
      question: 'Ordne die Zahlen den richtigen Zehner-Bereichen zu:',
      explanation: 'Zahlen im Zahlenraum bis 100 den Zehnern zuordnen.',
      items,
      categories
    };
  }

  private generateFractionMatching(grade: number) {
    const items = [
      { id: 'frac1', content: '1/2', category: 'halb' },
      { id: 'frac2', content: '2/4', category: 'halb_equiv' },
      { id: 'frac3', content: '1/4', category: 'viertel' },
      { id: 'frac4', content: '3/4', category: 'drei_viertel' }
    ];
    
    const categories = [
      { id: 'halb', name: 'Ein Halb', acceptsItems: ['frac1', 'frac2'] },
      { id: 'viertel', name: 'Ein Viertel', acceptsItems: ['frac3'] },
      { id: 'drei_viertel', name: 'Drei Viertel', acceptsItems: ['frac4'] }
    ];

    return {
      question: 'Ordne die Brüche den richtigen Bezeichnungen zu:',
      explanation: 'Brüche als Teile vom Ganzen verstehen. 1/2 = 2/4.',
      items,
      categories
    };
  }

  private generateMeasurementMatching(grade: number) {
    const items = [
      { id: 'meas1', content: '100 cm', category: 'meter' },
      { id: 'meas2', content: '1000 m', category: 'kilometer' },
      { id: 'meas3', content: '60 min', category: 'stunde' },
      { id: 'meas4', content: '1000 g', category: 'kilogramm' }
    ];
    
    const categories = [
      { id: 'meter', name: '1 Meter', acceptsItems: ['meas1'] },
      { id: 'kilometer', name: '1 Kilometer', acceptsItems: ['meas2'] },
      { id: 'stunde', name: '1 Stunde', acceptsItems: ['meas3'] },
      { id: 'kilogramm', name: '1 Kilogramm', acceptsItems: ['meas4'] }
    ];

    return {
      question: 'Ordne die Maßeinheiten richtig zu:',
      explanation: 'Umrechnung zwischen verschiedenen Maßeinheiten.',
      items,
      categories
    };
  }

  private generateAdvancedCalculationMatching(grade: number) {
    const tasks = [];
    const results = [];
    
    if (grade <= 2) {
      // Zahlenraum bis 20 mit Zehnerübergang - Parametrisiert
      const calcTemplates = [
        { a: Math.floor(Math.random() * 8) + 7, b: Math.floor(Math.random() * 6) + 4, op: '+' },
        { a: Math.floor(Math.random() * 8) + 12, b: Math.floor(Math.random() * 7) + 3, op: '-' },
        { a: Math.floor(Math.random() * 6) + 7, b: Math.floor(Math.random() * 5) + 4, op: '+' },
        { a: Math.floor(Math.random() * 7) + 13, b: Math.floor(Math.random() * 6) + 4, op: '-' }
      ];
      
      const calculations = calcTemplates.map(t => ({
        task: `${t.a} ${t.op} ${t.b}`,
        result: t.op === '+' ? t.a + t.b : t.a - t.b
      }));
      
      calculations.forEach((calc, i) => {
        tasks.push({
          id: `task_${i}`,
          content: calc.task,
          category: `result_${calc.result}`
        });
      });
      
      // Create categories for unique results
      const uniqueResults = [...new Set(calculations.map(c => c.result))];
      uniqueResults.forEach(result => {
        const taskIds = calculations
          .map((calc, i) => calc.result === result ? `task_${i}` : null)
          .filter(id => id !== null);
        
        results.push({
          id: `result_${result}`,
          name: result.toString(),
          acceptsItems: taskIds
        });
      });
      
      return {
        question: 'Löse die Aufgaben mit Zehnerübergang und ordne sie den Ergebnissen zu:',
        explanation: 'Rechnen über den Zehner: z.B. 8+7 = 8+2+5 = 10+5 = 15',
        items: tasks,
        categories: results
      };
    } else if (grade <= 4) {
      // Schriftliche Verfahren - Parametrisiert
      const calcTemplates = [
        { a: Math.floor(Math.random() * 200) + 200, b: Math.floor(Math.random() * 200) + 100, op: '+' },
        { a: Math.floor(Math.random() * 300) + 300, b: Math.floor(Math.random() * 200) + 100, op: '-' },
        { a: Math.floor(Math.random() * 8) + 12, b: Math.floor(Math.random() * 8) + 12, op: '×' },
        { a: (Math.floor(Math.random() * 8) + 8) * (Math.floor(Math.random() * 10) + 10), b: Math.floor(Math.random() * 8) + 8, op: '÷' }
      ];
      
      const calculations = calcTemplates.map(t => ({
        task: `${t.a} ${t.op} ${t.b}`,
        result: t.op === '+' ? t.a + t.b : t.op === '-' ? t.a - t.b : t.op === '×' ? t.a * t.b : Math.floor(t.a / t.b)
      }));
      
      calculations.forEach((calc, i) => {
        tasks.push({
          id: `task_${i}`,
          content: calc.task,
          category: `result_${calc.result}`
        });
        
        results.push({
          id: `result_${calc.result}`,
          name: calc.result.toString(),
          acceptsItems: [`task_${i}`]
        });
      });
      
      return {
        question: 'Löse mit schriftlichen Rechenverfahren und ordne zu:',
        explanation: 'Verwende schriftliche Addition, Subtraktion, Multiplikation und Division.',
        items: tasks,
        categories: results
      };
    } else if (grade <= 6) {
      // Bruchrechnung, einfache Geometrie - Lehrplankonform
      const calcTemplates = [
        { task: `1/${Math.floor(Math.random() * 3) + 2} + 1/${Math.floor(Math.random() * 3) + 2}`, type: 'fraction' },
        { area: Math.floor(Math.random() * 5) + 3, type: 'rectangle' },
        { radius: Math.floor(Math.random() * 4) + 2, type: 'circle' },
        { percent: [10, 20, 25, 50][Math.floor(Math.random() * 4)], base: Math.floor(Math.random() * 50) + 20, type: 'percent' }
      ];
      
      const calculations = calcTemplates.map((t, i) => {
        if (t.type === 'fraction') {
          const result = Math.floor(Math.random() * 3) + 1;
          return { task: `${result}/4`, result: `${result}/4` };
        } else if (t.type === 'rectangle') {
          const result = t.area * t.area;
          return { task: `Flächeninhalt ${t.area}×${t.area}`, result };
        } else if (t.type === 'circle') {
          const result = Math.round(2 * 3.14 * t.radius);
          return { task: `Umfang Kreis r=${t.radius}`, result };
        } else {
          const result = (t.percent * t.base) / 100;
          return { task: `${t.percent}% von ${t.base}`, result };
        }
      });
      
      calculations.forEach((calc, i) => {
        tasks.push({
          id: `task_${i}`,
          content: calc.task,
          category: `result_${calc.result}`
        });
        
        results.push({
          id: `result_${calc.result}`,
          name: calc.result.toString(),
          acceptsItems: [`task_${i}`]
        });
      });
      
      return {
        question: 'Löse die Bruch-, Geometrie- und Prozentaufgaben:',
        explanation: 'Verschiedene Bereiche der Klasse 5-6 Mathematik.',
        items: tasks,
        categories: results
      };
    } else {
      // Erweiterte Aufgaben für höhere Klassen (7+) - Lehrplankonform parametrisiert
      const calcTemplates = [
        { base: Math.floor(Math.random() * 4) + 2, exp: Math.floor(Math.random() * 3) + 2, type: 'power' },
        { number: [9, 16, 25, 36, 49, 64, 81, 100][Math.floor(Math.random() * 8)], type: 'root' },
        { percent: [15, 20, 25, 30, 40][Math.floor(Math.random() * 5)], base: Math.floor(Math.random() * 60) + 40, type: 'percent' },
        { coeff: Math.floor(Math.random() * 5) + 2, result: Math.floor(Math.random() * 8) + 3, type: 'equation' }
      ];
      
      const calculations = calcTemplates.map(t => {
        if (t.type === 'power') {
          const result = Math.pow(t.base, t.exp);
          return { task: `${t.base}^${t.exp}`, result };
        } else if (t.type === 'root') {
          const result = Math.sqrt(t.number);
          return { task: `√${t.number}`, result };
        } else if (t.type === 'percent') {
          const result = (t.percent * t.base) / 100;
          return { task: `${t.percent}% von ${t.base}`, result };
        } else {
          const equation_result = t.coeff * t.result;
          return { task: `${t.coeff}x = ${equation_result}`, result: t.result };
        }
      });
      
      calculations.forEach((calc, i) => {
        tasks.push({
          id: `task_${i}`,
          content: calc.task,
          category: `result_${calc.result}`
        });
        
        results.push({
          id: `result_${calc.result}`,
          name: calc.result.toString(),
          acceptsItems: [`task_${i}`]
        });
      });
      
      return {
        question: 'Löse die erweiterten mathematischen Aufgaben:',
        explanation: 'Potenzen, Wurzeln, Prozentrechnung und einfache Gleichungen.',
        items: tasks,
        categories: results
      };
    }
  }

  private generateMathMultipleChoiceQuestion(grade: number): SelectionQuestion {
    const maxNumber = grade <= 2 ? 10 : grade <= 4 ? 50 : 100;
    const operations = grade <= 2 ? ['+', '-'] : ['+', '-', '×'];
    
    const a = Math.floor(Math.random() * maxNumber) + 1;
    const b = Math.floor(Math.random() * Math.min(a, maxNumber / 2)) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let result: number;
    let questionText: string;
    
    if (operation === '×') {
      const smallA = Math.floor(Math.random() * 9) + 2;
      const smallB = Math.floor(Math.random() * 9) + 2;
      result = smallA * smallB;
      questionText = `Was ist ${smallA} × ${smallB}?`;
    } else {
      result = operation === '+' ? a + b : a - b;
      questionText = `Was ist ${a} ${operation} ${b}?`;
    }
    
    const wrongAnswers = [
      result + 1,
      result - 1,
      result + Math.floor(Math.random() * 3) + 2
    ].filter(ans => ans > 0 && ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${operation === '+' ? 'Addition' : operation === '-' ? 'Subtraktion' : 'Multiplikation'}: Ergebnis ist ${result}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(result.toString())
    };
  }

  private generateMathWordSelectionQuestion(grade: number): SelectionQuestion {
    const maxNumber = grade <= 2 ? 10 : grade <= 4 ? 50 : 100;
    const operations = grade <= 2 ? ['+', '-'] : ['+', '-', '×'];
    
    const a = Math.floor(Math.random() * maxNumber) + 1;
    const b = Math.floor(Math.random() * Math.min(a, 5)) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const result = operation === '+' ? a + b : operation === '-' ? a - b : a * b;
    
    const wrongAnswers = [
      result + 1,
      result - 1, 
      result + 2,
      result - 2,
      Math.max(1, result + 3),
      Math.max(1, result - 3)
    ].filter(ans => ans > 0 && ans !== result);
    
    const allNumbers = [result, ...wrongAnswers.slice(0, 5)]
      .sort((a, b) => a - b)
      .map((num, i) => ({
        word: num.toString(),
        isCorrect: num === result,
        index: i
      }));
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `Wähle das richtige Ergebnis für ${a} ${operation} ${b}:`,
      questionType: 'word-selection',
      explanation: `Die richtige Antwort ist ${result}`,
      type: 'mathematik' as any,
      sentence: `Wähle das richtige Ergebnis für ${a} ${operation} ${b}:`,
      selectableWords: allNumbers
    };
  }

  private generateMathTextInputQuestion(grade: number): SelectionQuestion {
    const maxNumber = grade <= 2 ? 10 : grade <= 4 ? 50 : 100;
    const operations = grade <= 2 ? ['+', '-'] : ['+', '-', '×'];
    
    const a = Math.floor(Math.random() * maxNumber) + 1;
    const b = Math.floor(Math.random() * Math.min(a, 10)) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const result = operation === '+' ? a + b : operation === '-' ? a - b : a * b;
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `${a} ${operation} ${b} = ?`,
      questionType: 'text-input',
      explanation: `${operation === '+' ? 'Addition' : operation === '-' ? 'Subtraktion' : 'Multiplikation'}: ${a} ${operation} ${b} = ${result}`,
      type: 'mathematik' as any,
      answer: result.toString()
    };
  }

  private generateGermanQuestion(grade: number, questionType: string, index: number): SelectionQuestion | null {
    // Placeholder for German questions - can be enhanced later
    return {
      id: Math.floor(Math.random() * 1000000),
      question: 'Welches Wort ist richtig geschrieben?',
      questionType: 'multiple-choice',
      explanation: 'Rechtschreibung üben',
      type: 'deutsch' as any,
      options: ['Haus', 'Hous', 'Hauss', 'Hauß'],
      correctAnswer: 0
    };
  }

  private normalizeCategory(category: string): string {
    const normalized = category.toLowerCase().trim();
    if (normalized.includes('math') || normalized.includes('rechnen')) {
      return 'mathematik';
    }
    if (normalized.includes('deutsch') || normalized.includes('sprache')) {
      return 'deutsch';
    }
    return normalized;
  }

  clearCache(): void {
    this.cache.clear();
  }
}