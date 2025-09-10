/**
 * Enhanced Template Bank Service - New Generation System
 * Integrates all components for smart template management
 */
import { smartTemplateSelector, TemplateSelectionRequest } from './SmartTemplateSelector';
import { batchTemplateGenerator } from './BatchTemplateGenerator';
import { curriculumManager } from './CurriculumManager';
import { SelectionQuestion } from '@/types/questionTypes';

export interface TemplateBankResult {
  questions: SelectionQuestion[];
  sessionId: string;
  source: 'template-bank' | 'knowledge-generated' | 'legacy-fallback';
  qualityMetrics: {
    averageQuality: number;
    templateCoverage: number;
    domainDiversity: number;
  };
  error?: string;
}

export class EnhancedTemplateBankService {
  private static instance: EnhancedTemplateBankService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): EnhancedTemplateBankService {
    if (!this.instance) {
      this.instance = new EnhancedTemplateBankService();
    }
    return this.instance;
  }

  async generateQuestions(
    category: string,
    grade: number,
    quarter: string,
    totalQuestions: number,
    options: any,
    userId: string
  ): Promise<TemplateBankResult> {
    try {
      console.log(`🏦 Enhanced Template Bank: ${category} Grade ${grade} ${quarter}`);

      // Use smart template selection
      const selectionRequest: TemplateSelectionRequest = {
        grade,
        quarter,
        userId,
        count: totalQuestions,
        minDomainDiversity: Math.min(3, totalQuestions)
      };

      const selectionResult = await smartTemplateSelector.selectTemplates(selectionRequest);
      
      // Convert templates to SelectionQuestion format
      const questions: SelectionQuestion[] = selectionResult.templates.map(template => ({
        id: template.id || `template_${Date.now()}_${Math.random()}`,
        question: template.student_prompt,
        type: this.mapQuestionType(template.question_type),
        options: this.extractOptions(template),
        correctAnswer: this.extractCorrectAnswer(template),
        explanation: template.explanation || 'Keine Erklärung verfügbar.',
        difficulty: template.difficulty,
        category: template.domain,
        grade: template.grade,
        timeLimit: this.calculateTimeLimit(template.grade, template.difficulty)
      }));

      return {
        questions,
        sessionId: selectionResult.sessionId,
        source: 'template-bank',
        qualityMetrics: {
          averageQuality: 0.8, // High quality from database templates
          templateCoverage: selectionResult.selectionMetrics.domainCoverage / 4,
          domainDiversity: selectionResult.selectionMetrics.diversityScore
        }
      };
    } catch (error) {
      console.error('Enhanced Template Bank failed:', error);
      throw new Error("FALLBACK_TO_BALANCED_GENERATION");
    }
  }

  private mapQuestionType(templateType: string): 'multiple-choice' | 'text-input' | 'word-selection' | 'matching' {
    const typeMap: Record<string, any> = {
      'multiple-choice': 'multiple-choice',
      'text-input': 'text-input', 
      'sort': 'word-selection',
      'match': 'matching'
    };
    return typeMap[templateType] || 'multiple-choice';
  }

  private extractOptions(template: any): string[] | undefined {
    if (template.question_type === 'multiple-choice') {
      if (template.distractors && template.solution) {
        const solution = typeof template.solution === 'object' ? 
          template.solution.value || template.solution : template.solution;
        return [...(template.distractors || []), solution].sort(() => Math.random() - 0.5);
      }
    }
    return undefined;
  }

  private extractCorrectAnswer(template: any): any {
    if (template.solution) {
      if (typeof template.solution === 'object' && template.solution.value !== undefined) {
        return template.solution.value;
      }
      return template.solution;
    }
    return null;
  }

  private calculateTimeLimit(grade: number, difficulty: string): number {
    const baseTime = grade <= 2 ? 45 : grade <= 4 ? 60 : 90;
    const difficultyMultiplier = {
      'AFB I': 0.8,
      'AFB II': 1.0, 
      'AFB III': 1.3
    }[difficulty] || 1.0;
    
    return Math.round(baseTime * difficultyMultiplier);
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Dashboard integration methods
  async getCoverageStatus() {
    return curriculumManager.analyzeCoverage();
  }

  async generateMissingTemplates(count: number = 100) {
    return batchTemplateGenerator.fillHighPriorityGaps(count);
  }

  getGenerationProgress() {
    return batchTemplateGenerator.getCurrentProgress();
  }
}

export { EnhancedTemplateBankService };