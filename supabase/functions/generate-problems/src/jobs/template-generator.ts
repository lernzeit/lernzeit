import { GeminiService } from "../services/gemini.ts";
import { DatabaseService } from "../services/database.ts";
import { QualityControlService } from "../services/quality-control.ts";
import { EnhancedTemplateService } from "../services/enhanced-template-service.ts";
import { IntelligentFallbackService } from "../services/intelligent-fallback-service.ts";
import { EnhancedQualityControlService } from "../services/enhanced-quality-control.ts";
import { DiversityEngine } from "./diversity-engine.ts";
import { generateCurriculumPrompt } from "../utils/curriculum.ts";
import { validateGeneratedProblems } from "../utils/validator.ts";
import { logger } from "../utils/logger.ts";
import { GENERATION_CONSTANTS } from "../config.ts";
import { PerformanceTimer, promptCache } from "../utils/performance.ts";
import type { ProblemRequest, SelectionQuestion, GeneratedTemplate } from "../types.ts";

export class TemplateGenerator {
  private geminiService: GeminiService;
  private databaseService: DatabaseService;
  private qualityControlService: QualityControlService;
  private enhancedQualityControl: EnhancedQualityControlService;
  private enhancedTemplateService: EnhancedTemplateService;
  private intelligentFallbackService: IntelligentFallbackService;
  private diversityEngine: DiversityEngine;

  constructor(private requestId: string) {
    this.geminiService = new GeminiService();
    this.databaseService = new DatabaseService();
    this.qualityControlService = new QualityControlService();
    this.enhancedQualityControl = new EnhancedQualityControlService();
    this.enhancedTemplateService = new EnhancedTemplateService();
    this.intelligentFallbackService = new IntelligentFallbackService();
    this.diversityEngine = new DiversityEngine();
  }

  async generateProblems(request: ProblemRequest): Promise<{ problems: SelectionQuestion[] }> {
    const timer = new PerformanceTimer();
    
    try {
      logger.requestStarted(this.requestId, request);
      timer.checkpoint('request_started');
      
      // First, try to get high-quality templates from database
      const dbTemplates = await this.enhancedTemplateService.getOptimizedTemplates(
        request.category,
        request.grade,
        Math.min(request.count * 2, 20) // Get more templates than needed for selection
      );
      
      timer.checkpoint('templates_fetched');
      
      let problems: SelectionQuestion[] = [];
      
      // Try database templates first (they're pre-validated and high quality)
      if (dbTemplates.length > 0) {
        problems = await this.generateFromDatabaseTemplates(dbTemplates, request);
        timer.checkpoint('db_templates_processed');
      }
      
      // If we need more problems, use AI generation with enhanced prompting
      if (problems.length < request.count) {
        const remainingCount = request.count - problems.length;
        const aiGeneratedProblems = await this.generateWithEnhancedAI(request, remainingCount, problems);
        problems.push(...aiGeneratedProblems);
        timer.checkpoint('ai_generation_completed');
      }
      
      // If still not enough, use intelligent fallbacks
      if (problems.length < request.count) {
        const remainingCount = request.count - problems.length;
        const fallbackProblems = await this.generateIntelligentFallbacks(request, remainingCount, problems);
        problems.push(...fallbackProblems);
        timer.checkpoint('fallbacks_generated');
      }
      
      // Final quality check and optimization
      const finalProblems = await this.finalQualityCheck(problems, request);
      
      // Store successful templates in database (async, don't wait)
      this.storeGeneratedTemplatesAsync(finalProblems, request);

      timer.checkpoint('completed');
      const performanceReport = timer.getReport();
      logger.requestCompleted(this.requestId, performanceReport.total, finalProblems.length);
      
      // Log performance metrics for monitoring
      if (performanceReport.total > 10000) {
        logger.warn('Slow request detected', {
          requestId: this.requestId,
          performance: performanceReport,
          category: request.category,
          grade: request.grade
        });
      }

      // Log generation strategy effectiveness
      logger.info('Generation strategy breakdown', {
        requestId: this.requestId,
        dbTemplatesUsed: Math.min(problems.length, dbTemplates.length),
        aiGenerated: Math.max(0, Math.min(problems.length - dbTemplates.length, problems.length)),
        fallbacksUsed: Math.max(0, problems.length - Math.min(request.count, dbTemplates.length + (problems.length - dbTemplates.length))),
        totalGenerated: finalProblems.length,
        requested: request.count
      });

      return { problems: finalProblems };

    } catch (error) {
      const duration = timer.getDuration();
      logger.requestFailed(this.requestId, duration, error as Error);
      
      // Try emergency fallback
      try {
        const emergencyProblems = await this.intelligentFallbackService.generateFallbackQuestions(
          request,
          { maxAttempts: 3, qualityThreshold: 0.3, diversityRequirement: 0.5, gradeAdaptation: true },
          []
        );
        
        logger.info('Emergency fallback successful', {
          requestId: this.requestId,
          problemsGenerated: emergencyProblems.length
        });
        
        return { problems: emergencyProblems };
      } catch (fallbackError) {
        logger.error('Emergency fallback failed', {
          requestId: this.requestId,
          error: fallbackError.message
        });
        throw error; // Throw original error
      }
    }
  }

  private transformToSelectionQuestions(rawProblems: any[], request: ProblemRequest): SelectionQuestion[] {
    return rawProblems.map((problem, index) => ({
      id: Math.floor(Math.random() * 1000000),
      question: problem.question,
      type: request.category.toLowerCase(),
      explanation: problem.explanation || `Solution for: ${problem.question}`,
      questionType: problem.questionType || 'text-input',
      ...(problem.questionType === 'multiple-choice' && {
        options: problem.options || [],
        correctAnswer: problem.correctAnswer || 0
      }),
      ...(problem.questionType === 'word-selection' && {
        sentence: problem.sentence || '',
        selectableWords: problem.selectableWords || []
      }),
      ...(problem.questionType === 'matching' && {
        items: problem.items?.map((item: any, itemIndex: number) => ({
          id: item.id || `item-${itemIndex}`,
          content: item.content || item.word,
          category: item.category
        })) || [],
        categories: problem.categories?.map((category: any, catIndex: number) => ({
          id: category.id || category.name || `category-${catIndex}`,
          name: category.name,
          acceptsItems: category.acceptsItems || []
        })) || []
      }),
      ...(problem.questionType === 'text-input' && {
        answer: problem.answer || problem.correctAnswer || ''
      })
    })) as SelectionQuestion[];
  }

  private async applyQualityControl(
    problems: SelectionQuestion[],
    request: ProblemRequest
  ): Promise<SelectionQuestion[]> {
    const filteredProblems: SelectionQuestion[] = [];

    for (const problem of problems) {
      // Quality evaluation
      const qualityMetrics = this.qualityControlService.evaluateQuestionQuality(
        problem,
        request.category,
        request.grade,
        this.requestId
      );

      // Uniqueness check
      const uniquenessResult = this.qualityControlService.checkUniqueness(
        problem.question,
        request.excludeQuestions || [],
        this.requestId
      );

      qualityMetrics.uniqueness_score = uniquenessResult.similarityScore;
      qualityMetrics.overall_score = (qualityMetrics.overall_score * 0.8) + (qualityMetrics.uniqueness_score * 0.2);

      // Apply quality thresholds
      if (qualityMetrics.overall_score >= GENERATION_CONSTANTS.MIN_QUALITY_SCORE && uniquenessResult.isUnique) {
        filteredProblems.push(problem);
        logger.templateGenerated(this.requestId, problem.id.toString(), qualityMetrics.overall_score);
      } else {
        logger.templateFiltered(
          this.requestId,
          `Quality: ${qualityMetrics.overall_score.toFixed(2)}, Unique: ${uniquenessResult.isUnique}`,
          problem.question
        );
      }
    }

    return filteredProblems;
  }

  private async storeGeneratedTemplatesAsync(
    problems: SelectionQuestion[],
    request: ProblemRequest
  ): Promise<void> {
    // Run asynchronously to not block response
    setTimeout(async () => {
      try {
        for (const problem of problems) {
          const template: Omit<GeneratedTemplate, 'id' | 'created_at' | 'updated_at'> = {
            content: problem.question,
            category: request.category,
            grade: request.grade,
            question_type: problem.questionType,
            quality_score: 0.8, // Will be properly calculated
            usage_count: 0,
            is_active: true,
            content_hash: await this.generateContentHash(problem.question)
          };

          await this.databaseService.storeTemplate(template, this.requestId);
        }
      } catch (error) {
        logger.warn('Failed to store some templates', {
          requestId: this.requestId,
          error: error.message
        });
      }
    }, 0);
  }

  /**
   * Generate problems from high-quality database templates
   */
  private async generateFromDatabaseTemplates(
    templates: any[],
    request: ProblemRequest
  ): Promise<SelectionQuestion[]> {
    const problems: SelectionQuestion[] = [];
    const usedTemplates = new Set<string>();
    
    for (let i = 0; i < Math.min(request.count, templates.length); i++) {
      // Select template with priority scoring
      const template = this.selectBestTemplate(templates, usedTemplates);
      if (!template) continue;
      
      try {
        const problem = await this.generateFromTemplate(template, request);
        if (problem) {
          problems.push(problem);
          usedTemplates.add(template.id);
          
          // Update template usage statistics
          await this.enhancedTemplateService.updateTemplateUsage(template.id, true);
        }
      } catch (error) {
        logger.warn('Failed to generate from template', {
          templateId: template.id,
          error: error.message
        });
        
        // Update template usage with failure
        await this.enhancedTemplateService.updateTemplateUsage(template.id, false);
      }
    }
    
    return problems;
  }

  /**
   * Generate problems using enhanced AI with better prompting
   */
  private async generateWithEnhancedAI(
    request: ProblemRequest,
    count: number,
    existingProblems: SelectionQuestion[]
  ): Promise<SelectionQuestion[]> {
    try {
      // Enhanced prompt generation with context from existing problems
      const existingQuestions = existingProblems.map(p => p.question);
      const enhancedPrompt = this.createEnhancedPrompt(request, existingQuestions);
      
      // Generate with enhanced request
      const enhancedRequest = { ...request, count };
      const rawResponse = await this.geminiService.generateProblemsWithRetry(
        enhancedRequest,
        enhancedPrompt,
        this.requestId
      );

      // Validate and transform
      const validatedProblems = validateGeneratedProblems(rawResponse);
      const transformedProblems = this.transformToSelectionQuestions(validatedProblems.problems, request);

      // Enhanced quality control
      const qualityFilteredProblems = await this.applyEnhancedQualityControl(
        transformedProblems,
        request,
        existingQuestions
      );

      return qualityFilteredProblems;
    } catch (error) {
      logger.warn('Enhanced AI generation failed', {
        error: error.message,
        requestId: this.requestId
      });
      return [];
    }
  }

  /**
   * Generate intelligent fallback problems
   */
  private async generateIntelligentFallbacks(
    request: ProblemRequest,
    count: number,
    existingProblems: SelectionQuestion[]
  ): Promise<SelectionQuestion[]> {
    const existingQuestions = existingProblems.map(p => p.question);
    
    return await this.intelligentFallbackService.generateFallbackQuestions(
      { ...request, count },
      {
        maxAttempts: 5,
        qualityThreshold: 0.4,
        diversityRequirement: 0.6,
        gradeAdaptation: true
      },
      existingQuestions
    );
  }

  /**
   * Apply enhanced quality control
   */
  private async applyEnhancedQualityControl(
    problems: SelectionQuestion[],
    request: ProblemRequest,
    existingQuestions: string[]
  ): Promise<SelectionQuestion[]> {
    const filteredProblems: SelectionQuestion[] = [];

    for (const problem of problems) {
      // Enhanced quality evaluation
      const qualityMetrics = this.enhancedQualityControl.evaluateQuestionQuality(
        problem,
        request.category,
        request.grade,
        {
          minOverallScore: 0.65, // Higher standard for AI-generated content
          minEducationalValue: 0.5,
          minEngagementScore: 0.4,
          requireProgressionAlignment: true,
          strictMode: false
        }
      );

      // Check quality standards
      const qualityCheck = this.enhancedQualityControl.meetsQualityStandards(qualityMetrics);

      // Uniqueness check against existing questions
      const uniquenessResult = this.qualityControlService.checkUniqueness(
        problem.question,
        [...(request.excludeQuestions || []), ...existingQuestions],
        this.requestId
      );

      if (qualityCheck.passes && uniquenessResult.isUnique) {
        filteredProblems.push(problem);
        logger.templateGenerated(this.requestId, problem.id.toString(), qualityMetrics.overall_score);
      } else {
        logger.templateFiltered(
          this.requestId,
          `Enhanced QC failed: ${qualityCheck.reasons.join(', ')}, Unique: ${uniquenessResult.isUnique}`,
          problem.question
        );
      }
    }

    return filteredProblems;
  }

  /**
   * Final quality check and optimization
   */
  private async finalQualityCheck(
    problems: SelectionQuestion[],
    request: ProblemRequest
  ): Promise<SelectionQuestion[]> {
    // Remove exact duplicates
    const uniqueProblems = problems.filter((problem, index, array) => 
      array.findIndex(p => p.question === problem.question) === index
    );

    // Ensure variety in question types
    const diverseProblems = this.ensureQuestionTypeVariety(uniqueProblems, request);

    // Sort by quality score if available
    const sortedProblems = diverseProblems.sort((a, b) => {
      // Prefer certain question types for engagement
      const typeScore = { 'multiple-choice': 3, 'word-selection': 2, 'text-input': 1 };
      return (typeScore[b.questionType as keyof typeof typeScore] || 0) - 
             (typeScore[a.questionType as keyof typeof typeScore] || 0);
    });

    return sortedProblems.slice(0, request.count);
  }

  /**
   * Select best template from available options
   */
  private selectBestTemplate(templates: any[], usedTemplates: Set<string>): any | null {
    const availableTemplates = templates.filter(t => !usedTemplates.has(t.id));
    
    if (availableTemplates.length === 0) {
      // Reset usage if all templates have been used
      usedTemplates.clear();
      return templates[0] || null;
    }

    // Sort by priority score (assuming templates have this from EnhancedTemplateService)
    const sortedTemplates = availableTemplates.sort((a, b) => 
      (b.priority_score || 0) - (a.priority_score || 0)
    );

    return sortedTemplates[0];
  }

  /**
   * Generate problem from template
   */
  private async generateFromTemplate(template: any, request: ProblemRequest): Promise<SelectionQuestion | null> {
    try {
      // This would contain the logic to fill template parameters
      // For now, we'll create a basic implementation
      const problem: SelectionQuestion = {
        id: Math.floor(Math.random() * 1000000),
        question: template.content,
        type: request.category.toLowerCase(),
        explanation: `Lösung für: ${template.content}`,
        questionType: template.question_type || 'text-input'
      };

      // Add type-specific properties based on template
      if (template.question_type === 'text-input') {
        problem.answer = this.extractAnswerFromTemplate(template.content);
      }

      return problem;
    } catch (error) {
      logger.warn('Failed to generate from template', {
        templateId: template.id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Create enhanced prompt for AI generation
   */
  private createEnhancedPrompt(request: ProblemRequest, existingQuestions: string[]): string {
    const basePrompt = generateCurriculumPrompt(request.category, request.grade);
    
    // Add context about existing questions to avoid duplicates
    let enhancedPrompt = basePrompt;
    
    if (existingQuestions.length > 0) {
      enhancedPrompt += `\n\nVERMEIDE diese bereits verwendeten Fragetypen und -strukturen:\n`;
      enhancedPrompt += existingQuestions.slice(0, 3).map(q => `- ${q}`).join('\n');
      enhancedPrompt += `\n\nGeneriere VÖLLIG UNTERSCHIEDLICHE Fragen mit anderen Ansätzen, Zahlen und Formulierungen.`;
    }

    // Add quality requirements
    enhancedPrompt += `\n\nQUALITÄTSANFORDERUNGEN:
- Altersgerechte Sprache für Klasse ${request.grade}
- Klare, eindeutige Fragestellung
- Pädagogisch wertvoll und lehrplankonform
- Abwechslungsreiche Fragetypen
- Realitätsbezug wo möglich`;

    return this.diversityEngine.enhancePromptForDiversity(
      enhancedPrompt,
      request.excludeQuestions || []
    );
  }

  /**
   * Ensure variety in question types
   */
  private ensureQuestionTypeVariety(
    problems: SelectionQuestion[],
    request: ProblemRequest
  ): SelectionQuestion[] {
    const typeGroups = new Map<string, SelectionQuestion[]>();
    
    // Group by question type
    problems.forEach(problem => {
      const type = problem.questionType;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(problem);
    });

    // Ensure balanced distribution
    const result: SelectionQuestion[] = [];
    const maxPerType = Math.ceil(request.count / Math.max(typeGroups.size, 2));
    
    typeGroups.forEach((problemsOfType, type) => {
      result.push(...problemsOfType.slice(0, maxPerType));
    });

    return result.slice(0, request.count);
  }

  /**
   * Extract answer from template content (simple implementation)
   */
  private extractAnswerFromTemplate(content: string): string {
    // Look for equals sign pattern
    const match = content.match(/=\s*(\d+)/);
    if (match) {
      return match[1];
    }
    
    // Look for question mark pattern
    const questionMatch = content.match(/(\d+)\s*\?\s*$/);
    if (questionMatch) {
      return questionMatch[1];
    }
    
    return 'Antwort';
  }

  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}