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
        
        // Also include matching and terminology templates for adjacent grades
        if (category === 'math') {
          const adjMatchingKey = `math_matching_${adjGrade}`;
          const adjMatchingTemplates = this.fallbackTemplates.get(adjMatchingKey) || [];
          templates = [...templates, ...adjMatchingTemplates];
          
          const adjTerminologyKey = `math_terminology_${adjGrade}`;
          const adjTerminologyTemplates = this.fallbackTemplates.get(adjTerminologyKey) || [];
          templates = [...templates, ...adjTerminologyTemplates];
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
    const existingTypes = new Set(existingQuestions.map(q => this.inferQuestionType(q, 'unknown')));
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

      // Add type-specific properties - NEVER allow word-selection for math
      if (template.questionType === 'multiple-choice') {
        selectionQuestion.options = this.generateMultipleChoiceOptions(answer, template, parameters);
        selectionQuestion.correctAnswer = 0; // Correct answer is always first, then shuffled
      } else if (template.questionType === 'text-input') {
        selectionQuestion.answer = answer;
      } else if (template.questionType === 'matching') {
        const matchingData = this.generateMatchingData(template, parameters);
        selectionQuestion.items = matchingData.items;
        selectionQuestion.categories = matchingData.categories;
      } else if (template.questionType === 'word-selection' && request.category !== 'math') {
        // Only allow word-selection for non-math subjects
        // Word selection not implemented for fallback service
        selectionQuestion.sentence = template.questionTemplate;
        selectionQuestion.selectableWords = [];
      } else if (template.questionType === 'word-selection' && request.category === 'math') {
        // Convert to text-input for math subjects
        selectionQuestion.questionType = 'text-input';
        selectionQuestion.answer = answer;
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
      
      // Add math terminology questions for higher grades
      if (grade >= 3) {
        const terminologyTemplates = this.createMathTerminologyTemplates(grade);
        this.fallbackTemplates.set(`math_terminology_${grade}`, terminologyTemplates);
      }
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

  private createMathTerminologyTemplates(grade: number): FallbackTemplate[] {
    const templates: FallbackTemplate[] = [];
    
    const terminologyQuestions = this.getMathTerminologyByGrade(grade);
    
    terminologyQuestions.forEach((termQuestion, index) => {
      templates.push({
        id: `math_terminology_${termQuestion.concept}_grade${grade}`,
        category: 'math',
        grade,
        questionTemplate: termQuestion.question,
        answerTemplate: termQuestion.correctAnswer,
        explanationTemplate: termQuestion.explanation,
        difficulty: grade <= 4 ? 'easy' : grade <= 7 ? 'medium' : 'hard',
        questionType: 'multiple-choice',
        baseQuality: 0.9,
        curriculumAlignment: 0.95
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

  private getMathTerminologyByGrade(grade: number): Array<{
    concept: string;
    question: string;
    correctAnswer: string;
    explanation: string;
  }> {
    const terminology = {
      3: [
        {
          concept: 'addition',
          question: 'Wie heißt das Ergebnis einer Addition?',
          correctAnswer: 'Summe',
          explanation: 'Das Ergebnis einer Addition heißt Summe. Beispiel: 3 + 5 = 8. Die Summe ist 8.'
        },
        {
          concept: 'subtraktion',
          question: 'Wie heißt das Ergebnis einer Subtraktion?',
          correctAnswer: 'Differenz',
          explanation: 'Das Ergebnis einer Subtraktion heißt Differenz. Beispiel: 8 - 3 = 5. Die Differenz ist 5.'
        }
      ],
      4: [
        {
          concept: 'multiplikation',
          question: 'Wie heißt das Ergebnis einer Multiplikation?',
          correctAnswer: 'Produkt',
          explanation: 'Das Ergebnis einer Multiplikation heißt Produkt. Beispiel: 4 × 3 = 12. Das Produkt ist 12.'
        },
        {
          concept: 'division',
          question: 'Wie heißt das Ergebnis einer Division?',
          correctAnswer: 'Quotient',
          explanation: 'Das Ergebnis einer Division heißt Quotient. Beispiel: 12 ÷ 3 = 4. Der Quotient ist 4.'
        }
      ],
      5: [
        {
          concept: 'bruch',
          question: 'Wie heißt die Zahl über dem Bruchstrich?',
          correctAnswer: 'Zähler',
          explanation: 'Die Zahl über dem Bruchstrich heißt Zähler. Bei 3/4 ist 3 der Zähler.'
        },
        {
          concept: 'bruch',
          question: 'Wie heißt die Zahl unter dem Bruchstrich?',
          correctAnswer: 'Nenner',
          explanation: 'Die Zahl unter dem Bruchstrich heißt Nenner. Bei 3/4 ist 4 der Nenner.'
        }
      ]
    };

    const gradeTerms = terminology[Math.min(grade, 5) as keyof typeof terminology] || terminology[5];
    return gradeTerms;
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
    // Generate parametrized matching questions to avoid repetition
    const templates = this.getParametrizedMatchingTemplates(grade);
    return templates.map(template => this.instantiateMatchingTemplate(template, grade));
  }

  private getParametrizedMatchingTemplates(grade: number): Array<{
    type: string,
    questionTemplate: string,
    itemTemplates: Array<{template: string, categoryTemplate: string}>,
    explanationTemplate: string
  }> {
    if (grade <= 2) {
      // Grade 1-2: Basic counting and shapes according to curriculum
      return [
        {
          type: 'numbers',
          questionTemplate: 'Ordne die Zahlen den richtigen Gruppen zu:',
          itemTemplates: [
            {template: '{small}', categoryTemplate: 'Kleine Zahlen (1-5)'},
            {template: '{medium}', categoryTemplate: 'Mittlere Zahlen (6-10)'},
            {template: '{large}', categoryTemplate: 'Große Zahlen (über 10)'}
          ],
          explanationTemplate: 'Zahlen werden nach ihrer Größe gruppiert: klein (1-5), mittel (6-10), groß (über 10).'
        },
        {
          type: 'shapes',
          questionTemplate: 'Ordne die Formen zu:',
          itemTemplates: [
            {template: '⚪', categoryTemplate: 'Runde Formen'},
            {template: '⬜', categoryTemplate: 'Eckige Formen'},
            {template: '🔺', categoryTemplate: 'Spitze Formen'}
          ],
          explanationTemplate: 'Formen werden nach ihren Eigenschaften sortiert.'
        }
      ];
    } else if (grade <= 3) {
      // Grade 3: Basic operations in ZR 100, geometry basics
      return [
        {
          type: 'operations',
          questionTemplate: 'Ordne jede Aufgabe der richtigen Rechenart zu:',
          itemTemplates: [
            {template: '{a} + {b}', categoryTemplate: 'Addition'},
            {template: '{c} - {d}', categoryTemplate: 'Subtraktion'},
            {template: '{e} × {f}', categoryTemplate: 'Multiplikation'},  // Multiplication introduced in Grade 3
            {template: '{g} ÷ {h}', categoryTemplate: 'Division'}
          ],
          explanationTemplate: 'Addition (+) bedeutet zusammenzählen, Subtraktion (-) bedeutet abziehen, Multiplikation (×) ist vervielfachen, Division (÷) ist teilen.'
        },
        {
          type: 'geometry_properties',
          questionTemplate: 'Ordne die Eigenschaften den Formen zu:',
          itemTemplates: [
            {template: '4 gleiche Seiten', categoryTemplate: 'Quadrat'},
            {template: '3 Ecken', categoryTemplate: 'Dreieck'},
            {template: 'rund ohne Ecken', categoryTemplate: 'Kreis'},
            {template: '4 Seiten, gegenüber gleich', categoryTemplate: 'Rechteck'}
          ],
          explanationTemplate: 'Geometrische Figuren haben charakteristische Eigenschaften.'
        }
      ];
    } else if (grade <= 4) {
      // Grade 4: ZR 1000, decimal numbers introduced
      return [
        {
          type: 'calculations',
          questionTemplate: 'Ordne jede Aufgabe ihrem Ergebnis zu:',
          itemTemplates: [
            {template: '{simple_add_a} + {simple_add_b}', categoryTemplate: '{simple_add_result}'},
            {template: '{simple_sub_a} - {simple_sub_b}', categoryTemplate: '{simple_sub_result}'},
            {template: '{simple_mul_a} × {simple_mul_b}', categoryTemplate: '{simple_mul_result}'}
          ],
          explanationTemplate: 'Jede Rechenaufgabe hat ein eindeutiges Ergebnis.'
        },
        {
          type: 'decimal_basics',
          questionTemplate: 'Ordne die Geldbeträge ihrer Schreibweise zu:',
          itemTemplates: [
            {template: '{euro_1} Euro {cent_1} Cent', categoryTemplate: '{euro_1},{cent_1_formatted} €'},
            {template: '{euro_2} Euro {cent_2} Cent', categoryTemplate: '{euro_2},{cent_2_formatted} €'},
            {template: '{euro_3} Euro {cent_3} Cent', categoryTemplate: '{euro_3},{cent_3_formatted} €'}
          ],
          explanationTemplate: 'Geldbeträge können als Dezimalzahlen mit Komma geschrieben werden.'
        }
      ];
    } else if (grade <= 5) {
      // Grade 5: Fractions, negative numbers, basic proportions
      return [
        {
          type: 'fractions_decimals',
          questionTemplate: 'Ordne die Brüche ihrer Dezimaldarstellung zu:',
          itemTemplates: [
            {template: '{fraction_1}', categoryTemplate: '{decimal_1}'},
            {template: '{fraction_2}', categoryTemplate: '{decimal_2}'},
            {template: '{fraction_3}', categoryTemplate: '{decimal_3}'},
            {template: '{fraction_4}', categoryTemplate: '{decimal_4}'}
          ],
          explanationTemplate: 'Brüche können als Dezimalzahlen geschrieben werden.'
        },
        {
          type: 'negative_numbers',
          questionTemplate: 'Ordne die Zahlen ihrer Position zu:',
          itemTemplates: [
            {template: '{positive}', categoryTemplate: 'Positive Zahl'},
            {template: '-{negative}', categoryTemplate: 'Negative Zahl'},
            {template: '0', categoryTemplate: 'Null'}
          ],
          explanationTemplate: 'Negative Zahlen sind kleiner als null und stehen links von null auf der Zahlengerade.'
        }
      ];
    } else if (grade <= 6) {
      // Grade 6: Percentage basics, proportions, basic powers
      return [
        {
          type: 'percentage_calculations',
          questionTemplate: 'Ordne die Prozentaufgaben ihrem Ergebnis zu:',
          itemTemplates: [
            {template: '{percent_1}% von {base_1}', categoryTemplate: '{percent_result_1}'},
            {template: '{percent_2}% von {base_2}', categoryTemplate: '{percent_result_2}'},
            {template: '{percent_3}% von {base_3}', categoryTemplate: '{percent_result_3}'}
          ],
          explanationTemplate: 'Prozentrechnung: {percent}% von {base} = ({percent} × {base}) ÷ 100'
        },
        {
          type: 'basic_powers',
          questionTemplate: 'Ordne die Potenzen ihrem Wert zu:',
          itemTemplates: [
            {template: '{base_1}²', categoryTemplate: '{square_result_1}'},
            {template: '{base_2}²', categoryTemplate: '{square_result_2}'},
            {template: '{base_3}³', categoryTemplate: '{cube_result_1}'}  // Only basic cubes
          ],
          explanationTemplate: 'Potenzen sind verkürzte Schreibweise für wiederholte Multiplikation.'
        }
      ];
    } else if (grade <= 7) {
      // Grade 7: Proportions, basic algebra terms
      return [
        {
          type: 'proportions',
          questionTemplate: 'Ordne die Verhältnisse zu:',
          itemTemplates: [
            {template: '{ratio_a}:{ratio_b}', categoryTemplate: 'Verhältnis {ratio_desc_1}'},
            {template: '{ratio_c}:{ratio_d}', categoryTemplate: 'Verhältnis {ratio_desc_2}'},
            {template: '{ratio_e}:{ratio_f}', categoryTemplate: 'Verhältnis {ratio_desc_3}'}
          ],
          explanationTemplate: 'Verhältnisse zeigen, wie sich Größen zueinander verhalten.'
        },
        {
          type: 'basic_algebra',
          questionTemplate: 'Ordne die Terme ihrer Beschreibung zu:',
          itemTemplates: [
            {template: '{coeff}x', categoryTemplate: 'Variable mit Koeffizient'},
            {template: '{term_a}x + {term_b}', categoryTemplate: 'Linearer Term'},
            {template: '{constant}', categoryTemplate: 'Konstante Zahl'}
          ],
          explanationTemplate: 'Algebraische Terme enthalten Zahlen, Variablen und Rechenzeichen.'
        }
      ];
    } else if (grade <= 8) {
      // Grade 8: Linear functions, basic equation solving
      return [
        {
          type: 'linear_functions',
          questionTemplate: 'Ordne die linearen Funktionen ihrer Eigenschaft zu:',
          itemTemplates: [
            {template: 'f(x) = {m}x + {b}', categoryTemplate: 'Steigung: {m}'},
            {template: 'f(x) = {m2}x', categoryTemplate: 'Ursprungsgerade mit Steigung {m2}'},
            {template: 'f(x) = {constant}', categoryTemplate: 'Waagerechte Gerade'}
          ],
          explanationTemplate: 'Lineare Funktionen haben eine konstante Steigung.'
        },
        {
          type: 'simple_equations',
          questionTemplate: 'Ordne die Gleichungen ihren Lösungen zu:',
          itemTemplates: [
            {template: 'x + {add} = {total}', categoryTemplate: 'x = {solution_1}'},
            {template: 'x - {sub} = {result}', categoryTemplate: 'x = {solution_2}'},
            {template: '{coeff}x = {product}', categoryTemplate: 'x = {solution_3}'}
          ],
          explanationTemplate: 'Gleichungen lösen bedeutet, den Wert der Variablen zu finden.'
        }
      ];
    } else {
      // Grade 9+: Quadratic functions, advanced algebra
      return [
        {
          type: 'quadratic_functions',
          questionTemplate: 'Ordne die Funktionen ihrem Typ zu:',
          itemTemplates: [
            {template: 'f(x) = x²', categoryTemplate: 'Normalparabel'},
            {template: 'f(x) = {a}x² + {b}', categoryTemplate: 'Verschobene Parabel'},
            {template: 'f(x) = {m}x + {n}', categoryTemplate: 'Lineare Funktion'}
          ],
          explanationTemplate: 'Quadratische Funktionen haben x² als höchste Potenz.'
        },
        {
          type: 'advanced_equations',
          questionTemplate: 'Ordne die Gleichungstypen zu:',
          itemTemplates: [
            {template: 'x² = {square_val}', categoryTemplate: 'Quadratische Gleichung'},
            {template: '{a}x + {b} = {c}x + {d}', categoryTemplate: 'Lineare Gleichung'},
            {template: '√x = {root_val}', categoryTemplate: 'Wurzelgleichung'}
          ],
          explanationTemplate: 'Verschiedene Gleichungstypen erfordern unterschiedliche Lösungsverfahren.'
        }
      ];
    }
  }

  private instantiateMatchingTemplate(template: any, grade: number): {
    category: string,
    question: string,
    correctMatches: Array<{item: string, category: string}>,
    explanation: string
  } {
    const parameters = this.generateMatchingParameters(template.type, grade);
    
    const correctMatches = template.itemTemplates.map((itemTemplate: any) => ({
      item: this.fillTemplate(itemTemplate.template, parameters),
      category: this.fillTemplate(itemTemplate.categoryTemplate, parameters)
    }));

    return {
      category: template.type,
      question: this.fillTemplate(template.questionTemplate, parameters),
      correctMatches,
      explanation: this.fillTemplate(template.explanationTemplate, parameters)
    };
  }

  private generateMatchingParameters(templateType: string, grade: number): Record<string, any> {
    const params: Record<string, any> = {};
    
    switch (templateType) {
      case 'numbers':
        params.small = Math.floor(Math.random() * 5) + 1;
        params.medium = Math.floor(Math.random() * 5) + 6;
        params.large = Math.floor(Math.random() * 10) + 11;
        break;
        
      case 'operations':
        // Grade-appropriate ranges for operations
        const maxRange = grade <= 3 ? 50 : 100;
        params.a = Math.floor(Math.random() * maxRange) + 10;
        params.b = Math.floor(Math.random() * 30) + 5;
        params.c = Math.floor(Math.random() * maxRange) + 20;
        params.d = Math.floor(Math.random() * 40) + 10;
        params.e = Math.floor(Math.random() * 9) + 2;
        params.f = Math.floor(Math.random() * 9) + 2;
        params.g = (Math.floor(Math.random() * 8) + 2) * (Math.floor(Math.random() * 8) + 2);
        params.h = Math.floor(Math.random() * 8) + 2;
        break;
        
      case 'calculations':
        params.simple_add_a = Math.floor(Math.random() * 20) + 5;
        params.simple_add_b = Math.floor(Math.random() * 15) + 3;
        params.simple_add_result = params.simple_add_a + params.simple_add_b;
        
        params.simple_sub_a = Math.floor(Math.random() * 30) + 20;
        params.simple_sub_b = Math.floor(Math.random() * 15) + 5;
        params.simple_sub_result = params.simple_sub_a - params.simple_sub_b;
        
        params.simple_mul_a = Math.floor(Math.random() * 8) + 2;
        params.simple_mul_b = Math.floor(Math.random() * 8) + 2;
        params.simple_mul_result = params.simple_mul_a * params.simple_mul_b;
        break;

      case 'decimal_basics':
        params.euro_1 = Math.floor(Math.random() * 10) + 1;
        params.cent_1 = Math.floor(Math.random() * 95) + 5;
        params.cent_1_formatted = params.cent_1.toString().padStart(2, '0');
        
        params.euro_2 = Math.floor(Math.random() * 20) + 5;
        params.cent_2 = Math.floor(Math.random() * 90) + 10;
        params.cent_2_formatted = params.cent_2.toString().padStart(2, '0');
        
        params.euro_3 = Math.floor(Math.random() * 15) + 3;
        params.cent_3 = Math.floor(Math.random() * 85) + 15;
        params.cent_3_formatted = params.cent_3.toString().padStart(2, '0');
        break;
        
      case 'fractions_decimals':
        const fractions = [
          {fraction: '1/2', decimal: '0,5'},
          {fraction: '1/4', decimal: '0,25'},
          {fraction: '3/4', decimal: '0,75'},
          {fraction: '1/5', decimal: '0,2'},
          {fraction: '2/5', decimal: '0,4'},
          {fraction: '3/5', decimal: '0,6'},
          {fraction: '1/8', decimal: '0,125'},
          {fraction: '3/8', decimal: '0,375'},
          {fraction: '1/10', decimal: '0,1'},
          {fraction: '3/10', decimal: '0,3'}
        ];
        
        const shuffled = fractions.sort(() => Math.random() - 0.5).slice(0, 4);
        shuffled.forEach((frac, i) => {
          params[`fraction_${i + 1}`] = frac.fraction;
          params[`decimal_${i + 1}`] = frac.decimal;
        });
        break;

      case 'negative_numbers':
        params.positive = Math.floor(Math.random() * 20) + 1;
        params.negative = Math.floor(Math.random() * 15) + 1;
        break;
        
      case 'percentage_calculations':
        // Only simple percentages for grade 6
        params.percent_1 = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
        params.base_1 = [20, 40, 60, 80, 100][Math.floor(Math.random() * 5)];
        params.percent_result_1 = (params.percent_1 * params.base_1) / 100;
        
        params.percent_2 = [15, 30, 45][Math.floor(Math.random() * 3)];
        params.base_2 = [40, 60, 80][Math.floor(Math.random() * 3)];
        params.percent_result_2 = (params.percent_2 * params.base_2) / 100;
        
        params.percent_3 = [5, 25, 75][Math.floor(Math.random() * 3)];
        params.base_3 = [20, 40, 80][Math.floor(Math.random() * 3)];
        params.percent_result_3 = (params.percent_3 * params.base_3) / 100;
        break;
        
      case 'basic_powers':
        params.base_1 = Math.floor(Math.random() * 6) + 2; // 2-7
        params.square_result_1 = params.base_1 * params.base_1;
        
        params.base_2 = Math.floor(Math.random() * 5) + 3; // 3-7
        params.square_result_2 = params.base_2 * params.base_2;
        
        params.base_3 = Math.floor(Math.random() * 3) + 2; // 2-4
        params.cube_result_1 = params.base_3 * params.base_3 * params.base_3;
        break;

      case 'proportions':
        params.ratio_a = Math.floor(Math.random() * 8) + 2;
        params.ratio_b = Math.floor(Math.random() * 6) + 2;
        params.ratio_desc_1 = `${params.ratio_a} zu ${params.ratio_b}`;
        
        params.ratio_c = Math.floor(Math.random() * 7) + 3;
        params.ratio_d = Math.floor(Math.random() * 5) + 2;
        params.ratio_desc_2 = `${params.ratio_c} zu ${params.ratio_d}`;
        
        params.ratio_e = Math.floor(Math.random() * 9) + 1;
        params.ratio_f = Math.floor(Math.random() * 8) + 2;
        params.ratio_desc_3 = `${params.ratio_e} zu ${params.ratio_f}`;
        break;

      case 'basic_algebra':
        params.coeff = Math.floor(Math.random() * 7) + 2;
        params.term_a = Math.floor(Math.random() * 5) + 2;
        params.term_b = Math.floor(Math.random() * 10) + 1;
        params.constant = Math.floor(Math.random() * 15) + 5;
        break;

      case 'linear_functions':
        params.m = Math.floor(Math.random() * 8) + 1;
        params.b = Math.floor(Math.random() * 10) - 5;
        params.m2 = Math.floor(Math.random() * 6) + 1;
        params.constant = Math.floor(Math.random() * 12) + 1;
        break;

      case 'simple_equations':
        params.add = Math.floor(Math.random() * 10) + 5;
        params.total = Math.floor(Math.random() * 20) + 15;
        params.solution_1 = params.total - params.add;
        
        params.sub = Math.floor(Math.random() * 8) + 3;
        params.result = Math.floor(Math.random() * 15) + 5;
        params.solution_2 = params.result + params.sub;
        
        params.coeff = Math.floor(Math.random() * 5) + 2;
        params.product = params.coeff * (Math.floor(Math.random() * 8) + 2);
        params.solution_3 = params.product / params.coeff;
        break;

      case 'quadratic_functions':
        params.a = Math.floor(Math.random() * 4) + 1;
        params.b = Math.floor(Math.random() * 10) - 5;
        params.m = Math.floor(Math.random() * 5) + 1;
        params.n = Math.floor(Math.random() * 8) + 1;
        break;

      case 'advanced_equations':
        params.square_val = Math.pow(Math.floor(Math.random() * 6) + 2, 2);
        params.a = Math.floor(Math.random() * 4) + 2;
        params.b = Math.floor(Math.random() * 8) + 3;
        params.c = Math.floor(Math.random() * 3) + 1;
        params.d = Math.floor(Math.random() * 6) + 2;
        params.root_val = Math.floor(Math.random() * 8) + 2;
        break;
    }
    
    return params;
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
    
    // Generate plausible wrong answers based on template type
    if (template.id.includes('terminology')) {
      // For math terminology, use meaningful wrong answers
      const wrongAnswers = this.getMathTerminologyDistractors(correctAnswer, template.grade);
      options.push(...wrongAnswers);
    } else if (template.category === 'math') {
      // For numeric answers
      const correct = parseInt(correctAnswer);
      if (!isNaN(correct)) {
        options.push((correct + 1).toString());
        options.push((correct - 1).toString());
        options.push((correct + 5).toString());
      } else {
        // For non-numeric math answers
        options.push('Ergebnis', 'Lösung', 'Antwort');
      }
    }
    
    // Ensure we have exactly 4 options
    while (options.length < 4) {
      options.push(`Option ${options.length + 1}`);
    }
    
    // Remove duplicates and take only first 4
    const uniqueOptions = [...new Set(options)].slice(0, 4);
    
    // Shuffle options
    for (let i = uniqueOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueOptions[i], uniqueOptions[j]] = [uniqueOptions[j], uniqueOptions[i]];
    }
    
    return uniqueOptions;
  }

  private getMathTerminologyDistractors(correctAnswer: string, grade: number): string[] {
    const distractorMap: Record<string, string[]> = {
      'Summe': ['Differenz', 'Produkt', 'Quotient'],
      'Differenz': ['Summe', 'Produkt', 'Rest'],
      'Produkt': ['Summe', 'Quotient', 'Ergebnis'],
      'Quotient': ['Produkt', 'Summe', 'Teiler'],
      'Zähler': ['Nenner', 'Bruchstrich', 'Ganzes'],
      'Nenner': ['Zähler', 'Bruchstrich', 'Teil']
    };
    
    return distractorMap[correctAnswer] || ['Option A', 'Option B', 'Option C'];
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

  private inferQuestionType(question: string, category: string = 'unknown'): string {
    // Never use word-selection for math subjects
    if (category.toLowerCase() === 'math' || category.toLowerCase() === 'mathematik') {
      if (question.includes('Wähle') || question.includes('Markiere')) {
        return 'multiple-choice';
      }
      if (question.includes('Ordne') || question.includes('Verbinde')) {
        return 'matching';
      }
      return 'text-input'; // Default for math
    }
    
    // For non-math subjects, allow word-selection
    if (question.includes('Wähle') && question.includes('Wort')) {
      return 'word-selection';
    }
    if (question.includes('Wähle') || question.includes('Markiere')) {
      return 'multiple-choice';
    }
    if (question.includes('Ordne') || question.includes('Verbinde')) {
      return 'matching';
    }
    if (question.includes('Berechne') || question.includes('Rechne')) {
      return 'text-input';
    }
    
    // Legacy fallback logic
    if (question.includes('=')) return 'text-input';
    if (question.includes('?')) return 'multiple-choice';
    return 'text-input';
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