import { supabase } from '@/integrations/supabase/client';
import { SessionDuplicatePrevention } from './SessionDuplicatePrevention';

interface RotationStrategy {
  userId: string;
  grade: number;
  category: string;
  sessionId?: string;
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
  enforceTypeDiversity?: boolean;
}

interface TemplateRotationResult {
  template: any;
  rotationReason: string;
  diversityScore: number;
  qualityScore: number;
}

export class TemplateRotator {
  private static readonly ROTATION_WEIGHTS = {
    quality: 0.3,      // 30% quality score
    freshness: 0.25,   // 25% how recently used
    difficulty: 0.2,   // 20% difficulty match
    diversity: 0.25    // 25% type diversity
  };

  static async getOptimalTemplate(
    options: RotationStrategy
  ): Promise<TemplateRotationResult | null> {
    const {
      userId,
      grade,
      category,
      sessionId,
      preferredDifficulty = 'medium',
      enforceTypeDiversity = true
    } = options;

    console.log(`🔄 Template rotation for user ${userId}, grade ${grade}, category ${category}`);

    try {
      // Step 1: Get available templates
      const availableTemplates = await this.getAvailableTemplates(
        grade,
        category,
        userId,
        sessionId
      );

      if (availableTemplates.length === 0) {
        console.warn('⚠️ No available templates for rotation');
        return null;
      }

      // Step 2: Score templates based on rotation strategy
      const scoredTemplates = await this.scoreTemplates(
        availableTemplates,
        userId,
        preferredDifficulty,
        sessionId,
        enforceTypeDiversity
      );

      // Step 3: Select best template
      const bestTemplate = scoredTemplates[0];
      if (!bestTemplate) {
        console.warn('⚠️ No suitable template found after scoring');
        return null;
      }

      // Step 4: Mark as used and return
      if (sessionId) {
        SessionDuplicatePrevention.markTemplateUsed(sessionId, bestTemplate.template.id);
      }

      console.log(`✅ Selected template: ${bestTemplate.template.id} (score: ${bestTemplate.totalScore.toFixed(2)})`);

      return {
        template: bestTemplate.template,
        rotationReason: bestTemplate.reason,
        diversityScore: bestTemplate.diversityScore,
        qualityScore: bestTemplate.template.quality_score || 0
      };

    } catch (error) {
      console.error('❌ Template rotation error:', error);
      return null;
    }
  }

  private static async getAvailableTemplates(
    grade: number,
    category: string,
    userId: string,
    sessionId?: string
  ): Promise<any[]> {
    // Get templates for the category (assuming category maps to domain)
    const domainMap = {
      'math': 'Zahlen & Operationen',
      'mathematik': 'Zahlen & Operationen',
      'geometry': 'Raum & Form',
      'measurement': 'Größen & Messen',
      'data': 'Daten & Zufall'
    };

    const domain = domainMap[category as keyof typeof domainMap] || 'Zahlen & Operationen';

    let query = supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('grade', grade)
      .eq('domain', domain)
      .gte('quality_score', 0.6) // Minimum quality threshold
      .order('quality_score', { ascending: false });

    const { data: templates, error } = await query;
    
    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    // Filter out recently used templates if session exists
    if (sessionId && templates) {
      const sessionStats = SessionDuplicatePrevention.getSessionStats(sessionId);
      if (sessionStats) {
        return templates.filter(template => 
          !Array.from(sessionStats.templatesUsed || []).includes(template.id)
        );
      }
    }

    return templates || [];
  }

  private static async scoreTemplates(
    templates: any[],
    userId: string,
    preferredDifficulty: string,
    sessionId?: string,
    enforceTypeDiversity = true
  ): Promise<Array<{
    template: any;
    totalScore: number;
    qualityScore: number;
    freshnessScore: number;
    difficultyScore: number;
    diversityScore: number;
    reason: string;
  }>> {
    const scoredTemplates = [];

    // Get user's recent template usage
    const recentUsage = await this.getUserRecentUsage(userId);
    const sessionStats = sessionId ? SessionDuplicatePrevention.getSessionStats(sessionId) : null;

    for (const template of templates) {
      const scores = {
        quality: this.calculateQualityScore(template),
        freshness: this.calculateFreshnessScore(template, recentUsage),
        difficulty: this.calculateDifficultyScore(template, preferredDifficulty),
        diversity: enforceTypeDiversity ? 
          this.calculateDiversityScore(template, sessionStats) : 0.5
      };

      const totalScore = 
        scores.quality * this.ROTATION_WEIGHTS.quality +
        scores.freshness * this.ROTATION_WEIGHTS.freshness +
        scores.difficulty * this.ROTATION_WEIGHTS.difficulty +
        scores.diversity * this.ROTATION_WEIGHTS.diversity;

      const reason = this.generateRotationReason(scores, template);

      scoredTemplates.push({
        template,
        totalScore,
        qualityScore: scores.quality,
        freshnessScore: scores.freshness,
        difficultyScore: scores.difficulty,
        diversityScore: scores.diversity,
        reason
      });
    }

    // Sort by total score (highest first)
    return scoredTemplates.sort((a, b) => b.totalScore - a.totalScore);
  }

  private static calculateQualityScore(template: any): number {
    // Base quality score from template
    let score = template.quality_score || 0.5;

    // Bonus for good user feedback
    if (template.plays > 0) {
      const successRate = template.correct / template.plays;
      score = (score + successRate) / 2;
    }

    // Bonus for recent validation
    if (template.last_validated) {
      const daysSinceValidation = (Date.now() - new Date(template.last_validated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceValidation < 7) {
        score *= 1.1; // 10% bonus for recently validated
      }
    }

    return Math.min(1, Math.max(0, score));
  }

  private static calculateFreshnessScore(template: any, recentUsage: Map<string, number>): number {
    const timesUsedRecently = recentUsage.get(template.id) || 0;
    
    // Higher score for less recently used templates
    if (timesUsedRecently === 0) return 1.0;
    if (timesUsedRecently === 1) return 0.8;
    if (timesUsedRecently === 2) return 0.6;
    if (timesUsedRecently === 3) return 0.4;
    return 0.2;
  }

  private static calculateDifficultyScore(template: any, preferredDifficulty: string): number {
    const difficultyMatch = {
      'easy': { 'easy': 1.0, 'medium': 0.7, 'hard': 0.3 },
      'medium': { 'easy': 0.8, 'medium': 1.0, 'hard': 0.8 },
      'hard': { 'easy': 0.3, 'medium': 0.7, 'hard': 1.0 }
    };

    return difficultyMatch[preferredDifficulty as keyof typeof difficultyMatch]?.[template.difficulty as keyof any] || 0.5;
  }

  private static calculateDiversityScore(template: any, sessionStats: any): number {
    if (!sessionStats) return 0.5;

    // Get question types used in current session
    const usedTypes = new Set();
    // This would need session statistics with question types
    // For now, we'll use a simple heuristic
    
    const typeFrequency = {
      'MULTIPLE_CHOICE': 0,
      'FREETEXT': 0,
      'SORT': 0,
      'MATCH': 0
    };

    // Higher score for less used question types
    const currentTypeCount = typeFrequency[template.question_type as keyof typeof typeFrequency] || 0;
    const totalQuestions = Object.values(typeFrequency).reduce((a, b) => a + b, 0);
    
    if (totalQuestions === 0) return 1.0;
    
    const idealRatio = 0.25; // 25% each type
    const currentRatio = currentTypeCount / totalQuestions;
    
    // Score inversely related to how much this type has been overused
    return Math.max(0, 1 - Math.abs(currentRatio - idealRatio) * 2);
  }

  private static generateRotationReason(scores: any, template: any): string {
    const reasons = [];
    
    if (scores.quality > 0.8) reasons.push('High quality');
    if (scores.freshness > 0.8) reasons.push('Fresh content');
    if (scores.difficulty > 0.8) reasons.push('Perfect difficulty match');
    if (scores.diversity > 0.8) reasons.push('Good type diversity');
    
    if (reasons.length === 0) {
      reasons.push('Best available option');
    }
    
    return reasons.join(', ');
  }

  private static async getUserRecentUsage(userId: string): Promise<Map<string, number>> {
    const usage = new Map<string, number>();

    try {
      // Get user's template usage from the last 24 hours
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // This would require a template_usage tracking table
      // For now, we'll return an empty map
      
      return usage;
    } catch (error) {
      console.error('Error fetching user recent usage:', error);
      return usage;
    }
  }

  static async rotateTemplatePool(grade: number, domain: string): Promise<void> {
    console.log(`🔄 Rotating template pool for Grade ${grade}, ${domain}`);

    try {
      // Archive low-performing templates
      const { data: lowPerformers, error: queryError } = await supabase
        .from('templates')
        .select('id, quality_score, plays, correct')
        .eq('grade', grade)
        .eq('domain', domain)
        .eq('status', 'ACTIVE')
        .lt('quality_score', 0.5);

      if (queryError) throw queryError;

      if (lowPerformers && lowPerformers.length > 0) {
        const archiveIds = lowPerformers
          .filter(t => t.plays > 10 && (t.correct / t.plays) < 0.4) // Only archive if enough data
          .map(t => t.id);

        if (archiveIds.length > 0) {
          const { error: archiveError } = await supabase
            .from('templates')
            .update({ status: 'ARCHIVED' })
            .in('id', archiveIds);

          if (archiveError) throw archiveError;
          
          console.log(`📦 Archived ${archiveIds.length} low-performing templates`);
        }
      }

      // Request new templates if pool is getting low
      const { data: activeTemplates, error: countError } = await supabase
        .from('templates')
        .select('id')
        .eq('grade', grade)
        .eq('domain', domain)
        .eq('status', 'ACTIVE');

      if (countError) throw countError;

      const activeCount = activeTemplates?.length || 0;
      if (activeCount < 30) { // Minimum threshold
        console.log(`📊 Template pool low (${activeCount}), requesting generation...`);
        
        // Trigger generation for this specific combination
        await supabase.functions.invoke('batch-generate-questions', {
          body: {
            grade,
            domain,
            batchSize: 20,
            prioritizeGaps: true
          }
        });
      }

    } catch (error) {
      console.error('❌ Template pool rotation error:', error);
    }
  }

  static async getRotationStatistics(grade: number): Promise<any> {
    try {
      const { data: templates, error } = await supabase
        .from('templates')
        .select('id, domain, difficulty, question_type, quality_score, plays, correct, status')
        .eq('grade', grade);

      if (error) throw error;

      const stats = {
        total: templates?.length || 0,
        active: templates?.filter(t => t.status === 'ACTIVE').length || 0,
        archived: templates?.filter(t => t.status === 'ARCHIVED').length || 0,
        byDomain: {} as Record<string, number>,
        byDifficulty: {} as Record<string, number>,
        byQuestionType: {} as Record<string, number>,
        averageQuality: 0,
        averageSuccessRate: 0
      };

      if (templates && templates.length > 0) {
        templates.forEach(template => {
          stats.byDomain[template.domain] = (stats.byDomain[template.domain] || 0) + 1;
          stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1;
          stats.byQuestionType[template.question_type] = (stats.byQuestionType[template.question_type] || 0) + 1;
        });

        const activeTemplates = templates.filter(t => t.status === 'ACTIVE');
        if (activeTemplates.length > 0) {
          stats.averageQuality = activeTemplates.reduce((sum, t) => sum + (t.quality_score || 0), 0) / activeTemplates.length;
          
          const templatesWithPlays = activeTemplates.filter(t => t.plays > 0);
          if (templatesWithPlays.length > 0) {
            stats.averageSuccessRate = templatesWithPlays.reduce((sum, t) => sum + (t.correct / t.plays), 0) / templatesWithPlays.length;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('Error fetching rotation statistics:', error);
      return null;
    }
  }
}