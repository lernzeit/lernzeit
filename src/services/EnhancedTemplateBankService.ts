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
      const questions: SelectionQuestion[] = selectionResult.templates.map(template => {
        const baseQuestion = {
          id: parseInt(template.id) || Date.now(),
          question: template.student_prompt,
          type: 'math' as const,
          explanation: template.explanation || 'Keine Erklärung verfügbar.'
        };

        const questionType = this.mapQuestionType(template.question_type);
        
        if (questionType === 'multiple-choice') {
          const options = this.extractOptions(template) || [];
          const correctAnswer = this.findCorrectIndex(options, this.extractCorrectAnswer(template));
          return {
            ...baseQuestion,
            questionType: 'multiple-choice' as const,
            options,
            correctAnswer
          };
        } else if (questionType === 'text-input') {
          return {
            ...baseQuestion,
            questionType: 'text-input' as const,
            answer: this.extractCorrectAnswer(template)
          };
        } else {
          // Default to multiple choice for other types
          return {
            ...baseQuestion,
            questionType: 'multiple-choice' as const,
            options: ['Option A', 'Option B'],
            correctAnswer: 0
          };
        }
      });

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

  private mapQuestionType(templateType: string): 'multiple-choice' | 'text-input' {
    return templateType === 'text-input' ? 'text-input' : 'multiple-choice';
  }

  private findCorrectIndex(options: string[], correctAnswer: any): number {
    if (!correctAnswer || !options.length) return 0;
    const correctStr = String(correctAnswer);
    const index = options.findIndex(option => String(option) === correctStr);
    return index >= 0 ? index : 0;
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

