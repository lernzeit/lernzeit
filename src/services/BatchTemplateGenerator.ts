/**
 * Batch Template Generator
 * Efficient mass production of templates with progress tracking
 */
import { supabase } from '@/lib/supabase';
import { multiProviderAIService, TemplateGenerationRequest, GeneratedTemplate } from './MultiProviderAIService';
import { curriculumManager, TemplateGap } from './CurriculumManager';

export interface BatchGenerationRequest {
  gaps: TemplateGap[];
  batchSize?: number;
  delayBetweenRequests?: number;
  maxConcurrentRequests?: number;
  targetCount?: number;
}

export interface BatchGenerationProgress {
  totalRequested: number;
  completed: number;
  successful: number;
  failed: number;
  percentComplete: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  errors: string[];
}

export interface BatchGenerationResult {
  success: boolean;
  totalGenerated: number;
  totalSaved: number;
  progress: BatchGenerationProgress;
  generatedTemplates: GeneratedTemplate[];
  errors: string[];
  duration: number;
}

class BatchTemplateGenerator {
  private isGenerating = false;
  private currentProgress: BatchGenerationProgress = this.createEmptyProgress();
  private progressCallbacks: ((progress: BatchGenerationProgress) => void)[] = [];

  async generateBatch(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    if (this.isGenerating) {
      throw new Error('Batch generation already in progress');
    }

    this.isGenerating = true;
    const startTime = Date.now();

    try {
      console.log('🚀 Starting batch template generation...', {
        gaps: request.gaps.length,
        batchSize: request.batchSize || 10,
        targetCount: request.targetCount
      });

      const result = await this.executeBatchGeneration(request);
      const duration = Date.now() - startTime;

      return {
        ...result,
        duration
      };
    } finally {
      this.isGenerating = false;
      this.currentProgress = this.createEmptyProgress();
    }
  }

  private async executeBatchGeneration(request: BatchGenerationRequest): Promise<Omit<BatchGenerationResult, 'duration'>> {
    const {
      gaps,
      batchSize = 10,
      delayBetweenRequests = 1000,
      maxConcurrentRequests = 3,
      targetCount
    } = request;

    // Limit gaps to target count if specified
    const prioritizedGaps = targetCount ? 
      curriculumManager.getPriorityGenerationQueue(gaps, targetCount) :
      gaps;

    const totalRequested = prioritizedGaps.length;
    const totalBatches = Math.ceil(totalRequested / batchSize);
    
    this.currentProgress = {
      totalRequested,
      completed: 0,
      successful: 0,
      failed: 0,
      percentComplete: 0,
      currentBatch: 0,
      totalBatches,
      estimatedTimeRemaining: 0,
      errors: []
    };

    const allGeneratedTemplates: GeneratedTemplate[] = [];
    const allErrors: string[] = [];

    // Process in batches to avoid overwhelming APIs
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalRequested);
      const batchGaps = prioritizedGaps.slice(batchStart, batchEnd);

      this.currentProgress.currentBatch = batchIndex + 1;
      this.notifyProgress();

      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batchGaps.length} templates)`);

      try {
        const batchResults = await this.processBatch(
          batchGaps,
          maxConcurrentRequests,
          delayBetweenRequests
        );

        allGeneratedTemplates.push(...batchResults.templates);
        allErrors.push(...batchResults.errors);

        this.currentProgress.successful += batchResults.templates.length;
        this.currentProgress.failed += batchResults.errors.length;
        this.currentProgress.completed = batchEnd;
        this.currentProgress.percentComplete = (this.currentProgress.completed / totalRequested) * 100;
        
        // Estimate time remaining
        const elapsed = Date.now() - (Date.now() - (batchIndex + 1) * 5000); // Rough estimate
        const avgTimePerBatch = elapsed / (batchIndex + 1);
        this.currentProgress.estimatedTimeRemaining = avgTimePerBatch * (totalBatches - batchIndex - 1);
        
        this.notifyProgress();

        // Delay between batches (except for the last one)
        if (batchIndex < totalBatches - 1) {
          await this.delay(delayBetweenRequests);
        }
      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
        allErrors.push(`Batch ${batchIndex + 1} failed: ${error.message}`);
        this.currentProgress.failed += batchGaps.length;
        this.currentProgress.completed = batchEnd;
      }
    }

    // Save all generated templates to database
    const savedCount = await this.saveTemplatesToDatabase(allGeneratedTemplates);

    const finalResult = {
      success: this.currentProgress.successful > 0,
      totalGenerated: allGeneratedTemplates.length,
      totalSaved: savedCount,
      progress: { ...this.currentProgress },
      generatedTemplates: allGeneratedTemplates,
      errors: allErrors
    };

    console.log('✅ Batch generation complete:', {
      generated: finalResult.totalGenerated,
      saved: finalResult.totalSaved,
      errors: finalResult.errors.length
    });

    return finalResult;
  }

  private async processBatch(
    gaps: TemplateGap[],
    maxConcurrent: number,
    delay: number
  ): Promise<{ templates: GeneratedTemplate[]; errors: string[] }> {
    const templates: GeneratedTemplate[] = [];
    const errors: string[] = [];

    // Process gaps in chunks to respect concurrent limits
    const chunks = this.chunkArray(gaps, maxConcurrent);

    for (const chunk of chunks) {
      const promises = chunk.map(async (gap, index) => {
        try {
          // Add small delay to avoid hammering APIs
          if (index > 0) {
            await this.delay(delay / maxConcurrent);
          }

          const request: TemplateGenerationRequest = {
            subject: 'Mathematik',
            domain: gap.domain,
            subcategory: gap.subcategory,
            grade: gap.grade,
            quarter: gap.quarter,
            difficulty: gap.difficulty as any,
            questionType: gap.questionType as any,
            count: 1
          };

          const template = await multiProviderAIService.generateTemplate(request);
          if (template) {
            templates.push(template);
          } else {
            errors.push(`Failed to generate template for ${gap.grade}-${gap.quarter}-${gap.domain}-${gap.difficulty}`);
          }
        } catch (error) {
          console.error('Template generation error:', error);
          errors.push(`Error generating ${gap.grade}-${gap.quarter}-${gap.domain}: ${error.message}`);
        }
      });

      await Promise.all(promises);
    }

    return { templates, errors };
  }

  private async saveTemplatesToDatabase(templates: GeneratedTemplate[]): Promise<number> {
    if (templates.length === 0) return 0;

    try {
      console.log(`💾 Saving ${templates.length} templates to database...`);

      // Batch insert to database (Supabase handles this efficiently)
      const { data, error } = await supabase
        .from('templates')
        .insert(templates)
        .select('id');

      if (error) {
        console.error('Database save error:', error);
        return 0;
      }

      console.log(`✅ Successfully saved ${data?.length || 0} templates`);
      return data?.length || 0;
    } catch (error) {
      console.error('Error saving templates to database:', error);
      return 0;
    }
  }

  // Progress tracking methods
  onProgress(callback: (progress: BatchGenerationProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private notifyProgress(): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback({ ...this.currentProgress });
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  getCurrentProgress(): BatchGenerationProgress {
    return { ...this.currentProgress };
  }

  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }

  // Utility methods
  private createEmptyProgress(): BatchGenerationProgress {
    return {
      totalRequested: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      percentComplete: 0,
      currentBatch: 0,
      totalBatches: 0,
      estimatedTimeRemaining: 0,
      errors: []
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Quick generation methods for common scenarios
  async generateForGrade(grade: number, count: number = 100): Promise<BatchGenerationResult> {
    console.log(`🎯 Generating ${count} templates for Grade ${grade}...`);
    
    const coverage = await curriculumManager.analyzeCoverage();
    const gradeGaps = coverage.gaps.filter(gap => gap.grade === grade);
    
    return this.generateBatch({
      gaps: gradeGaps,
      targetCount: count,
      batchSize: 20,
      delayBetweenRequests: 800
    });
  }

  async generateForDomain(domain: string, count: number = 100): Promise<BatchGenerationResult> {
    console.log(`🔢 Generating ${count} templates for domain "${domain}"...`);
    
    const coverage = await curriculumManager.analyzeCoverage();
    const domainGaps = coverage.gaps.filter(gap => gap.domain === domain);
    
    return this.generateBatch({
      gaps: domainGaps,
      targetCount: count,
      batchSize: 15,
      delayBetweenRequests: 1000
    });
  }

  async fillHighPriorityGaps(count: number = 200): Promise<BatchGenerationResult> {
    console.log(`🚨 Filling ${count} high-priority template gaps...`);
    
    const coverage = await curriculumManager.analyzeCoverage();
    const highPriorityGaps = coverage.gaps.filter(gap => gap.priority === 'HIGH');
    
    return this.generateBatch({
      gaps: highPriorityGaps,
      targetCount: count,
      batchSize: 25,
      delayBetweenRequests: 600,
      maxConcurrentRequests: 5
    });
  }
}

export const batchTemplateGenerator = new BatchTemplateGenerator();