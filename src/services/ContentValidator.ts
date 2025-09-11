/**
 * Enhanced Content Validator Service - Phase 2 Quality Assurance
 * Comprehensive validation with mathematical logic checking and advanced pattern detection
 */
import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  qualityScore: number;
  shouldExclude: boolean;
}

export class ContentValidator {
  private static instance: ContentValidator;

  static getInstance(): ContentValidator {
    if (!ContentValidator.instance) {
      ContentValidator.instance = new ContentValidator();
    }
    return ContentValidator.instance;
  }

  /**
   * Comprehensive content validation for templates
   */
  async validateTemplate(template: any): Promise<ValidationResult> {
    const issues: string[] = [];
    let qualityScore = 0.8; // Start with base quality
    let shouldExclude = false;

    // 1. Check for impossible/circular tasks
    const circularIssues = this.detectCircularTasks(template.student_prompt || '');
    issues.push(...circularIssues);
    if (circularIssues.length > 0) {
      qualityScore = 0.2;
      shouldExclude = true;
    }

    // 2. Check for visual tasks that can't be completed digitally
    const visualIssues = this.detectImpossibleVisualTasks(template.student_prompt || '');
    issues.push(...visualIssues);
    if (visualIssues.length > 0) {
      qualityScore = 0.3;
      shouldExclude = true;
    }

    // 3. Check for curriculum appropriateness
    const curriculumIssues = this.validateCurriculumAlignment(template);
    issues.push(...curriculumIssues);
    if (curriculumIssues.length > 0) {
      qualityScore -= 0.2;
    }

    // 4. Check for answer validity
    const answerIssues = this.validateAnswerLogic(template);
    issues.push(...answerIssues);
    if (answerIssues.length > 0) {
      qualityScore -= 0.3;
    }

    // 5. Check user feedback patterns
    const feedbackIssues = await this.checkNegativeFeedbackPattern(template.id?.toString() || '');
    issues.push(...feedbackIssues);
    if (feedbackIssues.length > 0) {
      qualityScore -= 0.4;
      if (feedbackIssues.some(issue => issue.includes('mehrfach negativ'))) {
        shouldExclude = true;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      qualityScore: Math.max(0, Math.min(1, qualityScore)),
      shouldExclude
    };
  }

  /**
   * Detect circular/impossible tasks like "measure your ruler"
   */
  private detectCircularTasks(prompt: string): string[] {
    const issues: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Circular measurement tasks
    const circularPatterns = [
      { pattern: /miss.*lineal.*lineal/, message: 'Zirkuläre Aufgabe: Lineal mit Lineal messen' },
      { pattern: /mess.*lineal.*lineal/, message: 'Zirkuläre Aufgabe: Lineal mit sich selbst messen' },
      { pattern: /wie lang.*lineal/, message: 'Unmögliche Aufgabe: Lineallänge unbekannt' },
      { pattern: /länge.*lineal.*eingeben/, message: 'Unmögliche Aufgabe: Keine Standardlineallänge' },
      { pattern: /miss.*bleistift.*ohne/, message: 'Unmögliche Aufgabe: Bleistift ohne Messwerkzeug' },
      { pattern: /wie groß.*dein/, message: 'Persönliche Messungen unmöglich' }
    ];

    circularPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(lowerPrompt)) {
        issues.push(message);
      }
    });

    return issues;
  }

  /**
   * Detect impossible visual/drawing tasks
   */
  private detectImpossibleVisualTasks(prompt: string): string[] {
    const issues: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Tasks requiring physical drawing/construction
    const visualPatterns = [
      { pattern: /zeichne|zeichnet|zeichnen/, message: 'Visuelle Aufgabe: Zeichnen nicht möglich' },
      { pattern: /male|malt|malen/, message: 'Visuelle Aufgabe: Malen nicht möglich' },
      { pattern: /konstruiere|konstruiert|konstruieren/, message: 'Visuelle Aufgabe: Konstruieren nicht möglich' },
      { pattern: /bastle|bastelt|basteln/, message: 'Physische Aufgabe: Basteln nicht möglich' },
      { pattern: /schneide|schneidet|schneiden.*papier/, message: 'Physische Aufgabe: Schneiden nicht möglich' },
      { pattern: /klebe|klebt|kleben/, message: 'Physische Aufgabe: Kleben nicht möglich' },
      { pattern: /falte|faltet|falten.*papier/, message: 'Physische Aufgabe: Falten nicht möglich' },
      { pattern: /betrachte.*bild|schaue.*bild/, message: 'Visuelle Aufgabe: Bildbetrachtung ohne Bild' },
      { pattern: /ordne.*richtig.*zu(?!.*zahl)/i, message: 'Zuordnungsaufgabe: Ohne visuelle Elemente unmöglich' },
      { pattern: /verbinde.*mit.*linie/, message: 'Visuelle Aufgabe: Linien verbinden nicht möglich' },
      { pattern: /markiere|markiert|markieren/, message: 'Visuelle Aufgabe: Markieren nicht möglich' }
    ];

    visualPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(lowerPrompt)) {
        issues.push(message);
      }
    });

    return issues;
  }

  /**
   * Validate curriculum alignment for grade level
   */
  private validateCurriculumAlignment(template: any): string[] {
    const issues: string[] = [];
    const grade = template.grade || 1;
    const prompt = (template.student_prompt || '').toLowerCase();

    // Grade-inappropriate concepts
    const gradeRules = {
      1: {
        forbidden: ['multiplikation', '×', 'division', '÷', 'bruch', 'dezimal', 'prozent'],
        maxNumber: 20
      },
      2: {
        forbidden: ['bruch', 'dezimal', 'prozent', 'negative'],
        maxNumber: 100
      },
      3: {
        forbidden: ['dezimal', 'prozent', 'negative', 'gleichung'],
        maxNumber: 1000
      },
      4: {
        forbidden: ['negative', 'gleichung', 'funktion'],
        maxNumber: 1000000
      }
    };

    const rules = gradeRules[grade as keyof typeof gradeRules];
    if (rules) {
      rules.forbidden.forEach(concept => {
        if (prompt.includes(concept)) {
          issues.push(`Klassenunpassend: '${concept}' zu schwer für Klasse ${grade}`);
        }
      });

      // Check for numbers too large for grade
      const numbers = prompt.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          const value = parseInt(num);
          if (value > rules.maxNumber) {
            issues.push(`Zahlenraum: ${value} zu groß für Klasse ${grade} (max: ${rules.maxNumber})`);
          }
        });
      }
    }

    return issues;
  }

  /**
   * Phase 2: Enhanced answer logic and solution consistency validation
   */
  private validateAnswerLogic(template: any): string[] {
    const issues: string[] = [];
    const solution = template.solution;
    const prompt = template.student_prompt || '';

    // Check if solution exists and makes sense
    if (!solution) {
      issues.push('Keine Lösung vorhanden');
      return issues;
    }

    // Extract expected answer
    let expectedAnswer: string | number | null = null;
    if (typeof solution === 'string') {
      expectedAnswer = solution;
    } else if (solution.value !== undefined) {
      expectedAnswer = solution.value;
    } else if (solution.answer !== undefined) {
      expectedAnswer = solution.answer;
    }

    if (!expectedAnswer && expectedAnswer !== 0) {
      issues.push('Lösung kann nicht extrahiert werden');
      return issues;
    }

    // Check for obvious answer inconsistencies
    const answerStr = String(expectedAnswer).toLowerCase();
    if (answerStr.includes('undefined') || answerStr.includes('null') || answerStr.includes('nan')) {
      issues.push('Lösung enthält Fehlerwerte');
    }

    // Enhanced mathematical validation
    const mathValidationIssues = this.validateMathematicalLogic(prompt, expectedAnswer);
    issues.push(...mathValidationIssues);

    return issues;
  }

  /**
   * Phase 2: Advanced mathematical logic validation
   */
  private validateMathematicalLogic(prompt: string, expectedAnswer: string | number): string[] {
    const issues: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    const numericAnswer = parseFloat(String(expectedAnswer));

    if (isNaN(numericAnswer)) {
      // Skip validation for non-numeric answers
      return issues;
    }

    // Addition validation
    if (lowerPrompt.includes('+') || lowerPrompt.includes('plus')) {
      const numbers = prompt.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const sum = parseInt(numbers[0]) + parseInt(numbers[1]);
        if (Math.abs(sum - numericAnswer) > 0.1) {
          issues.push(`Additionsrechnung falsch: ${numbers[0]}+${numbers[1]}=${sum}, aber Lösung ist ${numericAnswer}`);
        }
      }
    }

    // Subtraction validation
    if (lowerPrompt.includes('−') || lowerPrompt.includes('-') || lowerPrompt.includes('minus')) {
      const numbers = prompt.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const difference = parseInt(numbers[0]) - parseInt(numbers[1]);
        if (Math.abs(difference - numericAnswer) > 0.1) {
          issues.push(`Subtraktionsrechnung falsch: ${numbers[0]}-${numbers[1]}=${difference}, aber Lösung ist ${numericAnswer}`);
        }
      }
    }

    // Multiplication validation
    if (lowerPrompt.includes('×') || lowerPrompt.includes('*') || lowerPrompt.includes('mal')) {
      const numbers = prompt.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const product = parseInt(numbers[0]) * parseInt(numbers[1]);
        if (Math.abs(product - numericAnswer) > 0.1) {
          issues.push(`Multiplikationsrechnung falsch: ${numbers[0]}×${numbers[1]}=${product}, aber Lösung ist ${numericAnswer}`);
        }
      }
    }

    // Division validation
    if (lowerPrompt.includes('÷') || lowerPrompt.includes('/') || lowerPrompt.includes('geteilt')) {
      const numbers = prompt.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const quotient = parseInt(numbers[0]) / parseInt(numbers[1]);
        if (Math.abs(quotient - numericAnswer) > 0.1) {
          issues.push(`Divisionsrechnung falsch: ${numbers[0]}÷${numbers[1]}=${quotient}, aber Lösung ist ${numericAnswer}`);
        }
      }
    }

    // Logical range validation
    if (numericAnswer < 0 && !lowerPrompt.includes('negativ') && !lowerPrompt.includes('minus')) {
      issues.push('Negative Antwort ohne Hinweis auf negative Zahlen');
    }

    if (numericAnswer > 10000 && !lowerPrompt.includes('groß') && !lowerPrompt.includes('tausend')) {
      issues.push('Sehr große Antwort ohne entsprechende Aufgabenstellung');
    }

    return issues;
  }

  /**
   * Check for negative feedback patterns from users
   */
  private async checkNegativeFeedbackPattern(templateId: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      const { data: feedback, error } = await supabase
        .from('question_feedback')
        .select('feedback_type, created_at')
        .eq('question_content', templateId) // Template ID as string
        .in('feedback_type', ['duplicate', 'inappropriate', 'too_easy', 'too_hard', 'not_curriculum_compliant', 'confusing']);

      if (error || !feedback) return issues;

      const negativeFeedback = feedback.length;
      const recentNegative = feedback.filter(f => 
        new Date(f.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      if (negativeFeedback >= 3) {
        issues.push(`Template mehrfach negativ bewertet: ${negativeFeedback} negative Bewertungen`);
      }

      if (recentNegative >= 2) {
        issues.push(`Kürzlich häufig negativ bewertet: ${recentNegative} in den letzten 7 Tagen`);
      }

      // Check specific feedback types
      const feedbackTypes = feedback.reduce((acc, f) => {
        acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      if (feedbackTypes['confusing'] >= 2) {
        issues.push(`Mehrfach als verwirrend markiert: ${feedbackTypes['confusing']} Bewertungen`);
      }

    } catch (error) {
      console.warn('Fehler beim Abrufen von Feedback:', error);
    }

    return issues;
  }

  /**
   * Get blacklisted question patterns that should never be generated
   */
  getBlacklistedPatterns(): string[] {
    return [
      // Circular measurement tasks
      'miss dein lineal',
      'länge deines lineals',
      'wie lang ist dein',
      
      // Drawing/visual tasks
      'zeichne ein',
      'male das',
      'konstruiere',
      'bastle ein',
      
      // Physical manipulation
      'schneide das papier',
      'falte das blatt',
      'klebe die teile',
      
      // Impossible digital tasks
      'ordne zu', // without specific context
      'verbinde mit linien',
      'markiere die stellen',
      
      // Ambiguous questions
      'wie groß bist du',
      'dein alter',
      'deine lieblingsfarbe'
    ];
  }

  /**
   * Quick check if prompt contains blacklisted patterns
   */
  containsBlacklistedPattern(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return this.getBlacklistedPatterns().some(pattern => 
      lowerPrompt.includes(pattern.toLowerCase())
    );
  }
}

export const contentValidator = ContentValidator.getInstance();