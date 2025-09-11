/**
 * Template Quality Pipeline - Phase 2 Implementation
 * Comprehensive pre/post generation quality assurance system
 */
import { supabase } from '@/integrations/supabase/client';
import { ContentValidator, ValidationResult } from './ContentValidator';

export interface QualityMetrics {
  contentScore: number;
  curriculumScore: number;
  logicalScore: number;
  overallScore: number;
  timestamp: string;
}

export interface GenerationContext {
  grade: number;
  domain: string;
  difficulty: string;
  questionType: string;
  userId?: string;
}

export class TemplateQualityPipeline {
  private static instance: TemplateQualityPipeline;
  private contentValidator: ContentValidator;

  private constructor() {
    this.contentValidator = ContentValidator.getInstance();
  }

  static getInstance(): TemplateQualityPipeline {
    if (!TemplateQualityPipeline.instance) {
      TemplateQualityPipeline.instance = new TemplateQualityPipeline();
    }
    return TemplateQualityPipeline.instance;
  }

  /**
   * Phase 2: Pre-generation validation pipeline
   */
  async preGenerationValidation(context: GenerationContext): Promise<{ 
    approved: boolean; 
    recommendations: string[];
    adjustedDifficulty?: string;
  }> {
    const recommendations: string[] = [];
    let approved = true;
    let adjustedDifficulty = context.difficulty;

    // Check generation frequency for this combination
    const recentGeneration = await this.checkRecentGeneration(context);
    if (recentGeneration.tooFrequent) {
      approved = false;
      recommendations.push('Zu häufige Generierung für diese Kombination - warte 5 Minuten');
    }

    // Check template pool saturation
    const poolSaturation = await this.checkPoolSaturation(context);
    if (poolSaturation.oversaturated) {
      approved = false;
      recommendations.push(`Pool übersättigt: ${poolSaturation.count} Templates vorhanden, max ${poolSaturation.maxRecommended}`);
    }

    // Analyze user performance for difficulty adjustment
    if (context.userId) {
      const performanceAnalysis = await this.analyzeUserPerformance(context.userId, context);
      if (performanceAnalysis.suggestEasier) {
        adjustedDifficulty = 'leicht';
        recommendations.push('Schwierigkeit auf "leicht" angepasst basierend auf Nutzerleistung');
      } else if (performanceAnalysis.suggestHarder) {
        adjustedDifficulty = 'schwer';
        recommendations.push('Schwierigkeit auf "schwer" angepasst basierend auf Nutzerleistung');
      }
    }

    return {
      approved,
      recommendations,
      adjustedDifficulty: adjustedDifficulty !== context.difficulty ? adjustedDifficulty : undefined
    };
  }

  /**
   * Phase 2: Post-generation review and quality scoring
   */
  async postGenerationReview(template: any): Promise<{
    approved: boolean;
    qualityMetrics: QualityMetrics;
    actionRequired: string[];
  }> {
    const validation = await this.contentValidator.validateTemplate(template);
    const actionRequired: string[] = [];

    // Calculate detailed quality metrics
    const qualityMetrics = await this.calculateQualityMetrics(template, validation);

    // Determine approval based on comprehensive scoring
    const approved = this.determineApproval(qualityMetrics, validation);

    if (!approved) {
      actionRequired.push('Template wird nicht für Verwendung freigegeben');
      
      if (validation.shouldExclude) {
        actionRequired.push('Template wird automatisch archiviert');
      }
    }

    // Store quality metrics for tracking
    await this.storeQualityMetrics(template.id, qualityMetrics);

    return {
      approved,
      qualityMetrics,
      actionRequired
    };
  }

  /**
   * Calculate comprehensive quality metrics
   */
  private async calculateQualityMetrics(template: any, validation: ValidationResult): Promise<QualityMetrics> {
    let contentScore = validation.qualityScore;
    let curriculumScore = 0.8; // Base curriculum score
    let logicalScore = 0.8; // Base logical score

    // Content scoring based on validation issues
    const criticalIssues = validation.issues.filter(issue => issue.includes('KRITISCH')).length;
    const warningIssues = validation.issues.length - criticalIssues;
    
    contentScore -= (criticalIssues * 0.4) + (warningIssues * 0.1);

    // Curriculum scoring based on grade appropriateness
    const gradeIssues = validation.issues.filter(issue => 
      issue.includes('Klassenunpassend') || issue.includes('Zahlenraum')
    );
    curriculumScore -= gradeIssues.length * 0.2;

    // Logical scoring based on mathematical correctness
    const mathIssues = validation.issues.filter(issue =>
      issue.includes('rechnung falsch') || issue.includes('Lösung')
    );
    logicalScore -= mathIssues.length * 0.3;

    // Calculate overall score (weighted average)
    const overallScore = (contentScore * 0.4) + (curriculumScore * 0.3) + (logicalScore * 0.3);

    return {
      contentScore: Math.max(0, Math.min(1, contentScore)),
      curriculumScore: Math.max(0, Math.min(1, curriculumScore)),
      logicalScore: Math.max(0, Math.min(1, logicalScore)),
      overallScore: Math.max(0, Math.min(1, overallScore)),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determine if template should be approved based on metrics
   */
  private determineApproval(metrics: QualityMetrics, validation: ValidationResult): boolean {
    // Hard exclusions
    if (validation.shouldExclude) return false;
    if (metrics.overallScore < 0.6) return false;
    if (metrics.logicalScore < 0.5) return false; // Math must be correct
    
    // Soft approval based on balanced scoring
    return metrics.contentScore >= 0.7 && 
           metrics.curriculumScore >= 0.6 && 
           metrics.logicalScore >= 0.7;
  }

  /**
   * Check if generation for this context happened too recently
   */
  private async checkRecentGeneration(context: GenerationContext): Promise<{
    tooFrequent: boolean;
    lastGeneration?: string;
  }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('templates')
        .select('created_at')
        .eq('grade', context.grade)
        .eq('domain', context.domain)
        .eq('difficulty', context.difficulty)
        .eq('question_type', context.questionType)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);

      if (error) throw error;

      return {
        tooFrequent: (data && data.length > 0),
        lastGeneration: data?.[0]?.created_at
      };
    } catch (error) {
      console.warn('Fehler beim Prüfen der Generierungsfrequenz:', error);
      return { tooFrequent: false };
    }
  }

  /**
   * Check if template pool is oversaturated for this context
   */
  private async checkPoolSaturation(context: GenerationContext): Promise<{
    oversaturated: boolean;
    count: number;
    maxRecommended: number;
  }> {
    try {
      const { count, error } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('grade', context.grade)
        .eq('domain', context.domain)
        .eq('difficulty', context.difficulty)
        .eq('question_type', context.questionType)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      const maxRecommended = 25; // Recommended maximum per combination
      
      return {
        oversaturated: (count || 0) > maxRecommended,
        count: count || 0,
        maxRecommended
      };
    } catch (error) {
      console.warn('Fehler beim Prüfen der Pool-Sättigung:', error);
      return { oversaturated: false, count: 0, maxRecommended: 25 };
    }
  }

  /**
   * Analyze user performance for adaptive difficulty
   */
  private async analyzeUserPerformance(userId: string, context: GenerationContext): Promise<{
    suggestEasier: boolean;
    suggestHarder: boolean;
    averageScore: number;
  }> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('learning_sessions')
        .select('correct_answers, total_questions')
        .eq('user_id', userId)
        .eq('grade', context.grade)
        .eq('category', context.domain.toLowerCase())
        .gte('created_at', oneWeekAgo)
        .limit(10);

      if (error || !data || data.length === 0) {
        return { suggestEasier: false, suggestHarder: false, averageScore: 0.5 };
      }

      const totalCorrect = data.reduce((sum, session) => sum + session.correct_answers, 0);
      const totalQuestions = data.reduce((sum, session) => sum + session.total_questions, 0);
      const averageScore = totalQuestions > 0 ? totalCorrect / totalQuestions : 0.5;

      return {
        suggestEasier: averageScore < 0.6, // Struggling user
        suggestHarder: averageScore > 0.85, // High performer
        averageScore
      };
    } catch (error) {
      console.warn('Fehler bei der Leistungsanalyse:', error);
      return { suggestEasier: false, suggestHarder: false, averageScore: 0.5 };
    }
  }

  /**
   * Store quality metrics for tracking and analytics
   */
  private async storeQualityMetrics(templateId: string, metrics: QualityMetrics): Promise<void> {
    try {
      await supabase
        .from('question_quality_metrics')
        .insert({
          question_id: parseInt(templateId) || 0,
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          grade: 1, // Will be updated with actual grade
          category: 'system_validation',
          session_id: `validation_${Date.now()}`,
          overall_score: metrics.overallScore,
          dimension_scores: {
            content: metrics.contentScore,
            curriculum: metrics.curriculumScore,
            logical: metrics.logicalScore
          },
          confidence_level: metrics.overallScore
        });
    } catch (error) {
      console.warn('Fehler beim Speichern der Qualitätsmetriken:', error);
    }
  }

  /**
   * Get quality statistics for dashboard
   */
  async getQualityStatistics(days: number = 7): Promise<{
    totalValidated: number;
    averageScore: number;
    approvalRate: number;
    topIssues: Array<{ issue: string; count: number }>;
  }> {
    try {
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('question_quality_metrics')
        .select('overall_score, dimension_scores')
        .eq('category', 'system_validation')
        .gte('created_at', daysAgo);

      if (error || !data) {
        return { totalValidated: 0, averageScore: 0, approvalRate: 0, topIssues: [] };
      }

      const totalValidated = data.length;
      const averageScore = data.reduce((sum, item) => sum + item.overall_score, 0) / totalValidated;
      const approved = data.filter(item => item.overall_score >= 0.6).length;
      const approvalRate = approved / totalValidated;

      return {
        totalValidated,
        averageScore,
        approvalRate,
        topIssues: [] // TODO: Implement from validation results
      };
    } catch (error) {
      console.warn('Fehler beim Abrufen der Qualitätsstatistiken:', error);
      return { totalValidated: 0, averageScore: 0, approvalRate: 0, topIssues: [] };
    }
  }
}

export const templateQualityPipeline = TemplateQualityPipeline.getInstance();