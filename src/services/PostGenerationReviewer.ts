/**
 * Post Generation Reviewer - Phase 2
 * Comprehensive review and quality assurance after template generation
 */
import { supabase } from '@/integrations/supabase/client';
import { templateQualityPipeline, QualityMetrics } from './TemplateQualityPipeline';
import { contentValidator } from './ContentValidator';

export interface ReviewResult {
  templateId: string;
  approved: boolean;
  qualityMetrics: QualityMetrics;
  actionsTaken: string[];
  recommendedActions: string[];
  needsHumanReview: boolean;
}

export interface ReviewBatch {
  totalReviewed: number;
  approved: number;
  rejected: number;
  needingReview: number;
  averageQuality: number;
  results: ReviewResult[];
}

export class PostGenerationReviewer {
  private static instance: PostGenerationReviewer;

  static getInstance(): PostGenerationReviewer {
    if (!PostGenerationReviewer.instance) {
      PostGenerationReviewer.instance = new PostGenerationReviewer();
    }
    return PostGenerationReviewer.instance;
  }

  /**
   * Review a single template after generation
   */
  async reviewTemplate(templateId: string): Promise<ReviewResult> {
    try {
      // Fetch the template
      const { data: template, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) {
        throw new Error(`Template ${templateId} nicht gefunden: ${error?.message}`);
      }

      // Run comprehensive review
      const review = await templateQualityPipeline.postGenerationReview(template);
      const actionsTaken: string[] = [];
      const recommendedActions: string[] = [];

      // Determine actions based on review results
      if (!review.approved) {
        if (review.qualityMetrics.overallScore < 0.3) {
          // Auto-archive severely problematic templates
          await this.archiveTemplate(templateId, 'Automatisch archiviert: Schwerwiegende Qualitätsmängel');
          actionsTaken.push('Template automatisch archiviert');
        } else {
          // Mark for human review
          await this.markForReview(templateId, review.qualityMetrics);
          actionsTaken.push('Template für manuelle Prüfung markiert');
        }
      } else {
        // Approved template - ensure it's active
        await this.activateTemplate(templateId, review.qualityMetrics.overallScore);
        actionsTaken.push('Template aktiviert');
      }

      // Generate recommendations
      recommendedActions.push(...this.generateRecommendations(review.qualityMetrics));

      return {
        templateId,
        approved: review.approved,
        qualityMetrics: review.qualityMetrics,
        actionsTaken,
        recommendedActions,
        needsHumanReview: !review.approved && review.qualityMetrics.overallScore >= 0.3
      };

    } catch (error) {
      console.error(`Review error for template ${templateId}:`, error);
      return {
        templateId,
        approved: false,
        qualityMetrics: {
          contentScore: 0.2,
          curriculumScore: 0.2,
          logicalScore: 0.2,
          overallScore: 0.2,
          timestamp: new Date().toISOString()
        },
        actionsTaken: ['Review fehlgeschlagen'],
        recommendedActions: ['Manuelle Prüfung erforderlich'],
        needsHumanReview: true
      };
    }
  }

  /**
   * Review multiple templates in batch
   */
  async reviewBatch(templateIds: string[]): Promise<ReviewBatch> {
    console.log(`🔍 Starting batch review of ${templateIds.length} templates...`);
    
    const results: ReviewResult[] = [];
    let approved = 0;
    let rejected = 0;
    let needingReview = 0;
    let totalQuality = 0;

    for (const templateId of templateIds) {
      try {
        const result = await this.reviewTemplate(templateId);
        results.push(result);

        if (result.approved) approved++;
        else rejected++;
        
        if (result.needsHumanReview) needingReview++;
        
        totalQuality += result.qualityMetrics.overallScore;

        // Brief pause to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Batch review error for template ${templateId}:`, error);
      }
    }

    const averageQuality = results.length > 0 ? totalQuality / results.length : 0;

    console.log(`✅ Batch review complete: ${approved} approved, ${rejected} rejected, ${needingReview} need review`);

    return {
      totalReviewed: results.length,
      approved,
      rejected,
      needingReview,
      averageQuality,
      results
    };
  }

  /**
   * Review templates created in the last N hours
   */
  async reviewRecentTemplates(hours: number = 24): Promise<ReviewBatch> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data: recentTemplates, error } = await supabase
        .from('templates')
        .select('id')
        .eq('status', 'ACTIVE')
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Fehler beim Abrufen neuer Templates: ${error.message}`);
      }

      const templateIds = (recentTemplates || []).map(t => t.id);
      console.log(`📊 Found ${templateIds.length} templates created in last ${hours} hours`);

      return await this.reviewBatch(templateIds);
      
    } catch (error) {
      console.error('Error reviewing recent templates:', error);
      return {
        totalReviewed: 0,
        approved: 0,
        rejected: 0,
        needingReview: 0,
        averageQuality: 0,
        results: []
      };
    }
  }

  /**
   * Auto-cleanup: Archive templates with consistently poor feedback
   */
  async performAutoCleanup(): Promise<{
    archived: number;
    reviewed: number;
    message: string;
  }> {
    try {
      console.log('🧹 Starting automatic cleanup of poor-quality templates...');
      
      // Find templates with multiple negative feedback
      const { data: problematicTemplates, error } = await supabase
        .from('templates')
        .select(`
          id, 
          student_prompt,
          quality_score,
          plays,
          correct,
          created_at
        `)
        .eq('status', 'ACTIVE')
        .lt('quality_score', 0.4)
        .gt('plays', 5); // Only consider templates that have been used

      if (error) throw error;

      let archived = 0;
      
      for (const template of (problematicTemplates || [])) {
        const successRate = template.plays > 0 ? template.correct / template.plays : 0;
        
        // Archive if quality is poor AND success rate is low
        if (template.quality_score < 0.4 && successRate < 0.3) {
          await this.archiveTemplate(
            template.id, 
            `Auto-cleanup: Schlechte Qualität (${template.quality_score.toFixed(2)}) und niedrige Erfolgsrate (${(successRate * 100).toFixed(0)}%)`
          );
          archived++;
        }
      }

      const message = `Auto-cleanup complete: ${archived} templates archived from ${problematicTemplates?.length || 0} reviewed`;
      console.log(`✅ ${message}`);

      return {
        archived,
        reviewed: problematicTemplates?.length || 0,
        message
      };

    } catch (error) {
      console.error('Auto-cleanup error:', error);
      return {
        archived: 0,
        reviewed: 0,
        message: `Auto-cleanup failed: ${error}`
      };
    }
  }

  /**
   * Archive a template with reason
   */
  private async archiveTemplate(templateId: string, reason: string): Promise<void> {
    await supabase
      .from('templates')
      .update({ 
        status: 'ARCHIVED',
        validation_status: 'invalid'
      })
      .eq('id', templateId);

    console.log(`📦 Archived template ${templateId}: ${reason}`);
  }

  /**
   * Mark template for human review
   */
  private async markForReview(templateId: string, metrics: QualityMetrics): Promise<void> {
    await supabase
      .from('templates')
      .update({ 
        validation_status: 'needs_review',
        quality_score: metrics.overallScore
      })
      .eq('id', templateId);

    console.log(`👤 Marked template ${templateId} for human review (score: ${metrics.overallScore.toFixed(2)})`);
  }

  /**
   * Activate an approved template
   */
  private async activateTemplate(templateId: string, qualityScore: number): Promise<void> {
    await supabase
      .from('templates')
      .update({ 
        validation_status: 'valid',
        quality_score: qualityScore,
        status: 'ACTIVE'
      })
      .eq('id', templateId);
  }

  /**
   * Generate recommendations based on quality metrics
   */
  private generateRecommendations(metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.contentScore < 0.6) {
      recommendations.push('Content-Qualität verbessern: Aufgabenstellung überarbeiten');
    }

    if (metrics.curriculumScore < 0.6) {
      recommendations.push('Curriculum-Alignment prüfen: Klassenstufengerecht anpassen');
    }

    if (metrics.logicalScore < 0.7) {
      recommendations.push('Mathematische Logik überprüfen: Lösung validieren');
    }

    if (metrics.overallScore < 0.5) {
      recommendations.push('Umfassende Überarbeitung erforderlich');
    } else if (metrics.overallScore < 0.7) {
      recommendations.push('Kleinere Anpassungen zur Qualitätsverbesserung');
    }

    return recommendations;
  }
}

export const postGenerationReviewer = PostGenerationReviewer.getInstance();