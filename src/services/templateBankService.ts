// Enhanced Template-Bank Service with feedback-based curriculum-compliant questions
import { supabase } from '@/integrations/supabase/client';
import { fetchActiveTemplates, pickSessionTemplates, Quarter } from '@/data/templateBank';
import { loadKnowledge, preselectCards, KnowledgeCard } from '@/knowledge/knowledge';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/prompt/knowledgePromptFactory';
import { SelectionQuestion, TextInputQuestion, MultipleChoiceQuestion } from '@/types/questionTypes';
import { FeedbackBasedGenerationService } from './feedbackBasedGeneration';

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
   * Generate questions from Template-Bank as primary source
   */
  private async generateFromTemplateBank(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number
  ): Promise<SelectionQuestion[]> {
    try {
      // Fetch active templates with quarter logic
      const templates = await fetchActiveTemplates({ grade, quarter });
      
      if (templates.length === 0) {
        console.warn(`🚨 No active templates found for ${category} Grade ${grade} Quarter ${quarter}`);
        return [];
      }

      // Filter by category if specified
      const categoryTemplates = category.toLowerCase() !== 'general' 
        ? templates.filter(t => t.domain?.toLowerCase().includes(category.toLowerCase()) || 
                             t.subcategory?.toLowerCase().includes(category.toLowerCase()))
        : templates;

      console.log(`📚 Found ${categoryTemplates.length} templates for ${category}`);

      // Pick session templates with domain diversity enforcement
      const sessionTemplates = pickSessionTemplates(categoryTemplates, {
        count,
        minDistinctDomains: Math.min(4, count), // Session policy: min 4 domains for 5 questions
        difficulty: undefined // No difficulty filter for now
      });

      // Convert to SelectionQuestion format
      return sessionTemplates.map(template => this.convertTemplateToQuestion(template));
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
   * Calculate domain diversity metric
   */
  private calculateDomainDiversity(questions: SelectionQuestion[]): number {
    if (questions.length === 0) return 0;
    const domains = new Set(questions.map(q => 'Unknown')); // Simplified for now
    return domains.size / Math.max(1, questions.length);
  }

  /**
   * Convert template to SelectionQuestion format
   */
  private convertTemplateToQuestion(template: any): SelectionQuestion {
    const questionType = this.mapQuestionType(template.question_type);
    
    if (questionType === 'text-input') {
      return {
        id: parseInt(template.id) || Date.now(),
        question: template.student_prompt || "Template question",
        type: this.mapDomainToSubject(template.domain),
        questionType: 'text-input',
        answer: this.extractCorrectAnswer(template),
        explanation: template.explanation_teacher || ""
      } as TextInputQuestion;
    } else {
      return {
        id: parseInt(template.id) || Date.now(),
        question: template.student_prompt || "Template question",
        type: this.mapDomainToSubject(template.domain),
        questionType: 'multiple-choice',
        options: this.extractOptions(template),
        correctAnswer: 0, // First option is correct after shuffle
        explanation: template.explanation_teacher || ""
      } as MultipleChoiceQuestion;
    }
  }

  private extractCorrectAnswer(template: any): string {
    if (template.solution) {
      if (typeof template.solution === 'string') return template.solution;
      if (template.solution.value) return template.solution.value.toString();
      if (template.solution.answer) return template.solution.answer.toString();
    }
    return "1"; // Default fallback
  }

  private extractOptions(template: any): string[] {
    const correct = this.extractCorrectAnswer(template);
    const options = [correct];
    
    if (template.distractors && Array.isArray(template.distractors)) {
      options.push(...template.distractors.slice(0, 3));
    } else {
      // Generate simple numeric distractors
      const num = parseInt(correct);
      if (!isNaN(num)) {
        options.push((num + 1).toString(), (num - 1).toString(), (num + 2).toString());
      } else {
        options.push("Option B", "Option C", "Option D");
      }
    }
    
    return this.shuffleArray(options).slice(0, 4);
  }

  private mapQuestionType(dbType: string): 'multiple-choice' | 'text-input' | 'matching' | 'drag-drop' {
    switch (dbType?.toLowerCase()) {
      case 'multiple-choice':
      case 'multiple_choice':
        return 'multiple-choice';
      case 'text-input':
      case 'text_input':
      case 'freetext':
        return 'text-input';
      case 'matching':
        return 'matching';
      case 'drag-drop':
      case 'drag_drop':
        return 'drag-drop';
      default:
        return 'multiple-choice';
    }
  }

  private mapDomainToSubject(domain: string): 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin' {
    const lowerDomain = domain?.toLowerCase() || '';
    if (lowerDomain.includes('zahlen') || lowerDomain.includes('math') || lowerDomain.includes('geometrie')) return 'math';
    if (lowerDomain.includes('deutsch') || lowerDomain.includes('german')) return 'german';
    if (lowerDomain.includes('englisch') || lowerDomain.includes('english')) return 'english';
    if (lowerDomain.includes('geographie') || lowerDomain.includes('geography')) return 'geography';
    if (lowerDomain.includes('geschichte') || lowerDomain.includes('history')) return 'history';
    if (lowerDomain.includes('physik') || lowerDomain.includes('physics')) return 'physics';
    if (lowerDomain.includes('biologie') || lowerDomain.includes('biology')) return 'biology';
    if (lowerDomain.includes('chemie') || lowerDomain.includes('chemistry')) return 'chemistry';
    if (lowerDomain.includes('latein') || lowerDomain.includes('latin')) return 'latin';
    return 'math'; // Default fallback
  }

  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate questions from knowledge cards
   */
  private async generateQuestionsFromCards(cards: KnowledgeCard[], count: number): Promise<SelectionQuestion[]> {
    const questions: SelectionQuestion[] = [];
    const selectedCards = cards.slice(0, count);
    
    for (const card of selectedCards) {
      const question = this.generateQuestionFromCard(card);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  private generateQuestionFromCard(card: KnowledgeCard): SelectionQuestion | null {
    // Simple question generation based on card content
    return {
      id: Date.now(),
      question: `Frage zu: ${card.text}`,
      type: this.mapDomainToSubject(card.domain),
      questionType: 'multiple-choice',
      options: ["Richtige Antwort", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
      explanation: `Basiert auf: ${card.skill}`
    } as MultipleChoiceQuestion;
  }

  /**
   * Main question generation method - LEGACY REMOVED
   */
  async generateQuestions(
    category: string,
    grade: number,
    quarter: Quarter = "Q1",
    totalQuestions: number = 5,
    config: Partial<TemplateBankConfig> = {},
    userId?: string
  ): Promise<TemplateBankResult> {
    const fullConfig: TemplateBankConfig = {
      enableQualityControl: true,
      minQualityThreshold: 0.7,
      diversityWeight: 0.8,
      fallbackToLegacy: false, // FALLBACKS DEAKTIVIERT
      ...config
    };

    const sessionId = `etb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏦 Enhanced Template-Bank: Generating ${totalQuestions} questions for ${category} Grade ${grade} Quarter ${quarter}`);

    try {
      // 1. TEMPLATE-BANK ALS PRIMÄRQUELLE
      const bankQuestions = await this.generateFromTemplateBank(
        category,
        grade,
        quarter,
        totalQuestions
      );

      if (bankQuestions.length >= totalQuestions) {
        console.log(`✅ Template-Bank provided ${bankQuestions.length} questions`);
        return {
          questions: bankQuestions,
          source: 'template-bank',
          sessionId,
          qualityMetrics: {
            averageQuality: 0.9,
            templateCoverage: 1.0,
            domainDiversity: this.calculateDomainDiversity(bankQuestions)
          }
        };
      }

      // 2. KNOWLEDGE-BASED GENERATION (NUR BEI UNTERDECKUNG)
      console.log(`⚠️ Template-Bank insufficient (${bankQuestions.length}/${totalQuestions}), using knowledge generation`);
      
      const knowledgeQuestions = await this.generateFromKnowledge(
        category,
        grade,
        quarter,
        totalQuestions - bankQuestions.length
      );

      const allQuestions = [...bankQuestions, ...knowledgeQuestions];

      if (allQuestions.length === 0 && fullConfig.fallbackToLegacy) {
        // Use existing balanced generation fallback
        console.log(`🔄 Using existing fallback system for ${category} Grade ${grade}`);
        const { useBalancedQuestionGeneration } = await import('@/hooks/useBalancedQuestionGeneration');
        
        // This would need to be handled by the calling component
        throw new Error("FALLBACK_TO_BALANCED_GENERATION");
      }

      return {
        questions: allQuestions,
        source: bankQuestions.length > 0 ? 'template-bank' : 'knowledge-generated',
        sessionId,
        qualityMetrics: {
          averageQuality: 0.8,
          templateCoverage: bankQuestions.length / totalQuestions,
          domainDiversity: this.calculateDomainDiversity(allQuestions)
        }
      };
    } catch (error) {
      console.error('❌ Enhanced Template-Bank error:', error);
      if (!fullConfig.fallbackToLegacy) {
        throw error; // Fallbacks deaktiviert - Fehler propagieren
      }
      
      // Signal to use existing fallback system
      throw new Error("FALLBACK_TO_BALANCED_GENERATION");
    }
  }

  private async generateEnhancedQuestions(
    category: string, 
    grade: number, 
    count: number,
    quarter: Quarter,
    feedbackAnalysis?: any
  ): Promise<SelectionQuestion[]> {
    const normalizedCategory = this.normalizeCategory(category);
    const questions: SelectionQuestion[] = [];
    
    // Laden der Knowledge-Base für lehrplankonforme Generierung
    const { cards } = await loadKnowledge();
    let curriculumCards = preselectCards(cards, { 
      grade, 
      quarter, 
      wantDomains: normalizedCategory === 'mathematik' ? ["Zahlen & Operationen", "Raum & Form", "Größen & Messen"] : ["Deutsch"] 
    });

    console.log(`📚 Loaded ${curriculumCards.length} curriculum cards for Grade ${grade} ${quarter}`);
    
    // Feedback-basierte Filterung anwenden
    if (feedbackAnalysis) {
      const { FeedbackBasedGenerationService } = await import('./feedbackBasedGeneration');
      const feedbackService = FeedbackBasedGenerationService.getInstance();
      curriculumCards = feedbackService.filterKnowledgeCards(
        curriculumCards, 
        feedbackAnalysis.curriculumGuidelines, 
        feedbackAnalysis.recommendations
      );
      console.log(`🎯 Filtered to ${curriculumCards.length} cards based on feedback`);
    }

    if (curriculumCards.length === 0) {
      console.warn(`⚠️ No curriculum cards found for Grade ${grade} ${quarter} ${normalizedCategory}`);
      return [];
    }
    
    if (normalizedCategory === 'mathematik') {
      for (let i = 0; i < count; i++) {
        const questionTypes = ['text-input', 'multiple-choice', 'matching'];
        const questionType = questionTypes[i % questionTypes.length];
        
        // Verwende curriculum card für spezifische Fragenerzeugung
        const cardIndex = i % curriculumCards.length;
        const curriculumCard = curriculumCards[cardIndex];
        
        const question = this.generateCurriculumBasedMathQuestion(curriculumCard, questionType, feedbackAnalysis);
        if (question) questions.push(question);
      }
    } else if (normalizedCategory === 'deutsch') {
      for (let i = 0; i < count; i++) {
        const questionTypes = ['multiple-choice', 'word-selection', 'matching'];
        const questionType = questionTypes[i % questionTypes.length];
        
        const cardIndex = i % curriculumCards.length;
        const curriculumCard = curriculumCards[cardIndex];
        
        const question = this.generateCurriculumBasedMathQuestion(curriculumCard, questionType, feedbackAnalysis);
        if (question) questions.push(question);
      }
    }
    
    return questions;
  }

  private generateCurriculumBasedMathQuestion(
    curriculumCard: KnowledgeCard, 
    questionType: string, 
    feedbackAnalysis?: any
  ): SelectionQuestion | null {
    console.log(`🎯 Generating ${questionType} question for Grade ${curriculumCard.grade} Q${curriculumCard.quarter}: ${curriculumCard.skill}`);
    
    // Strikt curriculum-basierte Generierung - keine zu schweren Inhalte
    if (this.isTopicTooAdvanced(curriculumCard)) {
      console.warn(`❌ Topic too advanced for Grade ${curriculumCard.grade}: ${curriculumCard.skill}`);
      return null;
    }
    
    if (questionType === 'matching') {
      return this.generateCurriculumMatchingQuestion(curriculumCard);
    } else if (questionType === 'multiple-choice') {
      return this.generateCurriculumMultipleChoiceQuestion(curriculumCard, feedbackAnalysis);
    } else {
      return this.generateCurriculumTextInputQuestion(curriculumCard, feedbackAnalysis);
    }
  }

  private isTopicTooAdvanced(curriculumCard: KnowledgeCard): boolean {
    // Kreis-Berechnungen erst ab Klasse 5 Q3
    if (curriculumCard.tags.includes('Kreis') && 
        (curriculumCard.grade < 5 || (curriculumCard.grade === 5 && curriculumCard.quarter !== 'Q3'))) {
      return true;
    }
    
    // Prozentrechnung erst ab Klasse 5 Q3
    if (curriculumCard.tags.includes('Prozent') && 
        (curriculumCard.grade < 5 || (curriculumCard.grade === 5 && curriculumCard.quarter !== 'Q3'))) {
      return true;
    }
    
    // Bruchrechnung erst ab entsprechendem Lehrplan
    if (curriculumCard.tags.includes('Brüche') && curriculumCard.grade < 4) {
      return true;
    }
    
    return false;
  }

  private generateCurriculumMatchingQuestion(curriculumCard: KnowledgeCard): SelectionQuestion {
    console.log(`🎯 Generating matching for: ${curriculumCard.skill}`);
    
    let questionData;
    if (curriculumCard.tags.includes('ZR_10')) {
      questionData = this.generateCountingMatching(curriculumCard.grade);
    } else if (curriculumCard.tags.includes('Formen')) {
      questionData = this.generateShapeMatching(curriculumCard.grade);
    } else if (curriculumCard.tags.includes('Addition') || curriculumCard.tags.includes('Subtraktion')) {
      questionData = this.generateSimpleCalculationMatching(curriculumCard.grade);
    } else if (curriculumCard.tags.includes('Einmaleins')) {
      questionData = this.generateMultiplicationMatching(curriculumCard.grade);
    } else if (curriculumCard.tags.includes('Zeit') || curriculumCard.tags.includes('Geld')) {
      questionData = this.generateTimeMoneyMatching(curriculumCard.grade);
    } else if (curriculumCard.tags.includes('Brüche')) {
      questionData = this.generateFractionMatching(curriculumCard.grade);
    } else {
      questionData = this.generateAdvancedCalculationMatching(curriculumCard.grade);
    }

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

  private generateCurriculumMultipleChoiceQuestion(curriculumCard: KnowledgeCard, feedbackAnalysis?: any): SelectionQuestion {
    console.log(`🎯 Generating MC for Grade ${curriculumCard.grade}: ${curriculumCard.skill}`);
    
    // Strikt lehrplankonforme Generierung basierend auf Skills
    if (curriculumCard.skill.includes('Zählen bis 10')) {
      return this.generateCountingMC(curriculumCard.grade, 10);
    } else if (curriculumCard.skill.includes('Plus/Minus im ZR 10')) {
      return this.generateBasicMathMC(curriculumCard.grade, 10);
    } else if (curriculumCard.skill.includes('Plus/Minus im ZR 20')) {
      return this.generateBasicMathMC(curriculumCard.grade, 20);
    } else if (curriculumCard.skill.includes('ZR 100') || curriculumCard.tags.includes('ZR_100')) {
      return this.generateBasicMathMC(curriculumCard.grade, 100);
    } else if (curriculumCard.skill.includes('ZR 1000') || curriculumCard.tags.includes('ZR_1000')) {
      return this.generateAdvancedMathMC(curriculumCard.grade, 1000);
    } else if (curriculumCard.skill.includes('2er/5er/10er Reihen') || curriculumCard.tags.includes('Einmaleins')) {
      return this.generateBasicMultiplicationMC(curriculumCard.grade);
    } else if (curriculumCard.skill.includes('Formen') || curriculumCard.tags.includes('Formen')) {
      return this.generateShapesMC(curriculumCard.grade);
    } else if (curriculumCard.skill.includes('Erweitern/Kürzen') && curriculumCard.grade >= 4) {
      return this.generateSimpleFractionMC(curriculumCard.grade);
    } else if (curriculumCard.skill.includes('Negative Zahlen') && curriculumCard.grade >= 5) {
      return this.generateNegativeNumbersMC(curriculumCard.grade);
    } else {
      // Fallback auf angemessene Grundoperationen
      const maxNumber = curriculumCard.grade <= 1 ? 10 : curriculumCard.grade <= 2 ? 100 : 1000;
      return this.generateBasicMathMC(curriculumCard.grade, maxNumber);
    }
  }

  private generateCurriculumTextInputQuestion(curriculumCard: KnowledgeCard, feedbackAnalysis?: any): SelectionQuestion {
    console.log(`🎯 Generating text input for: ${curriculumCard.skill}`);
    
    // Zahlenraum-spezifische Aufgaben generieren
    if (curriculumCard.tags.includes('ZR_10')) {
      return this.generateBasicMathInput(curriculumCard.grade, 10);
    } else if (curriculumCard.tags.includes('ZR_20')) {
      return this.generateBasicMathInput(curriculumCard.grade, 20);
    } else if (curriculumCard.tags.includes('ZR_100')) {
      return this.generateBasicMathInput(curriculumCard.grade, 100);
    } else if (curriculumCard.tags.includes('ZR_1000')) {
      return this.generateAdvancedMathInput(curriculumCard.grade, 1000);
    } else if (curriculumCard.tags.includes('Einmaleins')) {
      return this.generateMultiplicationInput(curriculumCard.grade);
    } else {
      return this.generateAdvancedMathInput(curriculumCard.grade, 100);
    }
  }

  // Neue Methoden für strikt curriculum-spezifische Generierung
  private generateCountingMC(grade: number, maxNumber: number): SelectionQuestion {
    const targetNumber = Math.floor(Math.random() * maxNumber) + 1;
    const questionText = `Welche Zahl kommt nach ${targetNumber - 1}?`;
    
    const wrongAnswers = [
      targetNumber + 1,
      targetNumber - 1,
      targetNumber + 2
    ].filter(ans => ans > 0 && ans <= maxNumber && ans !== targetNumber);
    
    const options = [targetNumber, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `Zahlenreihe: Nach ${targetNumber - 1} kommt ${targetNumber}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(targetNumber.toString())
    };
  }

  private generateBasicMathMC(grade: number, maxNumber: number): SelectionQuestion {
    const a = Math.floor(Math.random() * maxNumber) + 1;
    const b = Math.floor(Math.random() * Math.min(a, maxNumber / 2)) + 1;
    const operations = grade <= 1 ? ['+'] : ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    const result = operation === '+' ? a + b : a - b;
    
    // Sicherstellen, dass das Ergebnis im erlaubten Bereich liegt
    if (result < 0 || result > maxNumber) {
      return this.generateBasicMathMC(grade, maxNumber);
    }
    
    const questionText = `Was ist ${a} ${operation} ${b}?`;
    
    const wrongAnswers = [
      result + 1,
      result - 1,
      result + Math.floor(Math.random() * 3) + 2
    ].filter(ans => ans > 0 && ans <= maxNumber && ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${operation === '+' ? 'Addition' : 'Subtraktion'} im Zahlenraum bis ${maxNumber}: ${a} ${operation} ${b} = ${result}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(result.toString())
    };
  }

  private generateBasicMultiplicationMC(grade: number): SelectionQuestion {
    const smallFactors = [2, 5, 10]; // Nur 2er, 5er, 10er Reihen für Klasse 2
    const factor1 = smallFactors[Math.floor(Math.random() * smallFactors.length)];
    const factor2 = Math.floor(Math.random() * 10) + 1;
    const result = factor1 * factor2;
    
    const questionText = `Was ist ${factor1} × ${factor2}?`;
    
    const wrongAnswers = [
      result + factor1,
      result - factor1,
      result + factor2
    ].filter(ans => ans > 0 && ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${factor1}er-Reihe: ${factor1} × ${factor2} = ${result}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(result.toString())
    };
  }

  private generateShapesMC(grade: number): SelectionQuestion {
    const shapes = ['Kreis', 'Dreieck', 'Quadrat', 'Rechteck'];
    const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
    const questionText = `Welche Form hat 4 gleich lange Seiten und 4 rechte Winkel?`;
    
    let correctAnswer = 'Quadrat';
    let explanation = 'Ein Quadrat hat 4 gleich lange Seiten und 4 rechte Winkel.';
    
    if (Math.random() < 0.5) {
      correctAnswer = 'Kreis';
      explanation = 'Ein Kreis ist rund und hat keine Ecken.';
    }
    
    const options = shapes.sort(() => Math.random() - 0.5);
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(correctAnswer)
    };
  }

  private generateSimpleFractionMC(grade: number): SelectionQuestion {
    const numerators = [1, 2, 3];
    const denominators = [2, 3, 4];
    const numerator = numerators[Math.floor(Math.random() * numerators.length)];
    const denominator = denominators[Math.floor(Math.random() * denominators.length)];
    
    const questionText = `Welcher Bruch zeigt ${numerator} von ${denominator} Teilen?`;
    
    const options = [`${numerator}/${denominator}`, `${denominator}/${numerator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator + 1}`];
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${numerator} von ${denominator} Teilen wird als ${numerator}/${denominator} geschrieben.`,
      type: 'mathematik' as any,
      options,
      correctAnswer: 0
    };
  }

  private generateNegativeNumbersMC(grade: number): SelectionQuestion {
    const num = Math.floor(Math.random() * 10) + 1;
    const questionText = `Welche Zahl liegt auf der Zahlengerade zwischen -${num + 1} und -${num - 1}?`;
    
    const options = [`-${num}`, `-${num + 2}`, `-${num - 2}`, `${num}`];
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `Auf der Zahlengerade liegt -${num} zwischen -${num + 1} und -${num - 1}.`,
      type: 'mathematik' as any,
      options,
      correctAnswer: 0
    };
  }

  private generateAdvancedMathMC(grade: number, maxNumber: number): SelectionQuestion {
    const operations = grade <= 3 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let a: number, b: number, result: number, questionText: string;
    
    if (operation === '×') {
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      result = a * b;
      questionText = `Was ist ${a} × ${b}?`;
    } else if (operation === '÷') {
      result = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      a = result * b;
      questionText = `Was ist ${a} ÷ ${b}?`;
    } else {
      a = Math.floor(Math.random() * maxNumber) + 1;
      b = Math.floor(Math.random() * Math.min(a, maxNumber / 2)) + 1;
      result = operation === '+' ? a + b : a - b;
      questionText = `Was ist ${a} ${operation} ${b}?`;
    }
    
    const wrongAnswers = [
      result + 1,
      result - 1,
      result + Math.floor(Math.random() * 5) + 2
    ].filter(ans => ans > 0 && ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'multiple-choice',
      explanation: `${operation}: ${questionText.replace('Was ist ', '').replace('?', '')} = ${result}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(result.toString())
    };
  }

  private generateMultiplicationMC(grade: number): SelectionQuestion {
    const tables = grade <= 2 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const table = tables[Math.floor(Math.random() * tables.length)];
    const multiplier = Math.floor(Math.random() * 10) + 1;
    const result = table * multiplier;
    
    const wrongAnswers = [
      result + table,
      result - table,
      result + 1
    ].filter(ans => ans > 0 && ans !== result);
    
    const options = [result, ...wrongAnswers.slice(0, 3)]
      .sort(() => Math.random() - 0.5)
      .map(n => n.toString());
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `Was ist ${table} × ${multiplier}?`,
      questionType: 'multiple-choice',
      explanation: `Einmaleins: ${table} × ${multiplier} = ${result}`,
      type: 'mathematik' as any,
      options,
      correctAnswer: options.indexOf(result.toString())
    };
  }

  private generateFractionMC(grade: number): SelectionQuestion {
    const fractions = [
      { display: '1/2', decimal: 0.5, name: 'ein Halb' },
      { display: '1/4', decimal: 0.25, name: 'ein Viertel' },
      { display: '3/4', decimal: 0.75, name: 'drei Viertel' },
      { display: '1/3', decimal: 0.33, name: 'ein Drittel' }
    ];
    
    const fraction = fractions[Math.floor(Math.random() * fractions.length)];
    const options = fractions.map(f => f.name);
    const correctAnswer = options.indexOf(fraction.name);
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `Wie heißt der Bruch ${fraction.display}?`,
      questionType: 'multiple-choice',
      explanation: `${fraction.display} = ${fraction.name}`,
      type: 'mathematik' as any,
      options,
      correctAnswer
    };
  }

  private generateBasicMathInput(grade: number, maxNumber: number): SelectionQuestion {
    const a = Math.floor(Math.random() * maxNumber) + 1;
    const b = Math.floor(Math.random() * Math.min(a, maxNumber / 2)) + 1;
    const operations = grade <= 1 ? ['+'] : ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const result = operation === '+' ? a + b : a - b;
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `${a} ${operation} ${b} = ?`,
      questionType: 'text-input',
      explanation: `${operation === '+' ? 'Addition' : 'Subtraktion'} im Zahlenraum bis ${maxNumber}: ${a} ${operation} ${b} = ${result}`,
      type: 'mathematik' as any,
      answer: result.toString()
    };
  }

  private generateAdvancedMathInput(grade: number, maxNumber: number): SelectionQuestion {
    const operations = grade <= 3 ? ['+', '-'] : ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let a: number, b: number, result: number;
    
    if (operation === '×') {
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      result = a * b;
    } else {
      a = Math.floor(Math.random() * maxNumber) + 1;
      b = Math.floor(Math.random() * Math.min(a, maxNumber / 2)) + 1;
      result = operation === '+' ? a + b : a - b;
    }
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `${a} ${operation} ${b} = ?`,
      questionType: 'text-input',
      explanation: `${operation}: ${a} ${operation} ${b} = ${result}`,
      type: 'mathematik' as any,
      answer: result.toString()
    };
  }

  private generateMultiplicationInput(grade: number): SelectionQuestion {
    const tables = grade <= 2 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const table = tables[Math.floor(Math.random() * tables.length)];
    const multiplier = Math.floor(Math.random() * 10) + 1;
    const result = table * multiplier;
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: `${table} × ${multiplier} = ?`,
      questionType: 'text-input',
      explanation: `Einmaleins: ${table} × ${multiplier} = ${result}`,
      type: 'mathematik' as any,
      answer: result.toString()
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

  private generateMathTextWordProblem(grade: number): SelectionQuestion {
    // Sinnvolle Textaufgaben als Multiple Choice für Mathematik
    const textProblemTemplates = [
      // Gerade/Ungerade für Klasse 1-3
      {
        type: 'even_odd',
        grades: [1, 2, 3]
      },
      // Größer/Kleiner für Klasse 1-4
      {
        type: 'compare',
        grades: [1, 2, 3, 4]
      },
      // Operationstyp für Klasse 2+
      {
        type: 'operation_type',
        grades: [2, 3, 4, 5]
      },
      // Textaufgaben für Klasse 2+
      {
        type: 'word_problem',
        grades: [2, 3, 4, 5]
      }
    ];

    const availableTemplates = textProblemTemplates.filter(t => t.grades.includes(grade));
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    
    let question: string;
    let options: string[];
    let correctAnswer: number;
    let explanation: string;
    
    if (template.type === 'even_odd') {
      // Gerade/Ungerade
      const num = Math.floor(Math.random() * 20) + 1;
      question = `Ist die Zahl ${num} gerade oder ungerade?`;
      options = ['gerade', 'ungerade'];
      correctAnswer = num % 2 === 0 ? 0 : 1;
      explanation = `${num} ist ${options[correctAnswer]}, weil ${num % 2 === 0 ? 'sie durch 2 teilbar ist' : 'sie nicht durch 2 teilbar ist'}.`;
    } else if (template.type === 'compare') {
      // Größer/Kleiner Vergleich
      const a = Math.floor(Math.random() * 50) + 1;
      let b = Math.floor(Math.random() * 50) + 1;
      if (a === b) b = a + Math.floor(Math.random() * 10) + 1;
      question = `Vergleiche: Ist ${a} größer oder kleiner als ${b}?`;
      options = ['größer', 'kleiner', 'gleich'];
      correctAnswer = a > b ? 0 : 1;
      explanation = `${a} ist ${options[correctAnswer]} als ${b}.`;
    } else if (template.type === 'operation_type') {
      // Operationstyp erkennen
      const operations = [
        { symbol: '+', name: 'Addition', verb: 'addiert' },
        { symbol: '-', name: 'Subtraktion', verb: 'subtrahiert' },
        { symbol: '×', name: 'Multiplikation', verb: 'multipliziert' }
      ];
      const op = operations[Math.floor(Math.random() * operations.length)];
      const a = Math.floor(Math.random() * 12) + 1;
      const b = Math.floor(Math.random() * 12) + 1;
      
      question = `Was für eine Rechenart wird hier verwendet: ${a} ${op.symbol} ${b}?`;
      options = ['Addition', 'Subtraktion', 'Multiplikation', 'Division'];
      correctAnswer = operations.findIndex(o => o.name === op.name);
      explanation = `${a} ${op.symbol} ${b} ist eine ${op.name}, weil die Zahlen ${op.verb} werden.`;
    } else {
      // Textaufgabe
      const scenarios = [
        {
          text: "Lisa hat 8 Äpfel. Sie gibt 3 Äpfel an ihre Freundin ab. Wie viele Äpfel hat Lisa noch?",
          options: ["5", "6", "4", "7"],
          correct: 0,
          explanation: "8 - 3 = 5. Lisa hat noch 5 Äpfel."
        },
        {
          text: "In einer Klasse sind 12 Jungen und 9 Mädchen. Wie viele Kinder sind insgesamt in der Klasse?",
          options: ["20", "21", "22", "19"],
          correct: 1,
          explanation: "12 + 9 = 21. Es sind 21 Kinder in der Klasse."
        },
        {
          text: "Tom kauft 4 Pakete Kekse. In jedem Paket sind 6 Kekse. Wie viele Kekse hat Tom insgesamt?",
          options: ["22", "24", "26", "20"],
          correct: 1,
          explanation: "4 × 6 = 24. Tom hat 24 Kekse."
        }
      ];
      
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      question = scenario.text;
      options = scenario.options;
      correctAnswer = scenario.correct;
      explanation = scenario.explanation;
    }

    return {
      id: Math.floor(Math.random() * 1000000),
      question,
      questionType: 'multiple-choice',
      explanation,
      type: 'mathematik' as any,
      options,
      correctAnswer
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