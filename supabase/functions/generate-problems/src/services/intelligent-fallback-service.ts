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
    
    // Include templates from adjacent grades if needed
    if (templates.length < 5) {
      const adjacentGrades = [grade - 1, grade + 1].filter(g => g >= 1 && g <= 8);
      for (const adjGrade of adjacentGrades) {
        const adjKey = `${category}_${adjGrade}`;
        const adjTemplates = this.fallbackTemplates.get(adjKey) || [];
        templates = [...templates, ...adjTemplates];
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
    
    // Additional categories can be added here
  }

  private addMathFallbackTemplates(): void {
    const mathTemplates: FallbackTemplate[] = [
      {
        id: 'math_fallback_addition',
        category: 'math',
        grade: 1,
        questionTemplate: '{a} + {b} = ?',
        answerTemplate: '{sum}',
        explanationTemplate: '{a} + {b} = {sum}. Addition bedeutet zusammenzählen.',
        difficulty: 'easy',
        questionType: 'text-input',
        baseQuality: 0.7,
        curriculumAlignment: 0.9
      },
      {
        id: 'math_fallback_subtraction',
        category: 'math',
        grade: 1,
        questionTemplate: '{a} - {b} = ?',
        answerTemplate: '{difference}',
        explanationTemplate: '{a} - {b} = {difference}. Subtraktion bedeutet abziehen.',
        difficulty: 'easy',
        questionType: 'text-input',
        baseQuality: 0.7,
        curriculumAlignment: 0.9
      }
    ];

    // Add templates for different grades
    for (let grade = 1; grade <= 4; grade++) {
      this.fallbackTemplates.set(`math_${grade}`, mathTemplates);
    }
  }

  private addGermanFallbackTemplates(): void {
    const germanTemplates: FallbackTemplate[] = [
      {
        id: 'german_fallback_spelling',
        category: 'german',
        grade: 1,
        questionTemplate: 'Wie schreibt man "{word}" richtig?',
        answerTemplate: '{word}',
        explanationTemplate: 'Das Wort "{word}" wird so geschrieben.',
        difficulty: 'easy',
        questionType: 'text-input',
        baseQuality: 0.6,
        curriculumAlignment: 0.8
      }
    ];

    for (let grade = 1; grade <= 4; grade++) {
      this.fallbackTemplates.set(`german_${grade}`, germanTemplates);
    }
  }

  // Helper methods
  private generateTemplateParameters(template: FallbackTemplate, grade: number, index: number): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (template.category === 'math') {
      const range = grade <= 2 ? { min: 1, max: 20 } : { min: 1, max: 100 };
      params.a = Math.floor(Math.random() * range.max) + range.min;
      params.b = Math.floor(Math.random() * Math.min(range.max / 2, 20)) + 1;
      params.sum = params.a + params.b;
      params.difference = Math.max(params.a - params.b, 0);
    }
    
    return params;
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
}

interface FallbackTemplate {
  id: string;
  category: string;
  grade: number;
  questionTemplate: string;
  answerTemplate: string;
  explanationTemplate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'text-input' | 'multiple-choice' | 'word-selection';
  baseQuality: number;
  curriculumAlignment: number;
}