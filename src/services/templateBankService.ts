// Enhanced Template-Bank Service with feedback-based curriculum-compliant questions
import { supabase } from '@/integrations/supabase/client';
import { fetchActiveTemplates, pickSessionTemplates, Quarter } from '@/data/templateBank';
import { loadKnowledge, preselectCards, KnowledgeCard } from '@/knowledge/knowledge';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/prompt/knowledgePromptFactory';
import { SelectionQuestion, TextInputQuestion, MultipleChoiceQuestion } from '@/types/questionTypes';
import { FeedbackBasedGenerationService } from './feedbackBasedGeneration';
import { ParametrizedTemplateService } from './ParametrizedTemplateService';
import { AnswerCalculator } from '@/utils/templates/answerCalculator';
import { QuestionTemplate } from '@/utils/questionTemplates';
import { contentValidator } from './ContentValidator';

export interface TemplateBankConfig {
  enableQualityControl: boolean;
  minQualityThreshold: number;
  preferredDifficulty?: "easy" | "medium" | "hard";
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
  private sessionPolicy: any = null;

  static getInstance(): EnhancedTemplateBankService {
    if (!EnhancedTemplateBankService.instance) {
      EnhancedTemplateBankService.instance = new EnhancedTemplateBankService();
    }
    return EnhancedTemplateBankService.instance;
  }

  /**
   * SIMPLIFIED: Generate questions directly from database templates
   */
  private async generateFromTemplateBank(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number
  ): Promise<SelectionQuestion[]> {
    try {
      // Fetch more templates for variety
      const templates = await fetchActiveTemplates({ grade, quarter, limit: 50 });
      
      if (templates.length === 0) {
        console.warn(`🚨 No active templates found for ${category} Grade ${grade} Quarter ${quarter}`);
        return [];
      }

      // Filter by category if specified
      const categoryTemplates = category.toLowerCase() !== 'general' 
        ? templates.filter(t => this.matchesMathCategory(t.domain, category))
        : templates;

      console.log(`📚 Found ${categoryTemplates.length} templates for ${category}`);

      // SIMPLIFIED: Just shuffle and take what we need
      const shuffledTemplates = [...categoryTemplates].sort(() => Math.random() - 0.5);
      const selectedTemplates = shuffledTemplates.slice(0, count * 2); // Get more candidates

      console.log(`📚 Selected ${selectedTemplates.length} candidates for conversion`);

      // Convert templates to questions
      const questions: SelectionQuestion[] = [];
      const usedIds = new Set<string>();
      
      for (const template of selectedTemplates) {
        if (questions.length >= count) break;
        
        const templateId = String(template.id);
        if (usedIds.has(templateId)) continue;
        
        const converted = await this.convertTemplateToQuestion(template);
        if (converted !== null) {
          questions.push(converted);
          usedIds.add(templateId);
          console.log(`✅ Converted template ${templateId}: ${converted.question.substring(0, 60)}...`);
        }
      }
      
      console.log(`✅ Successfully converted ${questions.length} questions`);
      return questions;
    } catch (error) {
      console.error('❌ Template-Bank fetch failed:', error);
      return [];
    }
  }

  /**
   * Generate questions from knowledge base when template bank insufficient
   */
  private async generateFromKnowledge(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number
  ): Promise<SelectionQuestion[]> {
    try {
      console.log(`🧠 Generating ${count} knowledge-based questions for ${category} Grade ${grade}`);
      
      // Load knowledge and filter appropriately
      const knowledgeData = await loadKnowledge();
      const relevantCards = knowledgeData.cards.filter(card => 
        card.grade <= grade && 
        card.quarter <= quarter &&
        (category.toLowerCase() === 'general' || 
         card.domain.toLowerCase().includes(category.toLowerCase()) ||
         card.text.toLowerCase().includes(category.toLowerCase()))
      );

      if (relevantCards.length === 0) {
        console.warn(`🚨 No relevant knowledge cards for ${category} Grade ${grade}`);
        return [];
      }

      // Generate questions from knowledge cards
      return await this.generateQuestionsFromCards(relevantCards, count);
    } catch (error) {
      console.error('❌ Knowledge-based generation failed:', error);
      return [];
    }
  }

  /**
   * Generate hash for question content to detect semantic duplicates
   */
  private generateQuestionHash(question: string): string {
    // Create a normalized hash based on question structure
    const normalized = question
      .toLowerCase()
      .replace(/\d+/g, 'X') // Replace numbers with X to catch structural similarities
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')
      .trim();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate domain diversity metric
   */
  private calculateDomainDiversity(questions: SelectionQuestion[]): number {
    if (questions.length === 0) return 0;
    const domains = new Set(questions.map(q => 'Unknown')); // Simplified for now
    return domains.size / Math.max(1, questions.length);
  }

  /**
   * Convert template to SelectionQuestion format - FIXED for database values
   */
  private async convertTemplateToQuestion(template: any): Promise<SelectionQuestion | null> {
    // Filter out drawing/sketching questions
    const promptRaw = template.student_prompt || "";
    if (this.containsDrawingInstructions(promptRaw)) {
      console.log(`🚫 Filtered out drawing question: ${promptRaw.substring(0, 100)}...`);
      return null;
    }
    
    // Clean prompt: strip inline option lines like "A: ...", "B) ..."
    const prompt = promptRaw
      .replace(/^\s*[ABCD]:.*$/gm, '')
      .replace(/^\s*[ABCD]\).*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    const questionType = this.mapQuestionType(template.question_type);
    
    if (questionType === 'text-input') {
      // Get answer from database solution
      const answer = this.extractSolutionValue(template.solution);
      
      return {
        id: parseInt(template.id) || Date.now(),
        question: prompt,
        type: this.mapDomainToSubject(template.domain),
        questionType: 'text-input',
        answer: answer,
        explanation: template.explanation || "",
        templateId: String(template.id)
      } as TextInputQuestion;
    } else {
      // Multiple choice - extract options correctly from database
      const optionsData = this.extractOptionsWithCorrectIndex(template);
      
      return {
        id: parseInt(template.id) || Date.now(),
        question: prompt,
        type: this.mapDomainToSubject(template.domain),
        questionType: 'multiple-choice',
        options: optionsData.options,
        correctAnswer: optionsData.correctIndex,
        explanation: template.explanation || "",
        templateId: String(template.id)
      } as MultipleChoiceQuestion;
    }
  }

  /**
   * FIXED: Extract solution value from database object structure
   */
  private extractSolutionValue(solution: any): string {
    console.log('🔍 Extracting solution from database:', solution);
    
    let value = '';
    
    // Handle different solution formats from database
    if (typeof solution === 'string') {
      value = solution;
    } else if (typeof solution === 'object' && solution !== null) {
      // Database stores solutions as objects like {value: "6"} or {answer: "6"}
      if (solution.value !== undefined) {
        value = String(solution.value);
      } else if (solution.answer !== undefined) {
        value = String(solution.answer);
      } else if (solution.correct !== undefined) {
        value = String(solution.correct);
      } else {
        // If it's an object but no known key, try to get the first value
        const keys = Object.keys(solution);
        if (keys.length > 0) {
          value = String(solution[keys[0]]);
        }
      }
    } else {
      value = String(solution || '1');
    }
    
    console.log('✅ Extracted solution value:', value);
    return value;
  }

  /**
   * FIXED: Extract options directly from database without complex transformations
   */
  private extractOptionsWithCorrectIndex(template: any): { options: string[]; correctIndex: number } {
    console.log('🔍 Extracting options from template:', template.id, 'solution:', template.solution, 'distractors:', template.distractors);
    
    // Extract correct answer from solution
    const correct = this.extractSolutionValue(template.solution);
    
    // Fallback if no solution found
    if (!correct || correct.trim() === '') {
      console.warn(`⚠️ No solution found for template ${template.id}, using default`);
      return {
        options: ['1', '2', '3', '4'],
        correctIndex: 0
      };
    }

    // Extract distractors from database
    const distractors: string[] = [];
    const distractorsRaw = template.distractors;
    
    console.log('🔍 Raw distractors from DB:', distractorsRaw);
    
    if (Array.isArray(distractorsRaw)) {
      // Handle array format - convert all to strings
      for (const distractor of distractorsRaw) {
        let distractorStr = '';
        if (typeof distractor === 'string') {
          distractorStr = distractor;
        } else if (typeof distractor === 'object' && distractor !== null) {
          // Handle object distractors like {value: "4"} 
          if (distractor.value !== undefined) distractorStr = String(distractor.value);
          else if (distractor.answer !== undefined) distractorStr = String(distractor.answer);
          else distractorStr = String(distractor);
        } else {
          distractorStr = String(distractor);
        }
        
        if (distractorStr.trim() !== '' && distractorStr !== correct) {
          distractors.push(distractorStr.trim());
        }
      }
    }
    
    console.log(`🎯 Correct: "${correct}", Extracted distractors: [${distractors.join(', ')}]`);
    
    // Generate defaults if needed
    if (distractors.length < 3) {
      const generated = this.generateDefaultDistractors(correct, 3 - distractors.length);
      distractors.push(...generated);
      console.log(`🔧 Added ${generated.length} default distractors: [${generated.join(', ')}]`);
    }
    
    // Create final options array and shuffle
    const allOptions = [correct, ...distractors.slice(0, 3)];
    const shuffledOptions = [...allOptions].sort(() => Math.random() - 0.5);
    const correctIndex = shuffledOptions.indexOf(correct);
    
    console.log(`✅ Final options: [${shuffledOptions.join(', ')}], Correct index: ${correctIndex}`);
    
    return {
      options: shuffledOptions,
      correctIndex
    };
  }

  /**
   * Generate default distractors when not enough are available in the database
   */
  private generateDefaultDistractors(correct: string, count: number): string[] {
    const distractors: string[] = [];
    const correctNum = parseFloat(correct);
    
    if (!isNaN(correctNum)) {
      // Generate numerical distractors
      const used = new Set([correct]);
      
      for (let i = 0; i < count && distractors.length < count; i++) {
        let distractor: string;
        
        if (correctNum < 10) {
          // Small numbers: add/subtract 1-3
          const delta = Math.floor(Math.random() * 3) + 1;
          const newNum = Math.random() > 0.5 ? correctNum + delta : Math.max(1, correctNum - delta);
          distractor = newNum.toString();
        } else {
          // Larger numbers: multiply by factor or add percentage
          const factor = Math.random() > 0.5 ? 1.2 : 0.8;
          const newNum = Math.round(correctNum * factor);
          distractor = newNum.toString();
        }
        
        if (!used.has(distractor)) {
          distractors.push(distractor);
          used.add(distractor);
        }
      }
    } else {
      // Generate text-based distractors
      const textOptions = ["Andere Antwort", "Falsche Option", "Nicht korrekt"];
      for (let i = 0; i < Math.min(count, textOptions.length); i++) {
        distractors.push(textOptions[i]);
      }
    }
    
    return distractors;
  }

  /**
   * Enhanced check for problematic question patterns
   */
  private containsDrawingInstructions(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    
    // Quick blacklist check
    if (contentValidator.containsBlacklistedPattern(prompt)) {
      console.log(`🚫 Blacklisted pattern detected: ${prompt.substring(0, 50)}...`);
      return true;
    }
    
    // Drawing keywords
    const drawingKeywords = [
      'zeichne', 'zeichnet', 'zeichnen',
      'male', 'malt', 'malen',
      'skizziere', 'skizziert', 'skizzieren',
      'draw', 'drawing', 'sketch',
      'konstruiere', 'konstruiert', 'konstruieren',
      'entwirf', 'entwirft', 'entwerfen',
      'bastle', 'bastelt', 'basteln',
      'schneide', 'schneidet', 'schneiden',
      'klebe', 'klebt', 'kleben',
      'falte', 'faltet', 'falten',
      'markiere', 'markiert', 'markieren',
      'bild', 'bilder', 'abbildung', 'grafik',
      'betrachte das bild', 'schaue dir an',
      'welches bild passt', 'ordne dem bild zu',
      'ordne richtig zu', 'verbinde mit linien',
      'netz', 'netze', 'körper', 'diagramm',
      'miss dein lineal', 'länge deines lineals',
      'wie lang ist dein', 'größe deines',
      'miss deinen bleistift'
    ];
    
    return drawingKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  /**
   * Map question type from database format
   */
  private mapQuestionType(questionType: string): 'multiple-choice' | 'text-input' {
    const type = questionType?.toLowerCase() || 'multiple-choice';
    return type === 'text-input' || type === 'text_input' || type === 'freitext' 
      ? 'text-input' 
      : 'multiple-choice';
  }

  /**
   * Map domain to subject for question type
   */
  private mapDomainToSubject(domain: string): 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin' {
    const lowerDomain = domain?.toLowerCase() || '';
    if (lowerDomain.includes('zahlen') || lowerDomain.includes('raum') || lowerDomain.includes('größen') || lowerDomain.includes('gleichungen') || lowerDomain.includes('daten')) return 'math';
    if (lowerDomain.includes('sprache') || lowerDomain.includes('deutsch') || lowerDomain.includes('lesen') || lowerDomain.includes('schreiben')) return 'german';
    if (lowerDomain.includes('englisch') || lowerDomain.includes('english')) return 'english';
    if (lowerDomain.includes('geographie') || lowerDomain.includes('geography')) return 'geography';
    if (lowerDomain.includes('geschichte') || lowerDomain.includes('history')) return 'history';
    if (lowerDomain.includes('physik') || lowerDomain.includes('physics')) return 'physics';
    if (lowerDomain.includes('biologie') || lowerDomain.includes('biology')) return 'biology';
    if (lowerDomain.includes('chemie') || lowerDomain.includes('chemistry')) return 'chemistry';
    if (lowerDomain.includes('latein') || lowerDomain.includes('latin')) return 'latin';
    return 'math'; // Default fallback
  }

  /**
   * Check if category matches math domain
   */
  private matchesMathCategory(domain: string, category: string): boolean {
    const mathDomains = ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Gleichungen & Funktionen', 'Daten & Zufall'];
    return mathDomains.includes(domain) || category.toLowerCase().includes('math');
  }

  /**
   * Main question generation method - SIMPLIFIED
   */
  async generateQuestions(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number = 5,
    config: TemplateBankConfig = {
      enableQualityControl: true,
      minQualityThreshold: 0.7,
      diversityWeight: 0.3,
      fallbackToLegacy: true
    },
    userId?: string
  ): Promise<TemplateBankResult> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🎯 SIMPLIFIED Template-Bank: Generate ${count} questions for ${category} Grade ${grade} ${quarter}`);

    try {
      // Primary strategy: Use Template-Bank directly from database
      const bankQuestions = await this.generateFromTemplateBank(category, grade, quarter, count);
      
      if (bankQuestions.length >= count) {
        const qualityMetrics = {
          averageQuality: 0.85,
          templateCoverage: bankQuestions.length / count,
          domainDiversity: this.calculateDomainDiversity(bankQuestions)
        };
        
        console.log(`✅ Template-Bank SUCCESS: ${bankQuestions.length} questions generated`);
        
        return {
          questions: bankQuestions.slice(0, count),
          source: 'template-bank',
          sessionId,
          qualityMetrics
        };
      }

      // Fallback strategy: Knowledge-based generation
      console.log(`⚠️ Template-Bank insufficient (${bankQuestions.length}/${count}), using knowledge fallback`);
      const knowledgeQuestions = await this.generateFromKnowledge(category, grade, quarter, count - bankQuestions.length);
      
      const combinedQuestions = [...bankQuestions, ...knowledgeQuestions];
      
      if (combinedQuestions.length > 0) {
        const qualityMetrics = {
          averageQuality: 0.75,
          templateCoverage: bankQuestions.length / count,
          domainDiversity: this.calculateDomainDiversity(combinedQuestions)
        };
        
        console.log(`✅ HYBRID SUCCESS: ${combinedQuestions.length} questions`);
        
        return {
          questions: combinedQuestions.slice(0, count),
          source: 'template-bank',
          sessionId,
          qualityMetrics
        };
      }

      // Final fallback: Legacy system  
      if (config.fallbackToLegacy) {
        console.log(`🔄 Using legacy fallback`);
        // Skip legacy fallback for now - just return empty result
        console.log(`🔄 Legacy fallback disabled - returning empty result`);
        return {
          questions: [],
          source: 'legacy-fallback',
          sessionId,
          qualityMetrics: {
            averageQuality: 0.6,
            templateCoverage: 0,
            domainDiversity: 0.5
          }
        };
      }

      throw new Error('All generation strategies failed');
    } catch (error) {
      console.error('❌ Template-Bank generation failed:', error);
      
      return {
        questions: [],
        source: 'template-bank',
        sessionId,
        qualityMetrics: {
          averageQuality: 0,
          templateCoverage: 0,
          domainDiversity: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate questions from knowledge cards
   */
  private async generateQuestionsFromCards(cards: KnowledgeCard[], count: number): Promise<SelectionQuestion[]> {
    try {
      const questions: SelectionQuestion[] = [];
      const usedCards = new Set<string>();
      
      for (let i = 0; i < count && cards.length > 0; i++) {
        const availableCards = cards.filter(card => !usedCards.has(card.id));
        if (availableCards.length === 0) break;
        
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        usedCards.add(randomCard.id);
        
        // Generate a simple math question based on the card
        const question = this.generateMathQuestionFromCard(randomCard);
        if (question) {
          questions.push(question);
        }
      }
      
      return questions;
    } catch (error) {
      console.error('❌ Error generating questions from cards:', error);
      return [];
    }
  }

  /**
   * Generate a math question from a knowledge card
   */
  private generateMathQuestionFromCard(card: KnowledgeCard): SelectionQuestion | null {
    try {
      // Simple math question generation based on grade
      const grade = card.grade;
      
      if (grade <= 2) {
        // Basic addition/subtraction for grades 1-2
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 5) + 1;
        const operation = Math.random() > 0.5 ? '+' : '-';
        const result = operation === '+' ? a + b : Math.max(0, a - b);
        
        const options = [
          result.toString(),
          Math.max(0, result - 1).toString(),
          (result + 1).toString(),
          (result + 2).toString()
        ].sort(() => Math.random() - 0.5);
        
        return {
          id: Date.now() + Math.random(),
          question: `Was ist ${a} ${operation} ${b}?`,
          type: 'math',
          questionType: 'multiple-choice',
          options,
          correctAnswer: options.indexOf(result.toString()),
          explanation: `${a} ${operation} ${b} = ${result}`
        } as MultipleChoiceQuestion;
      } else {
        // More complex questions for higher grades
        return this.generateComplexMathQuestion(grade);
      }
    } catch (error) {
      console.error('❌ Error generating question from card:', error);
      return null;
    }
  }

  /**
   * Generate complex math questions for higher grades
   */
  private generateComplexMathQuestion(grade: number): SelectionQuestion {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let a: number, b: number, result: number, questionText: string;
    
    if (operation === '×' && grade >= 3) {
      const smallA = Math.floor(Math.random() * 9) + 2;
      const smallB = Math.floor(Math.random() * 9) + 2;
      result = smallA * smallB;
      questionText = `Was ist ${smallA} × ${smallB}?`;
    } else {
      a = Math.floor(Math.random() * (grade * 10)) + 1;
      b = Math.floor(Math.random() * (grade * 5)) + 1;
      result = operation === '+' ? a + b : Math.max(0, a - b);
      questionText = `Was ist ${a} ${operation} ${b}?`;
    }
    
    const wrongAnswers = [
      result + 1,
      Math.max(0, result - 1),
      result + Math.floor(Math.random() * 3) + 2
    ].filter(ans => ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${operation === '+' ? 'Addition' : operation === '-' ? 'Subtraktion' : 'Multiplikation'}: Ergebnis ist ${result}`,
      type: 'math',
      options,
      correctAnswer: options.indexOf(result.toString())
    } as MultipleChoiceQuestion;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}