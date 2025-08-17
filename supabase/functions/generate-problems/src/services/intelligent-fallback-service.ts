import { logger } from "../utils/logger.ts";
import type { ProblemRequest, SelectionQuestion } from "../types.ts";

export interface FallbackConfig {
  maxAttempts: number;
  qualityThreshold: number;
  diversityRequirement: number;
  gradeAdaptation: boolean;
}

export class IntelligentFallbackService {
  private fallbackTemplates: Map<string, FallbackTemplate[]> = new Map();

  constructor() {
    this.initializeFallbackTemplates();
  }

  /**
   * Generate intelligent fallback questions when primary generation fails
   */
  async generateFallbackQuestions(
    request: ProblemRequest,
    config: FallbackConfig,
    existingQuestions: string[] = []
  ): Promise<SelectionQuestion[]> {
    logger.info('Generating intelligent fallback questions', {
      category: request.category,
      grade: request.grade,
      count: request.count
    });

    const questions: SelectionQuestion[] = [];
    const usedTemplates = new Set<string>();

    // Get available fallback templates for this category and grade
    const availableTemplates = this.getFallbackTemplates(request.category, request.grade);
    
    if (availableTemplates.length === 0) {
      return this.generateBasicFallbacks(request);
    }

    for (let i = 0; i < request.count; i++) {
      const template = this.selectBestTemplate(
        availableTemplates,
        usedTemplates,
        existingQuestions,
        i
      );

      if (template) {
        const question = this.generateQuestionFromFallbackTemplate(template, request, i);
        if (question && this.validateFallbackQuestion(question, existingQuestions)) {
          questions.push(question);
          usedTemplates.add(template.id);
          existingQuestions.push(question.question);
        }
      }
    }

    // Fill remaining slots with adaptive questions if needed
    while (questions.length < request.count) {
      const adaptiveQuestion = this.generateAdaptiveQuestion(
        request,
        questions.length,
        existingQuestions
      );
      if (adaptiveQuestion) {
        questions.push(adaptiveQuestion);
        existingQuestions.push(adaptiveQuestion.question);
      } else {
        break; // Prevent infinite loop
      }
    }

    logger.info('Fallback generation completed', {
      generated: questions.length,
      requested: request.count
    });

    return questions;
  }

  /**
   * Get fallback templates for category and grade
   */
  private getFallbackTemplates(category: string, grade: number): FallbackTemplate[] {
    const key = `${category}_${grade}`;
    let templates = this.fallbackTemplates.get(key) || [];
    
    // Also include matching templates for math category
    if (category === 'math') {
      const matchingKey = `math_matching_${grade}`;
      const matchingTemplates = this.fallbackTemplates.get(matchingKey) || [];
      templates = [...templates, ...matchingTemplates];
    }
    
    // Include templates from adjacent grades if needed
    if (templates.length < 5) {
      const adjacentGrades = [grade - 1, grade + 1].filter(g => g >= 1 && g <= 8);
      for (const adjGrade of adjacentGrades) {
        const adjKey = `${category}_${adjGrade}`;
        const adjTemplates = this.fallbackTemplates.get(adjKey) || [];
        templates = [...templates, ...adjTemplates];
        
        // Also include matching templates for adjacent grades
        if (category === 'math') {
          const adjMatchingKey = `math_matching_${adjGrade}`;
          const adjMatchingTemplates = this.fallbackTemplates.get(adjMatchingKey) || [];
          templates = [...templates, ...adjMatchingTemplates];
        }
      }
    }

    return templates;
  }

  /**
   * Select the best template considering variety and quality
   */
  private selectBestTemplate(
    templates: FallbackTemplate[],
    usedTemplates: Set<string>,
    existingQuestions: string[],
    questionIndex: number
  ): FallbackTemplate | null {
    // Filter unused templates
    const availableTemplates = templates.filter(t => !usedTemplates.has(t.id));
    
    if (availableTemplates.length === 0) {
      // Reset if all templates used (allows reuse with variation)
      usedTemplates.clear();
      return templates[questionIndex % templates.length];
    }

    // Score templates based on variety and appropriateness
    const scoredTemplates = availableTemplates.map(template => ({
      template,
      score: this.scoreTemplate(template, existingQuestions, questionIndex)
    }));

    // Sort by score and select from top candidates
    scoredTemplates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredTemplates.slice(0, Math.min(3, scoredTemplates.length));
    
    // Add some randomness among top candidates
    const selectedCandidate = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    return selectedCandidate.template;
  }

  /**
   * Score template for selection
   */
  private scoreTemplate(
    template: FallbackTemplate,
    existingQuestions: string[],
    questionIndex: number
  ): number {
    let score = template.baseQuality;

    // Variety bonus - prefer different question types
    const existingTypes = new Set(existingQuestions.map(q => this.inferQuestionType(q)));
    if (!existingTypes.has(template.questionType)) {
      score += 0.3;
    }

    // Position-based scoring for progression
    if (questionIndex < 3 && template.difficulty === 'easy') score += 0.2;
    if (questionIndex >= 3 && questionIndex < 7 && template.difficulty === 'medium') score += 0.2;
    if (questionIndex >= 7 && template.difficulty === 'hard') score += 0.2;

    // Curriculum alignment bonus
    score += template.curriculumAlignment;

    return score;
  }

  /**
   * Generate question from fallback template
   */
  private generateQuestionFromFallbackTemplate(
    template: FallbackTemplate,
    request: ProblemRequest,
    index: number
  ): SelectionQuestion | null {
    try {
      const parameters = this.generateTemplateParameters(template, request.grade, index);
      const question = this.fillTemplate(template.questionTemplate, parameters);
      const answer = this.fillTemplate(template.answerTemplate, parameters);
      const explanation = this.fillTemplate(template.explanationTemplate, parameters);

      const selectionQuestion: SelectionQuestion = {
        id: Math.floor(Math.random() * 1000000),
        question,
        type: request.category.toLowerCase(),
        explanation,
        questionType: template.questionType
      };

      // Add type-specific properties
      if (template.questionType === 'multiple-choice') {
        selectionQuestion.options = this.generateMultipleChoiceOptions(answer, template, parameters);
        selectionQuestion.correctAnswer = 0; // Correct answer is always first, then shuffled
      } else if (template.questionType === 'text-input') {
        selectionQuestion.answer = answer;
      } else if (template.questionType === 'matching') {
        const matchingData = this.generateMatchingData(template, parameters);
        selectionQuestion.items = matchingData.items;
        selectionQuestion.categories = matchingData.categories;
      }

      return selectionQuestion;
    } catch (error) {
      logger.warn('Failed to generate question from fallback template', {
        templateId: template.id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Generate adaptive question when templates are exhausted
   */
  private generateAdaptiveQuestion(
    request: ProblemRequest,
    index: number,
    existingQuestions: string[]
  ): SelectionQuestion | null {
    if (request.category === 'math') {
      return this.generateAdaptiveMathQuestion(request.grade, index, existingQuestions);
    } else if (request.category === 'german') {
      return this.generateAdaptiveGermanQuestion(request.grade, index, existingQuestions);
    }
    
    return null;
  }

  /**
   * Generate adaptive math question
   */
  private generateAdaptiveMathQuestion(
    grade: number,
    index: number,
    existingQuestions: string[]
  ): SelectionQuestion | null {
    const operations = grade >= 3 ? ['+', '-', '×', '÷'] : ['+', '-'];
    const operation = operations[index % operations.length];
    
    const ranges = {
      1: { min: 1, max: 20 },
      2: { min: 1, max: 100 },
      3: { min: 1, max: 1000 },
      4: { min: 1, max: 10000 }
    };
    
    const range = ranges[grade as keyof typeof ranges] || ranges[4];
    let a = Math.floor(Math.random() * range.max) + range.min;
    let b = Math.floor(Math.random() * Math.min(range.max / 2, 50)) + 1;
    
    // Ensure valid operations
    if (operation === '-' && b > a) [a, b] = [b, a];
    if (operation === '÷') a = b * Math.floor(Math.random() * 10 + 1);
    
    let answer: number;
    switch (operation) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '×': answer = a * b; break;
      case '÷': answer = a / b; break;
      default: answer = a + b;
    }
    
    const question = `${a} ${operation} ${b} = ?`;
    
    // Check for duplicates
    if (existingQuestions.some(q => q.includes(`${a} ${operation} ${b}`))) {
      return null;
    }
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question,
      type: 'math',
      explanation: `${a} ${operation} ${b} = ${answer}`,
      questionType: 'text-input',
      answer: answer.toString()
    };
  }

  /**
   * Generate adaptive German question
   */
  private generateAdaptiveGermanQuestion(
    grade: number,
    index: number,
    existingQuestions: string[]
  ): SelectionQuestion | null {
    const wordLists = {
      1: ['Haus', 'Baum', 'Auto', 'Ball', 'Buch'],
      2: ['Schule', 'Freund', 'Familie', 'Garten', 'Straße'],
      3: ['Abenteuer', 'Geschichte', 'Natur', 'Wissenschaft', 'Kunst'],
      4: ['Verantwortung', 'Gemeinschaft', 'Kreativität', 'Umwelt', 'Zukunft']
    };
    
    const words = wordLists[grade as keyof typeof wordLists] || wordLists[4];
    const word = words[index % words.length];
    
    const questionTypes = [
      { template: 'Wie schreibt man "{word}" richtig?', type: 'spelling' },
      { template: 'Finde das richtige Wort: {word}', type: 'recognition' },
      { template: 'Ergänze den Satz: Das ist ein schönes _____.', type: 'completion' }
    ];
    
    const questionType = questionTypes[index % questionTypes.length];
    const question = questionType.template.replace('{word}', word);
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question,
      type: 'german',
      explanation: `Die richtige Antwort ist: ${word}`,
      questionType: 'text-input',
      answer: word
    };
  }

  /**
   * Initialize fallback templates
   */
  private initializeFallbackTemplates(): void {
    // Math templates
    this.addMathFallbackTemplates();
    
    // German templates
    this.addGermanFallbackTemplates();
    
    // Add matching questions for all grades
    this.addMatchingFallbackTemplates();
    
    // Additional categories can be added here
  }

  private addMathFallbackTemplates(): void {
    // Grade-specific math templates
    for (let grade = 1; grade <= 10; grade++) {
      const templates = this.createGradeSpecificMathTemplates(grade);
      this.fallbackTemplates.set(`math_${grade}`, templates);
    }
  }

  private createGradeSpecificMathTemplates(grade: number): FallbackTemplate[] {
    const templates: FallbackTemplate[] = [];

    // Difficulty-appropriate number ranges
    const ranges = {
      1: { min: 1, max: 10, operations: ['+', '-'] },
      2: { min: 1, max: 100, operations: ['+', '-', '×'] },
      3: { min: 1, max: 1000, operations: ['+', '-', '×', '÷'] },
      4: { min: 1, max: 10000, operations: ['+', '-', '×', '÷'] },
      5: { min: 1, max: 100000, operations: ['+', '-', '×', '÷', 'bruch'] }
    };

    const config = ranges[Math.min(grade, 5) as keyof typeof ranges] || ranges[5];

    // Basic arithmetic
    config.operations.forEach((op, index) => {
      templates.push({
        id: `math_fallback_${op}_grade${grade}`,
        category: 'math',
        grade,
        questionTemplate: this.getOperationTemplate(op, grade),
        answerTemplate: '{result}',
        explanationTemplate: this.getOperationExplanation(op, grade),
        difficulty: grade <= 2 ? 'easy' : grade <= 4 ? 'medium' : 'hard',
        questionType: 'text-input',
        baseQuality: 0.75,
        curriculumAlignment: 0.85
      });
    });

    return templates;
  }

  private getOperationTemplate(operation: string, grade: number): string {
    switch (operation) {
      case '+':
        return grade >= 3 ? '{a} + {b} + {c} = ?' : '{a} + {b} = ?';
      case '-':
        return '{a} - {b} = ?';
      case '×':
        return grade >= 4 ? '{a} × {b} × {c} = ?' : '{a} × {b} = ?';
      case '÷':
        return '{a} ÷ {b} = ?';
      case 'bruch':
        return '{numerator}/{denominator} = ?';
      default:
        return '{a} + {b} = ?';
    }
  }

  private getOperationExplanation(operation: string, grade: number): string {
    switch (operation) {
      case '+':
        return grade >= 3 
          ? '{a} + {b} + {c} = {result}. Bei der Addition zählen wir zusammen.'
          : '{a} + {b} = {result}. Addition bedeutet zusammenzählen.';
      case '-':
        return '{a} - {b} = {result}. Subtraktion bedeutet abziehen.';
      case '×':
        return '{a} × {b} = {result}. Multiplikation ist wiederholte Addition.';
      case '÷':
        return '{a} ÷ {b} = {result}. Division ist das Aufteilen in gleiche Teile.';
      case 'bruch':
        return '{numerator}/{denominator} als Dezimalzahl ist {result}.';
      default:
        return 'Rechenweg: {a} + {b} = {result}';
    }
  }

  private addGermanFallbackTemplates(): void {
    for (let grade = 1; grade <= 10; grade++) {
      const templates = this.createGradeSpecificGermanTemplates(grade);
      this.fallbackTemplates.set(`german_${grade}`, templates);
    }
  }

  private createGradeSpecificGermanTemplates(grade: number): FallbackTemplate[] {
    const templates: FallbackTemplate[] = [];

    const topics = this.getGermanTopicsByGrade(grade);
    
    topics.forEach((topic, index) => {
      templates.push({
        id: `german_fallback_${topic.type}_grade${grade}`,
        category: 'german',
        grade,
        questionTemplate: topic.template,
        answerTemplate: topic.answer,
        explanationTemplate: topic.explanation,
        difficulty: grade <= 2 ? 'easy' : grade <= 4 ? 'medium' : 'hard',
        questionType: 'text-input',
        baseQuality: 0.7,
        curriculumAlignment: 0.8
      });
    });

    return templates;
  }

  private getGermanTopicsByGrade(grade: number): Array<{type: string, template: string, answer: string, explanation: string}> {
    const gradeTopics = {
      1: [
        { type: 'spelling', template: 'Wie schreibt man "{word}" richtig?', answer: '{word}', explanation: 'Das Wort "{word}" schreibt man so.' },
        { type: 'reading', template: 'Lies das Wort: {word}', answer: '{word}', explanation: 'Das Wort heißt "{word}".' }
      ],
      2: [
        { type: 'grammar', template: 'Setze den richtigen Artikel: ___ {noun}', answer: '{article}', explanation: 'Der richtige Artikel ist "{article}".' },
        { type: 'spelling', template: 'Ergänze den fehlenden Buchstaben: {word_incomplete}', answer: '{letter}', explanation: 'Der fehlende Buchstabe ist "{letter}".' }
      ],
      3: [
        { type: 'grammar', template: 'Bilde die Mehrzahl von: {noun}', answer: '{plural}', explanation: 'Die Mehrzahl von {noun} ist {plural}.' },
        { type: 'sentence', template: 'Vervollständige den Satz: {sentence_start}', answer: '{sentence_end}', explanation: 'Der vollständige Satz lautet: {sentence_start} {sentence_end}' }
      ]
    };

    return gradeTopics[Math.min(grade, 3) as keyof typeof gradeTopics] || gradeTopics[3];
  }

  private addMatchingFallbackTemplates(): void {
    for (let grade = 1; grade <= 10; grade++) {
      const templates = this.createGradeSpecificMatchingTemplates(grade);
      this.fallbackTemplates.set(`math_matching_${grade}`, templates);
    }
  }

  private createGradeSpecificMatchingTemplates(grade: number): FallbackTemplate[] {
    const templates: FallbackTemplate[] = [];

    const matchingTypes = this.getMatchingTypesByGrade(grade);
    
    matchingTypes.forEach((type, index) => {
      templates.push({
        id: `matching_fallback_${type.category}_grade${grade}`,
        category: 'math',
        grade,
        questionTemplate: type.question,
        answerTemplate: JSON.stringify(type.correctMatches),
        explanationTemplate: type.explanation,
        difficulty: grade <= 3 ? 'easy' : grade <= 6 ? 'medium' : 'hard',
        questionType: 'matching',
        baseQuality: 0.8,
        curriculumAlignment: 0.9
      });
    });

    return templates;
  }

  private getMatchingTypesByGrade(grade: number): Array<{
    category: string,
    question: string,
    correctMatches: Array<{item: string, category: string}>,
    explanation: string
  }> {
    if (grade <= 2) {
      return [
        {
          category: 'numbers',
          question: 'Ordne die Zahlen den richtigen Gruppen zu:',
          correctMatches: [
            {item: '3', category: 'Kleine Zahlen (1-5)'},
            {item: '8', category: 'Mittlere Zahlen (6-10)'},
            {item: '15', category: 'Große Zahlen (über 10)'}
          ],
          explanation: 'Zahlen werden nach ihrer Größe gruppiert: klein (1-5), mittel (6-10), groß (über 10).'
        },
        {
          category: 'shapes',
          question: 'Ordne die Formen zu:',
          correctMatches: [
            {item: '⚪', category: 'Runde Formen'},
            {item: '⬜', category: 'Eckige Formen'},
            {item: '🔺', category: 'Spitze Formen'}
          ],
          explanation: 'Formen werden nach ihren Eigenschaften sortiert.'
        }
      ];
    } else if (grade <= 4) {
      return [
        {
          category: 'operations',
          question: 'Ordne jede Aufgabe der richtigen Rechenart zu:',
          correctMatches: [
            {item: '45 + 23', category: 'Addition'},
            {item: '87 - 34', category: 'Subtraktion'},
            {item: '7 × 8', category: 'Multiplikation'},
            {item: '56 ÷ 8', category: 'Division'}
          ],
          explanation: 'Addition (+) bedeutet zusammenzählen, Subtraktion (-) bedeutet abziehen, Multiplikation (×) ist vervielfachen, Division (÷) ist teilen.'
        },
        {
          category: 'word_problems',
          question: 'Ordne die Textaufgabe der richtigen Rechenart zu:',
          correctMatches: [
            {item: 'Lisa kauft 3 Äpfel und 5 Birnen', category: 'Addition'},
            {item: 'Von 20 Bonbons isst Tom 7', category: 'Subtraktion'},
            {item: '4 Kinder bekommen je 3 Kekse', category: 'Multiplikation'},
            {item: '12 Stifte auf 3 Kinder verteilen', category: 'Division'}
          ],
          explanation: 'Textaufgaben enthalten Hinweise auf die richtige Rechenart.'
        }
      ];
    } else if (grade <= 6) {
      return [
        {
          category: 'fractions',
          question: 'Ordne die Brüche ihrer Dezimaldarstellung zu:',
          correctMatches: [
            {item: '1/2', category: '0,5'},
            {item: '1/4', category: '0,25'},
            {item: '3/4', category: '0,75'},
            {item: '1/5', category: '0,2'}
          ],
          explanation: 'Brüche können als Dezimalzahlen geschrieben werden: 1/2 = 0,5, 1/4 = 0,25, 3/4 = 0,75, 1/5 = 0,2.'
        },
        {
          category: 'geometry',
          question: 'Ordne die Eigenschaften den Figuren zu:',
          correctMatches: [
            {item: '4 gleiche Seiten', category: 'Quadrat'},
            {item: '3 Ecken', category: 'Dreieck'},
            {item: 'rund ohne Ecken', category: 'Kreis'},
            {item: '4 Seiten, gegenüber gleich', category: 'Rechteck'}
          ],
          explanation: 'Geometrische Figuren haben charakteristische Eigenschaften.'
        }
      ];
    } else if (grade <= 8) {
      return [
        {
          category: 'algebra',
          question: 'Ordne die mathematischen Begriffe ihrer Definition zu:',
          correctMatches: [
            {item: 'Variable (x, y)', category: 'Unbekannte Größe'},
            {item: 'Koeffizient (5x)', category: 'Zahl vor der Variable'},
            {item: 'Term (3x + 7)', category: 'Mathematischer Ausdruck'},
            {item: 'Gleichung (2x = 10)', category: 'Aussage mit Gleichheitszeichen'}
          ],
          explanation: 'In der Algebra haben Begriffe spezifische Bedeutungen für mathematische Strukturen.'
        },
        {
          category: 'functions',
          question: 'Ordne die Funktionstypen ihren Eigenschaften zu:',
          correctMatches: [
            {item: 'f(x) = 2x + 3', category: 'Lineare Funktion'},
            {item: 'f(x) = x²', category: 'Quadratische Funktion'},
            {item: 'f(x) = 5', category: 'Konstante Funktion'},
            {item: 'f(x) = 1/x', category: 'Umgekehrt proportionale Funktion'}
          ],
          explanation: 'Verschiedene Funktionstypen haben charakteristische Eigenschaften und Graphen.'
        }
      ];
    } else {
      return [
        {
          category: 'advanced_algebra',
          question: 'Ordne die mathematischen Konzepte ihren Anwendungen zu:',
          correctMatches: [
            {item: 'Quadratische Gleichungen', category: 'Parabeln und Wurfbahnen'},
            {item: 'Logarithmus', category: 'Exponentielles Wachstum'},
            {item: 'Trigonometrie', category: 'Dreiecksberechnungen'},
            {item: 'Differentiation', category: 'Steigungsberechnungen'}
          ],
          explanation: 'Höhere Mathematik findet Anwendung in verschiedenen Bereichen der Wissenschaft und Technik.'
        }
      ];
    }
  }

  // Helper methods
  private generateTemplateParameters(template: FallbackTemplate, grade: number, index: number): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (template.category === 'math') {
      // Grade-appropriate number ranges
      const ranges = {
        1: { min: 1, max: 10 },
        2: { min: 1, max: 50 },
        3: { min: 1, max: 100 },
        4: { min: 1, max: 1000 },
        5: { min: 1, max: 10000 }
      };
      
      const range = ranges[Math.min(grade, 5) as keyof typeof ranges] || ranges[5];
      
      params.a = Math.floor(Math.random() * range.max) + range.min;
      params.b = Math.floor(Math.random() * Math.min(range.max / 4, 50)) + 1;
      params.c = Math.floor(Math.random() * Math.min(range.max / 8, 25)) + 1;
      
      // Ensure b doesn't exceed a for subtraction
      if (params.b > params.a) {
        [params.a, params.b] = [params.b, params.a];
      }
      
      // Calculate results
      params.sum = params.a + params.b;
      params.difference = params.a - params.b;
      params.product = params.a * params.b;
      params.quotient = params.b !== 0 ? Math.floor(params.a / params.b) : 1;
      params.result = params.sum; // Default result
      
      // For fractions (grade 5+)
      if (grade >= 5) {
        params.numerator = Math.floor(Math.random() * 10) + 1;
        params.denominator = Math.floor(Math.random() * 9) + 2; // Avoid division by 1
        params.decimal = (params.numerator / params.denominator).toFixed(2);
      }
    } else if (template.category === 'german') {
      // German-specific parameters
      const words = this.getWordsForGrade(grade);
      const word = words[index % words.length];
      params.word = word;
      params.article = this.getArticle(word);
      params.plural = this.getPlural(word);
    }
    
    return params;
  }

  private getWordsForGrade(grade: number): string[] {
    const wordLists = {
      1: ['Haus', 'Baum', 'Auto', 'Ball', 'Buch', 'Hund', 'Katze'],
      2: ['Schule', 'Freund', 'Familie', 'Garten', 'Straße', 'Lehrer', 'Spielen'],
      3: ['Abenteuer', 'Geschichte', 'Natur', 'Wissenschaft', 'Kunst', 'Bibliothek', 'Computer']
    };
    
    return wordLists[Math.min(grade, 3) as keyof typeof wordLists] || wordLists[3];
  }

  private getArticle(word: string): string {
    // Simplified article assignment
    const articles = { 'Haus': 'das', 'Baum': 'der', 'Auto': 'das', 'Schule': 'die' };
    return articles[word as keyof typeof articles] || 'der';
  }

  private getPlural(word: string): string {
    // Simplified plural forms
    const plurals = { 'Haus': 'Häuser', 'Baum': 'Bäume', 'Auto': 'Autos', 'Schule': 'Schulen' };
    return plurals[word as keyof typeof plurals] || word + 'e';
  }

  private fillTemplate(template: string, parameters: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(parameters)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value.toString());
    }
    return result;
  }

  private generateMultipleChoiceOptions(correctAnswer: string, template: FallbackTemplate, parameters: Record<string, any>): string[] {
    const options = [correctAnswer];
    
    // Generate plausible wrong answers
    if (template.category === 'math') {
      const correct = parseInt(correctAnswer);
      options.push((correct + 1).toString());
      options.push((correct - 1).toString());
      options.push((correct + 5).toString());
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return options;
  }

  private validateFallbackQuestion(question: SelectionQuestion, existingQuestions: string[]): boolean {
    return !existingQuestions.some(existing => 
      this.calculateSimilarity(question.question, existing) > 0.8
    );
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private inferQuestionType(question: string): string {
    if (question.includes('=')) return 'math';
    if (question.includes('?')) return 'question';
    return 'statement';
  }

  private generateBasicFallbacks(request: ProblemRequest): SelectionQuestion[] {
    // Last resort basic fallbacks
    const questions: SelectionQuestion[] = [];
    
    for (let i = 0; i < Math.min(request.count, 3); i++) {
      questions.push({
        id: Math.floor(Math.random() * 1000000),
        question: `Grundübung ${i + 1} für ${request.category}`,
        type: request.category.toLowerCase(),
        explanation: 'Grundlegende Übung',
        questionType: 'text-input',
        answer: 'Übung'
      });
    }
    
    return questions;
  }

  private generateMatchingData(template: FallbackTemplate, parameters: Record<string, any>): {
    items: Array<{id: string, content: string, category: string}>,
    categories: Array<{id: string, name: string, acceptsItems: string[]}>
  } {
    if (template.grade <= 2) {
      // Simple number matching for early grades
      return {
        items: [
          { id: 'item1', content: '3', category: 'small' },
          { id: 'item2', content: '8', category: 'medium' },
          { id: 'item3', content: '15', category: 'large' }
        ],
        categories: [
          { id: 'small', name: 'Kleine Zahlen (1-5)', acceptsItems: ['item1'] },
          { id: 'medium', name: 'Mittlere Zahlen (6-10)', acceptsItems: ['item2'] },
          { id: 'large', name: 'Große Zahlen (über 10)', acceptsItems: ['item3'] }
        ]
      };
    } else if (template.grade <= 4) {
      // Operation matching
      return {
        items: [
          { id: 'item1', content: `${parameters.a} + ${parameters.b}`, category: 'addition' },
          { id: 'item2', content: `${parameters.a} - ${parameters.b}`, category: 'subtraction' },
          { id: 'item3', content: `${parameters.a} × ${parameters.b}`, category: 'multiplication' },
          { id: 'item4', content: `${parameters.a} ÷ ${parameters.b}`, category: 'division' }
        ],
        categories: [
          { id: 'addition', name: 'Addition (+)', acceptsItems: ['item1'] },
          { id: 'subtraction', name: 'Subtraktion (-)', acceptsItems: ['item2'] },
          { id: 'multiplication', name: 'Multiplikation (×)', acceptsItems: ['item3'] },
          { id: 'division', name: 'Division (÷)', acceptsItems: ['item4'] }
        ]
      };
    } else {
      // Advanced mathematical concepts
      return {
        items: [
          { id: 'item1', content: 'x', category: 'variable' },
          { id: 'item2', content: '5x', category: 'coefficient' },
          { id: 'item3', content: '3x + 7', category: 'term' },
          { id: 'item4', content: '2x = 10', category: 'equation' }
        ],
        categories: [
          { id: 'variable', name: 'Variable', acceptsItems: ['item1'] },
          { id: 'coefficient', name: 'Koeffizient', acceptsItems: ['item2'] },
          { id: 'term', name: 'Term', acceptsItems: ['item3'] },
          { id: 'equation', name: 'Gleichung', acceptsItems: ['item4'] }
        ]
      };
    }
  }
}

interface FallbackTemplate {
  id: string;
  category: string;
  grade: number;
  questionTemplate: string;
  answerTemplate: string;
  explanationTemplate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching';
  baseQuality: number;
  curriculumAlignment: number;
}