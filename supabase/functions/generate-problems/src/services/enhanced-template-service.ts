import { DatabaseService } from "./database.ts";
import { logger } from "../utils/logger.ts";
import type { GeneratedTemplate } from "../types.ts";

export interface TemplateMetrics {
  usage_count: number;
  success_rate: number;
  quality_score: number;
  last_used: Date;
  performance_score: number;
}

export interface EnhancedTemplate extends GeneratedTemplate {
  metrics: TemplateMetrics;
  priority_score: number;
}

export class EnhancedTemplateService {
  private databaseService: DatabaseService;
  private templateCache = new Map<string, EnhancedTemplate[]>();
  private lastCacheUpdate = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Get optimized templates for a category and grade
   */
  async getOptimizedTemplates(
    category: string, 
    grade: number, 
    limit: number = 50
  ): Promise<EnhancedTemplate[]> {
    const cacheKey = `${category}_${grade}`;
    const now = Date.now();
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
      if (now - lastUpdate < this.CACHE_TTL) {
        return this.templateCache.get(cacheKey)!.slice(0, limit);
      }
    }

    try {
      // Fetch templates with enhanced scoring
      const templates = await this.fetchAndScoreTemplates(category, grade);
      
      // Update cache
      this.templateCache.set(cacheKey, templates);
      this.lastCacheUpdate.set(cacheKey, now);
      
      return templates.slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch optimized templates', {
        category,
        grade,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch templates and calculate priority scores
   */
  private async fetchAndScoreTemplates(
    category: string, 
    grade: number
  ): Promise<EnhancedTemplate[]> {
    // Get templates from current grade and adjacent grades
    const gradeRange = [grade - 1, grade, grade + 1].filter(g => g >= 1 && g <= 8);
    
    const allTemplates: GeneratedTemplate[] = [];
    
    for (const g of gradeRange) {
      const templates = await this.databaseService.getTemplates(category, g, 100);
      allTemplates.push(...templates);
    }

    // Calculate enhanced metrics and priority scores
    const enhancedTemplates = await Promise.all(
      allTemplates.map(async (template) => {
        const metrics = await this.calculateTemplateMetrics(template);
        const priorityScore = this.calculatePriorityScore(template, metrics, grade);
        
        return {
          ...template,
          metrics,
          priority_score: priorityScore
        } as EnhancedTemplate;
      })
    );

    // Sort by priority score (higher is better)
    return enhancedTemplates
      .filter(t => t.is_active && t.metrics.quality_score > 0.4)
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Calculate comprehensive template metrics
   */
  private async calculateTemplateMetrics(template: GeneratedTemplate): Promise<TemplateMetrics> {
    // Get usage statistics from database
    const usageStats = await this.databaseService.getTemplateUsageStats(template.id);
    
    const daysSinceLastUse = usageStats.last_used 
      ? (Date.now() - new Date(usageStats.last_used).getTime()) / (1000 * 60 * 60 * 24)
      : 30; // Default to 30 days if never used

    const successRate = usageStats.total_uses > 0 
      ? usageStats.successful_uses / usageStats.total_uses 
      : 0.5; // Default neutral success rate

    const performanceScore = this.calculatePerformanceScore(
      template.quality_score,
      successRate,
      daysSinceLastUse,
      usageStats.total_uses
    );

    return {
      usage_count: usageStats.total_uses,
      success_rate: successRate,
      quality_score: template.quality_score,
      last_used: usageStats.last_used ? new Date(usageStats.last_used) : new Date(0),
      performance_score: performanceScore
    };
  }

  /**
   * Calculate priority score for template selection
   */
  private calculatePriorityScore(
    template: GeneratedTemplate, 
    metrics: TemplateMetrics, 
    targetGrade: number
  ): number {
    // Base score from quality
    let score = metrics.quality_score * 100;

    // Grade relevance bonus (exact grade gets highest bonus)
    const gradeDiff = Math.abs(template.grade - targetGrade);
    const gradeBonus = gradeDiff === 0 ? 20 : gradeDiff === 1 ? 10 : 0;
    score += gradeBonus;

    // Success rate bonus
    score += metrics.success_rate * 15;

    // Freshness bonus (prefer less recently used templates)
    const daysSinceLastUse = (Date.now() - metrics.last_used.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessBonus = Math.min(daysSinceLastUse * 0.5, 10);
    score += freshnessBonus;

    // Diversity bonus (prefer less used templates)
    const diversityBonus = Math.max(5 - metrics.usage_count * 0.1, 0);
    score += diversityBonus;

    // Performance bonus
    score += metrics.performance_score * 10;

    return Math.max(score, 0);
  }

  /**
   * Calculate performance score based on multiple factors
   */
  private calculatePerformanceScore(
    qualityScore: number,
    successRate: number,
    daysSinceLastUse: number,
    totalUses: number
  ): number {
    // Weighted combination of factors
    const qualityWeight = 0.4;
    const successWeight = 0.3;
    const freshnessWeight = 0.2;
    const popularityWeight = 0.1;

    const qualityComponent = qualityScore;
    const successComponent = successRate;
    const freshnessComponent = Math.min(daysSinceLastUse / 7, 1); // Normalize to weeks
    const popularityComponent = Math.min(totalUses / 10, 1); // Normalize usage

    return (
      qualityComponent * qualityWeight +
      successComponent * successWeight +
      freshnessComponent * freshnessWeight +
      popularityComponent * popularityWeight
    );
  }

  /**
   * Update template usage statistics
   */
  async updateTemplateUsage(
    templateId: string, 
    wasSuccessful: boolean,
    responseTime?: number
  ): Promise<void> {
    try {
      await this.databaseService.updateTemplateUsage(templateId, wasSuccessful, responseTime);
      
      // Invalidate relevant cache entries
      this.invalidateCache();
    } catch (error) {
      logger.error('Failed to update template usage', {
        templateId,
        wasSuccessful,
        error: error.message
      });
    }
  }

  /**
   * Invalidate template cache
   */
  private invalidateCache(): void {
    this.templateCache.clear();
    this.lastCacheUpdate.clear();
  }

  /**
   * Get template diversity metrics
   */
  async getTemplateVariety(category: string, grade: number): Promise<{
    totalTemplates: number;
    uniqueTypes: number;
    avgQuality: number;
    coverage: number;
  }> {
    const templates = await this.getOptimizedTemplates(category, grade, 1000);
    
    const uniqueTypes = new Set(
      templates.map(t => t.question_type)
    ).size;

    const avgQuality = templates.length > 0 
      ? templates.reduce((sum, t) => sum + t.quality_score, 0) / templates.length
      : 0;

    // Coverage score based on template variety and quality distribution
    const coverage = Math.min(
      (uniqueTypes / 4) * 0.5 + // Max 4 question types
      (avgQuality) * 0.5, 
      1
    );

    return {
      totalTemplates: templates.length,
      uniqueTypes,
      avgQuality,
      coverage
    };
  }
}