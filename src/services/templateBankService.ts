// Template-Bank Service - Central interface to the new knowledge-based template system
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

export class TemplateBankService {
  private static instance: TemplateBankService;
  private cache = new Map<string, TemplateBankResult>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): TemplateBankService {
    if (!TemplateBankService.instance) {
      TemplateBankService.instance = new TemplateBankService();
    }
    return TemplateBankService.instance;
  }

  /**
   * Main method to generate questions using the Template-Bank system
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

    const sessionId = `tb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏦 Template-Bank: Generating ${totalQuestions} questions for ${category} Grade ${grade}`);

    try {
      // Phase 1: Try Template-Bank
      const bankResult = await this.generateFromTemplateBank(
        category, grade, quarter, totalQuestions, fullConfig, sessionId
      );
      
      if (bankResult.questions.length >= totalQuestions) {
        console.log(`✅ Template-Bank: Generated ${bankResult.questions.length} questions from template bank`);
        return bankResult;
      }

      // Phase 2: Generate using Knowledge system
      const knowledgeResult = await this.generateFromKnowledge(
        category, grade, quarter, totalQuestions - bankResult.questions.length, fullConfig, sessionId
      );

      const combinedQuestions = [...bankResult.questions, ...knowledgeResult.questions];

      if (combinedQuestions.length >= totalQuestions) {
        console.log(`✅ Template-Bank: Combined generation successful (${combinedQuestions.length} questions)`);
        return {
          questions: combinedQuestions.slice(0, totalQuestions),
          source: 'knowledge-generated',
          sessionId,
          qualityMetrics: {
            averageQuality: (bankResult.qualityMetrics.averageQuality + knowledgeResult.qualityMetrics.averageQuality) / 2,
            templateCoverage: bankResult.qualityMetrics.templateCoverage,
            domainDiversity: Math.max(bankResult.qualityMetrics.domainDiversity, knowledgeResult.qualityMetrics.domainDiversity)
          }
        };
      }

      // Phase 3: Fallback to legacy if enabled
      if (fullConfig.fallbackToLegacy) {
        console.log(`⚠️ Template-Bank: Falling back to legacy system`);
        const legacyResult = await this.generateLegacyFallback(category, grade, totalQuestions, sessionId);
        return {
          ...legacyResult,
          questions: [...combinedQuestions, ...legacyResult.questions].slice(0, totalQuestions)
        };
      }

      throw new Error(`Insufficient questions generated: ${combinedQuestions.length}/${totalQuestions}`);

    } catch (error) {
      console.error('❌ Template-Bank generation failed:', error);
      return {
        questions: [],
        source: 'template-bank',
        sessionId,
        qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate questions from existing Template-Bank
   */
  private async generateFromTemplateBank(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number,
    config: TemplateBankConfig,
    sessionId: string
  ): Promise<TemplateBankResult> {
    try {
      console.log(`📚 Fetching from Template-Bank: ${category}, Grade ${grade}, Quarter ${quarter}`);
      
      // Fetch active templates
      const templates = await fetchActiveTemplates({ grade, quarter, limit: count * 3 });
      
      if (templates.length === 0) {
        console.log(`📭 No templates found in Template-Bank`);
        return {
          questions: [],
          source: 'template-bank',
          sessionId,
          qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 }
        };
      }

      // Filter by category and quality
      const categoryTemplates = templates.filter(t => 
        this.normalizeCategory(t.domain) === this.normalizeCategory(category) &&
        (!config.enableQualityControl || (t.qscore || 0) >= config.minQualityThreshold)
      );

      console.log(`🔍 Filtered templates: ${categoryTemplates.length}/${templates.length}`);

      // Pick session templates with diversity
      const selectedTemplates = pickSessionTemplates(categoryTemplates, {
        count,
        minDistinctDomains: 2,
        difficulty: config.preferredDifficulty
      });

      // Convert templates to questions
      const questions = await this.convertTemplatesToQuestions(selectedTemplates, category);

      const qualityScores = selectedTemplates.map(t => t.qscore || 0.7);
      const averageQuality = qualityScores.length > 0 ? 
        qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

      const uniqueDomains = new Set(selectedTemplates.map(t => t.domain)).size;
      const domainDiversity = selectedTemplates.length > 0 ? uniqueDomains / selectedTemplates.length : 0;

      return {
        questions,
        source: 'template-bank',
        sessionId,
        qualityMetrics: {
          averageQuality,
          templateCoverage: selectedTemplates.length / Math.max(1, categoryTemplates.length),
          domainDiversity
        }
      };

    } catch (error) {
      console.error('❌ Template-Bank fetch failed:', error);
      return {
        questions: [],
        source: 'template-bank',
        sessionId,
        qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 },
        error: error instanceof Error ? error.message : 'Template-Bank error'
      };
    }
  }

  /**
   * Generate questions using Knowledge system
   */
  private async generateFromKnowledge(
    category: string,
    grade: number,
    quarter: Quarter,
    count: number,
    config: TemplateBankConfig,
    sessionId: string
  ): Promise<TemplateBankResult> {
    try {
      console.log(`🧠 Generating from Knowledge system: ${count} questions`);

      const { cards, blueprints } = await loadKnowledge();
      
      // Preselect relevant knowledge cards
      const relevantCards = preselectCards(cards, {
        grade,
        quarter,
        wantDomains: [category]
      });

      if (relevantCards.length === 0) {
        console.log(`📭 No relevant knowledge cards found`);
        return {
          questions: [],
          source: 'knowledge-generated',
          sessionId,
          qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 }
        };
      }

      // Find appropriate blueprint
      const blueprint = blueprints.find(bp => 
        this.normalizeCategory(bp.domain) === this.normalizeCategory(category)
      ) || blueprints[0];

      if (!blueprint) {
        throw new Error('No blueprint found for category');
      }

      // For now, generate simple questions based on knowledge
      // TODO: Integrate with LLM when available
      const questions = this.generateKnowledgeBasedQuestions(relevantCards, category, count);

      return {
        questions,
        source: 'knowledge-generated',
        sessionId,
        qualityMetrics: {
          averageQuality: 0.8, // Simulated quality
          templateCoverage: relevantCards.length / Math.max(1, cards.length),
          domainDiversity: 1.0 // Knowledge-based has high diversity
        }
      };

    } catch (error) {
      console.error('❌ Knowledge generation failed:', error);
      return {
        questions: [],
        source: 'knowledge-generated',
        sessionId,
        qualityMetrics: { averageQuality: 0, templateCoverage: 0, domainDiversity: 0 },
        error: error instanceof Error ? error.message : 'Knowledge generation error'
      };
    }
  }

  /**
   * Legacy fallback generation
   */
  private async generateLegacyFallback(
    category: string,
    grade: number,
    count: number,
    sessionId: string
  ): Promise<TemplateBankResult> {
    console.log(`🔄 Legacy fallback: generating ${count} simple questions`);

    // Generate simple questions as fallback
    const questions: SelectionQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const question = this.generateSimpleQuestion(category, grade, i);
      if (question) questions.push(question);
    }

    return {
      questions,
      source: 'legacy-fallback',
      sessionId,
      qualityMetrics: {
        averageQuality: 0.6,
        templateCoverage: 0,
        domainDiversity: 0.3
      }
    };
  }

  /**
   * Helper methods
   */
  private normalizeCategory(category: string): string {
    const normalized = category.toLowerCase().trim();
    const mappings: Record<string, string> = {
      'math': 'mathematik',
      'mathematics': 'mathematik',
      'zahlen & operationen': 'mathematik',
      'german': 'deutsch',
      'deutsche sprache': 'deutsch'
    };
    return mappings[normalized] || normalized;
  }

  private async convertTemplatesToQuestions(templates: any[], category: string): Promise<SelectionQuestion[]> {
    const questions: SelectionQuestion[] = [];

    for (const template of templates) {
      try {
        const questionType = this.mapQuestionType(template.question_type);
        
        // Create base question properties
        const baseProps = {
          id: Math.floor(Math.random() * 1000000),
          question: template.student_prompt || `Frage für ${category}`,
          questionType,
          explanation: template.explanation_teacher || 'Automatisch generierte Erklärung',
          type: category as any
        };

        // Create type-specific question with all required properties
        let question: SelectionQuestion;

        if (questionType === 'text-input') {
          question = {
            ...baseProps,
            questionType: 'text-input',
            answer: template.solution || 'Antwort'
          };
        } else if (questionType === 'multiple-choice') {
          question = {
            ...baseProps,
            questionType: 'multiple-choice',
            options: template.distractors || ['Option A', 'Option B', 'Option C'],
            correctAnswer: 0
          };
        } else if (questionType === 'matching') {
          question = {
            ...baseProps,
            questionType: 'matching',
            items: template.items || ['Item 1', 'Item 2'],
            categories: template.categories || ['Category A', 'Category B']
          };
        } else if (questionType === 'word-selection') {
          question = {
            ...baseProps,
            questionType: 'word-selection',
            sentence: template.sentence || 'Wähle die richtigen Wörter aus.',
            selectableWords: template.selectableWords || [
              { word: 'Wort1', isCorrect: true, index: 0 },
              { word: 'Wort2', isCorrect: false, index: 1 }
            ]
          };
        } else if (questionType === 'drag-drop') {
          question = {
            ...baseProps,
            questionType: 'drag-drop',
            items: template.items || [
              { id: '1', content: 'Item 1', category: 'cat1' },
              { id: '2', content: 'Item 2', category: 'cat2' }
            ],
            categories: template.categories || [
              { id: 'cat1', name: 'Category A', acceptsItems: ['1'] },
              { id: 'cat2', name: 'Category B', acceptsItems: ['2'] }
            ]
          };
        } else {
          // Default to text-input
          question = {
            ...baseProps,
            questionType: 'text-input',
            answer: template.solution || 'Antwort'
          };
        }

        questions.push(question);
      } catch (error) {
        console.warn(`Failed to convert template ${template.id}:`, error);
      }
    }

    return questions;
  }

  private mapQuestionType(templateType: string): "text-input" | "multiple-choice" | "word-selection" | "drag-drop" | "matching" {
    const typeMap: Record<string, any> = {
      'Freitext': 'text-input',
      'MultipleChoice': 'multiple-choice',
      'Lückentext': 'text-input',
      'Zuordnung': 'matching',
      'Diagramm': 'text-input'
    };
    return typeMap[templateType] || 'text-input';
  }

  private generateKnowledgeBasedQuestions(cards: any[], category: string, count: number): SelectionQuestion[] {
    const questions: SelectionQuestion[] = [];

    for (let i = 0; i < Math.min(count, cards.length); i++) {
      const card = cards[i];
      
      const question: SelectionQuestion = {
        id: Math.floor(Math.random() * 1000000),
        question: `Erkläre: ${card.skill}`,
        questionType: 'text-input',
        explanation: `Diese Frage bezieht sich auf: ${card.subcategory}`,
        type: category as any,
        answer: `Antwort zu ${card.skill}`
      };

      questions.push(question);
    }

    return questions;
  }

  private generateSimpleQuestion(category: string, grade: number, index: number): SelectionQuestion | null {
    const categoryQuestions: Record<string, () => SelectionQuestion> = {
      'mathematik': () => {
        // Generate grade-appropriate problems for math
        let maxNumber = 10;
        
        // Grade-specific constraints based on curriculum
        if (grade === 1) {
          maxNumber = 10; // Q1: counting to 10, simple addition/subtraction without carry
        } else if (grade === 2) {
          maxNumber = 20; // Q1: addition/subtraction to 20 without carry
        } else if (grade === 3) {
          maxNumber = 100;
        } else if (grade >= 4) {
          maxNumber = 1000;
        }
        
        // Rotate question types for variety
        const questionTypes = ['text-input', 'multiple-choice', 'word-selection'];
        const questionType = questionTypes[index % questionTypes.length];
        
        const a = Math.floor(Math.random() * maxNumber) + 1;
        const b = Math.floor(Math.random() * Math.min(maxNumber / 2, a)) + 1;
        
        // Simple operations appropriate for each grade
        const operations = grade === 1 ? ['+'] : ['+', '-'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        const result = operation === '+' ? a + b : a - b;
        
        if (questionType === 'multiple-choice') {
          // Generate wrong answers for multiple choice
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
            question: `Was ist ${a} ${operation} ${b}?`,
            questionType: 'multiple-choice',
            explanation: `${operation === '+' ? 'Addition' : 'Subtraktion'}: ${a} ${operation} ${b} = ${result}`,
            type: 'mathematik' as any,
            options,
            correctAnswer: options.indexOf(result.toString())
          };
        } else if (questionType === 'word-selection') {
          // Create word selection with numbers
          const numbers = Array.from({length: 8}, (_, i) => {
            const num = result + i - 4;
            return {
              word: num.toString(),
              isCorrect: num === result,
              index: i
            };
          }).filter(item => parseInt(item.word) > 0);
          
          return {
            id: Math.floor(Math.random() * 1000000),
            question: `Wähle das richtige Ergebnis für ${a} ${operation} ${b}:`,
            questionType: 'word-selection',
            explanation: `${operation === '+' ? 'Addition' : 'Subtraktion'}: ${a} ${operation} ${b} = ${result}`,
            type: 'mathematik' as any,
            sentence: `Wähle das richtige Ergebnis für ${a} ${operation} ${b}:`,
            selectableWords: numbers
          };
        } else {
          // Default text-input
          return {
            id: Math.floor(Math.random() * 1000000),
            question: `${a} ${operation} ${b} = ?`,
            questionType: 'text-input',
            explanation: `${operation === '+' ? 'Addition' : 'Subtraktion'}: ${a} ${operation} ${b} = ${result}`,
            type: 'mathematik' as any,
            answer: result.toString()
          };
        }
      },
      'deutsch': () => {
        // Rotate question types for variety
        const questionTypes = ['multiple-choice', 'word-selection', 'matching'];
        const questionType = questionTypes[index % questionTypes.length];
        
        if (questionType === 'multiple-choice') {
          const vowelQuestions = [
            { question: 'Welcher Buchstabe ist ein Vokal?', answer: 'A', options: ['B', 'A', 'K', 'T'] },
            { question: 'Welcher Buchstabe ist ein Vokal?', answer: 'E', options: ['F', 'E', 'G', 'H'] },
            { question: 'Welcher Buchstabe ist ein Vokal?', answer: 'I', options: ['J', 'K', 'I', 'L'] }
          ];
          const q = vowelQuestions[Math.floor(Math.random() * vowelQuestions.length)];
          
          return {
            id: Math.floor(Math.random() * 1000000),
            question: q.question,
            questionType: 'multiple-choice',
            explanation: 'Vokale sind: A, E, I, O, U',
            type: 'deutsch' as any,
            options: q.options,
            correctAnswer: q.options.indexOf(q.answer)
          };
        } else if (questionType === 'word-selection') {
          const words = ['Hund', 'Katze', 'Auto', 'Haus', 'Baum', 'Sonne'];
          return {
            id: Math.floor(Math.random() * 1000000),
            question: 'Wähle alle Wörter mit dem Buchstaben "a":',
            questionType: 'word-selection',
            explanation: 'Wörter mit "a": Katze, Auto, Haus, Baum',
            type: 'deutsch' as any,
            sentence: 'Wähle alle Wörter mit dem Buchstaben "a":',
            selectableWords: words.map((word, i) => ({
              word,
              isCorrect: word.toLowerCase().includes('a'),
              index: i
            }))
          };
        } else {
          // Matching question
          const items = [
            { id: 'tier1', content: 'Hund', category: 'tier' },
            { id: 'tier2', content: 'Katze', category: 'tier' },
            { id: 'farbe1', content: 'Rot', category: 'farbe' },
            { id: 'farbe2', content: 'Blau', category: 'farbe' }
          ];
          
          const categories = [
            { id: 'tier', name: 'Tiere', acceptsItems: ['tier1', 'tier2'] },
            { id: 'farbe', name: 'Farben', acceptsItems: ['farbe1', 'farbe2'] }
          ];
          
          return {
            id: Math.floor(Math.random() * 1000000),
            question: 'Ordne die Wörter den richtigen Kategorien zu:',
            questionType: 'matching',
            explanation: 'Tiere: Hund, Katze - Farben: Rot, Blau',
            type: 'deutsch' as any,
            items,
            categories
          };
        }
      }
    };

    const generator = categoryQuestions[this.normalizeCategory(category)];
    return generator ? generator() : null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}