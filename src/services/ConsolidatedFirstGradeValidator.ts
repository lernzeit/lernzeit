/**
 * Consolidated First-Grade Validator
 * Harmonized validation logic for first-grade content (ages 6-7)
 */

export interface FirstGradeValidationResult {
  isValid: boolean;
  issues: string[];
  shouldExclude: boolean;
  qualityScore: number;
  ageAppropriate: boolean;
  uiCompatible: boolean;
}

export class ConsolidatedFirstGradeValidator {
  private static instance: ConsolidatedFirstGradeValidator;

  static getInstance(): ConsolidatedFirstGradeValidator {
    if (!ConsolidatedFirstGradeValidator.instance) {
      ConsolidatedFirstGradeValidator.instance = new ConsolidatedFirstGradeValidator();
    }
    return ConsolidatedFirstGradeValidator.instance;
  }

  /**
   * Main validation function for first-grade templates
   */
  validate(template: any): FirstGradeValidationResult {
    const issues: string[] = [];
    let qualityScore = 0.8;
    let shouldExclude = false;

    const prompt = (template.student_prompt || '').toLowerCase();

    // 1. CRITICAL: Subjective content detection
    const subjectiveIssues = this.checkSubjectiveContent(prompt);
    if (subjectiveIssues.length > 0) {
      issues.push(...subjectiveIssues);
      shouldExclude = true;
      qualityScore = 0.1;
    }

    // 2. CRITICAL: Age-inappropriate complexity
    const complexityIssues = this.checkComplexity(template);
    if (complexityIssues.length > 0) {
      issues.push(...complexityIssues);
      shouldExclude = true;
      qualityScore = Math.min(qualityScore, 0.3);
    }

    // 3. UI compatibility issues
    const uiIssues = this.checkUICompatibility(template);
    const uiCompatible = uiIssues.length === 0;
    if (!uiCompatible) {
      issues.push(...uiIssues);
      shouldExclude = true;
      qualityScore = Math.min(qualityScore, 0.2);
    }

    // 4. Visual support requirements
    const visualIssues = this.checkVisualSupport(template);
    if (visualIssues.length > 0) {
      issues.push(...visualIssues);
      qualityScore = Math.min(qualityScore, 0.6);
    }

    const ageAppropriate = !shouldExclude;

    return {
      isValid: !shouldExclude && issues.length === 0,
      issues,
      shouldExclude,
      qualityScore,
      ageAppropriate,
      uiCompatible
    };
  }

  /**
   * Check for subjective/opinion-based content
   */
  private checkSubjectiveContent(prompt: string): string[] {
    const patterns = [
      { regex: /lieblings/, message: 'Subjektive Lieblingsfrage' },
      { regex: /schönst/, message: 'Subjektive Schönheitsfrage' },
      { regex: /best[^i]/, message: 'Subjektive Bewertungsfrage' },
      { regex: /welch.*magst/, message: 'Subjektive Präferenzfrage' },
      { regex: /welch.*findest/, message: 'Subjektive Meinungsfrage' },
      { regex: /dein.*favorit/, message: 'Subjektive Favoritenfrage' }
    ];

    return patterns
      .filter(p => p.regex.test(prompt))
      .map(p => `🚨 ERSTKLÄSSLER: ${p.message}`);
  }

  /**
   * Check for age-inappropriate complexity
   */
  private checkComplexity(template: any): string[] {
    const issues: string[] = [];
    const prompt = template.student_prompt || '';

    // Numbers too large for first grade (beyond 20)
    const numbers = prompt.match(/\d+/g) || [];
    const maxNumber = Math.max(...numbers.map((n: string) => parseInt(n))) || 0;
    if (maxNumber > 20) {
      issues.push(`Zahlen zu groß für Klasse 1: ${maxNumber} (max. 20)`);
    }

    // Advanced operations
    const complexOperations = [
      { regex: /×|mal.*nehmen/, message: 'Multiplikation zu komplex' },
      { regex: /÷|teil.*durch/, message: 'Division zu komplex' },
      { regex: /prozent/, message: 'Prozentrechnung zu komplex' },
      { regex: /bruch|drittel|viertel/, message: 'Bruchrechnung zu komplex' }
    ];

    complexOperations.forEach(op => {
      if (op.regex.test(prompt.toLowerCase())) {
        issues.push(op.message);
      }
    });

    // Complex vocabulary
    const complexWords = ['variable', 'gleichung', 'funktion', 'algorithmus'];
    complexWords.forEach(word => {
      if (prompt.toLowerCase().includes(word)) {
        issues.push(`Zu komplexer Begriff: ${word}`);
      }
    });

    return issues;
  }

  /**
   * Check UI compatibility for first-graders
   */
  private checkUICompatibility(template: any): string[] {
    const issues: string[] = [];
    const questionType = template.question_type || '';

    // Only allow simple question types
    const allowedTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'TEXT'];
    if (!allowedTypes.includes(questionType)) {
      issues.push(`Fragetyp zu komplex für Klasse 1: ${questionType}`);
    }

    // Check MULTIPLE_CHOICE has adequate options
    if (questionType === 'MULTIPLE_CHOICE') {
      const distractors = template.distractors || [];
      if (!Array.isArray(distractors) || distractors.length < 2) {
        issues.push('Multiple-Choice-Frage benötigt mindestens 3 Optionen');
      }
    }

    // Check solution format for SORT/MATCH (should be JSON objects)
    if (questionType === 'SORT' && typeof template.solution === 'string') {
      issues.push('SORT-Frage hat falsche Lösungsstruktur (String statt JSON)');
    }

    if (questionType === 'MATCH' && typeof template.solution === 'string') {
      issues.push('MATCH-Frage hat falsche Lösungsstruktur (String statt JSON)');
    }

    return issues;
  }

  /**
   * Check visual support requirements
   */
  private checkVisualSupport(template: any): string[] {
    const issues: string[] = [];
    const prompt = template.student_prompt || '';

    // Questions requiring unavailable visuals
    const visualPatterns = [
      { regex: /betrachte.*bild/i, message: 'Bildbetrachtung ohne bereitgestelltes Bild' },
      { regex: /schaue.*an/i, message: 'Visuelle Aufgabe ohne Material' },
      { regex: /zeige.*auf/i, message: 'Zeigegeste digital unmöglich' },
      { regex: /zeichn|mal /i, message: 'Zeichenaufgabe in digitaler Umgebung' }
    ];

    visualPatterns.forEach(pattern => {
      if (pattern.regex.test(prompt)) {
        issues.push(pattern.message);
      }
    });

    return issues;
  }

  /**
   * Generate appropriate content filters for database queries
   */
  generateDatabaseFilters(): any[] {
    return [
      // Block problematic question types
      { column: 'question_type', operator: 'not_in', value: ['SORT', 'MATCH', 'DRAG_DROP'] },
      
      // Block subjective content
      { column: 'student_prompt', operator: 'not_ilike', value: '%lieblings%' },
      { column: 'student_prompt', operator: 'not_ilike', value: '%schönst%' },
      { column: 'student_prompt', operator: 'not_ilike', value: '%best%' },
      
      // Block complex operations
      { column: 'student_prompt', operator: 'not_ilike', value: '%prozent%' },
      { column: 'student_prompt', operator: 'not_ilike', value: '%variable%' },
      
      // Block visual requirements
      { column: 'student_prompt', operator: 'not_ilike', value: '%zeichn%' },
      { column: 'student_prompt', operator: 'not_ilike', value: '%betrachte%' }
    ];
  }
}

export const firstGradeValidator = ConsolidatedFirstGradeValidator.getInstance();