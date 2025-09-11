/**
 * Smart Template Selector
 * Anti-repetition system with usage tracking and intelligent selection
 */
import { supabase } from '@/lib/supabase';

export interface TemplateSelectionRequest {
  grade: number;
  quarter: string;
  userId: string;
  count: number;
  domains?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  questionTypes?: string[];
  minDomainDiversity?: number;
}

export interface TemplateSelectionResult {
  templates: any[];
  sessionId: string;
  selectionMetrics: {
    totalAvailable: number;
    domainCoverage: number;
    avgUsageCount: number;
    diversityScore: number;
    antiRepetitionScore: number;
  };
  source: 'smart-selection' | 'fallback';
}

export interface UserTemplateHistory {
  userId: string;
  templateId: string;
  lastUsed: Date;
  usageCount: number;
  performance?: {
    correct: boolean;
    timeSpent: number;
    difficulty: number;
  };
}

class SmartTemplateSelector {
  private readonly USAGE_WEIGHT_FACTOR = 0.7; // Higher = more anti-repetition
  private readonly DIVERSITY_WEIGHT_FACTOR = 0.3; // Higher = more domain diversity
  private readonly MIN_TIME_BETWEEN_SAME_TEMPLATE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  async selectTemplates(request: TemplateSelectionRequest): Promise<TemplateSelectionResult> {
    console.log(`🎯 Smart template selection for Grade ${request.grade} ${request.quarter}`);
    
    try {
      // Get available templates with usage statistics
      const availableTemplates = await this.getAvailableTemplates(request);
      
      if (availableTemplates.length === 0) {
        throw new Error('No templates available for selection criteria');
      }

      // Get user's template history for anti-repetition
      const userHistory = await this.getUserTemplateHistory(request.userId);
      
      // Apply smart selection algorithm
      const selectedTemplates = await this.applySmartSelection(
        availableTemplates,
        userHistory,
        request
      );

      // Update usage statistics
      await this.updateUsageStatistics(selectedTemplates, request.userId);

      const sessionId = `session_${Date.now()}_${request.userId.substring(0, 8)}`;
      
      const selectionMetrics = this.calculateSelectionMetrics(
        selectedTemplates,
        availableTemplates,
        request
      );

      console.log(`✅ Selected ${selectedTemplates.length} templates with diversity score: ${selectionMetrics.diversityScore}`);

      return {
        templates: selectedTemplates,
        sessionId,
        selectionMetrics,
        source: 'smart-selection'
      };
    } catch (error) {
      console.error('Smart selection failed, using fallback:', error);
      return this.fallbackSelection(request);
    }
  }

  private async getAvailableTemplates(request: TemplateSelectionRequest): Promise<any[]> {
    let query = supabase
      .from('templates')
      .select(`
        *,
        plays,
        correct,
        rating_sum,
        rating_count
      `)
      .eq('status', 'ACTIVE')
      .eq('grade', request.grade)
      .gte('quality_score', 0.8); // 🔧 PHASE 1: Raised quality threshold from 0.7 to 0.8

    // Apply quarter filter if curriculum-appropriate
    if (request.quarter !== 'ANY') {
      query = query.eq('quarter_app', request.quarter);
    }

    // Apply domain filter
    if (request.domains && request.domains.length > 0) {
      query = query.in('domain', request.domains);
    }

    // Apply difficulty filter
    if (request.difficulty) {
      query = query.eq('difficulty', request.difficulty);
    }

    // Apply question type filter
    if (request.questionTypes && request.questionTypes.length > 0) {
      query = query.in('question_type', request.questionTypes);
    }

    // 🔧 PHASE 1: Enhanced problematic pattern exclusion
    const problematicKeywords = [
      // Visual/drawing tasks
      'zeichne', 'male', 'konstruiere', 'bild', 'diagramm', 'grafik', 'netz', 'skizziere',
      'bastle', 'schneide', 'klebe', 'falte', 'markiere', 'verbinde mit linien',
      // Circular/impossible tasks  
      'miss dein lineal', 'länge deines lineals', 'wie lang ist dein',
      'miss deinen bleistift', 'größe deines', 'dein alter',
      // Ambiguous assignments
      'ordne richtig zu', 'welches bild passt', 'betrachte das bild'
    ];
    
    for (const keyword of problematicKeywords) {
      query = query.not('student_prompt', 'ilike', `%${keyword}%`);
    }

    // Order by quality and usage (prefer less-used, high-quality templates)
    query = query.order('plays', { ascending: true });

    const { data, error } = await query.limit(500); // Get larger pool for selection

    if (error) {
      console.error('Template fetch error:', error);
      throw error;
    }

    // 🔧 PHASE 1: Additional filtering for feedback-based exclusion
    const filteredData = await this.applyFeedbackBasedFiltering(data || [], request.userId);
    
    return filteredData;
  }

  /**
   * 🔧 PHASE 1: Filter out templates with negative feedback patterns
   */
  private async applyFeedbackBasedFiltering(templates: any[], userId: string): Promise<any[]> {
    if (templates.length === 0) return templates;

    try {
      // Get templates with negative feedback
      const { data: negativeFeedback, error } = await supabase
        .from('question_feedback')
        .select('question_content, feedback_type')
        .eq('user_id', userId)
        .in('feedback_type', ['duplicate', 'inappropriate', 'too_easy', 'too_hard', 'not_curriculum_compliant', 'confusing']);

      if (error || !negativeFeedback) return templates;

      // Create blacklist of problematic question content
      const blacklistedContent = new Set(
        negativeFeedback
          .filter(f => ['confusing', 'inappropriate', 'not_curriculum_compliant'].includes(f.feedback_type))
          .map(f => f.question_content)
      );

      // Filter out blacklisted templates
      const filtered = templates.filter(template => {
        const prompt = template.student_prompt || '';
        
        // Check if this exact content was flagged
        if (blacklistedContent.has(prompt)) {
          console.log(`🚫 Excluded template based on user feedback: ${template.id}`);
          return false;
        }
        
        return true;
      });

      console.log(`🔍 Feedback filtering: ${templates.length} → ${filtered.length} templates (excluded ${templates.length - filtered.length})`);
      return filtered;

    } catch (error) {
      console.warn('Error applying feedback filtering:', error);
      return templates;
    }
  }

  private async getUserTemplateHistory(userId: string): Promise<Map<string, UserTemplateHistory>> {
    // Check recent learning sessions for this user
    const { data: sessions, error } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('session_date', { ascending: false });

    const historyMap = new Map<string, UserTemplateHistory>();

    if (error) {
      console.error('Error fetching user history:', error);
      return historyMap;
    }

    // Process session data to extract template usage patterns
    // Note: This would need actual template tracking in sessions
    sessions?.forEach(session => {
      // This is a simplified version - in reality you'd track individual template usage
      const templateId = `template_${session.category}_${session.grade}`;
      const existing = historyMap.get(templateId);
      
      if (existing) {
        existing.usageCount++;
        existing.lastUsed = new Date(session.session_date);
      } else {
        historyMap.set(templateId, {
          userId,
          templateId,
          lastUsed: new Date(session.session_date),
          usageCount: 1,
          performance: {
            correct: session.correct_answers > session.total_questions / 2,
            timeSpent: session.time_spent,
            difficulty: session.correct_answers / session.total_questions
          }
        });
      }
    });

    return historyMap;
  }

  private async applySmartSelection(
    availableTemplates: any[],
    userHistory: Map<string, UserTemplateHistory>,
    request: TemplateSelectionRequest
  ): Promise<any[]> {
    // Calculate selection scores for each template
    const templatesWithScores = availableTemplates.map(template => {
      const score = this.calculateTemplateScore(template, userHistory, request);
      return { ...template, selectionScore: score };
    });

    // Sort by selection score (higher is better)
    templatesWithScores.sort((a, b) => b.selectionScore - a.selectionScore);

    // Apply domain diversity requirement
    const selectedTemplates = this.applyDomainDiversity(
      templatesWithScores,
      request.count,
      request.minDomainDiversity || Math.min(3, request.count)
    );

    return selectedTemplates.slice(0, request.count);
  }

  private calculateTemplateScore(
    template: any,
    userHistory: Map<string, UserTemplateHistory>,
    request: TemplateSelectionRequest
  ): number {
    let score = 0.5; // Base score

    // Anti-repetition factor (higher score for less-used templates)
    const globalUsage = template.plays || 0;
    const usageScore = Math.max(0, 1 - globalUsage / 100); // Normalize usage
    score += usageScore * this.USAGE_WEIGHT_FACTOR;

    // User history factor (penalize recently used templates)
    const userUsage = userHistory.get(template.id);
    if (userUsage) {
      const daysSinceLastUse = (Date.now() - userUsage.lastUsed.getTime()) / (24 * 60 * 60 * 1000);
      const historyPenalty = Math.max(0, 1 - daysSinceLastUse / 30); // 30-day decay
      score -= historyPenalty * 0.3;

      // Heavy penalty for very recent usage
      if (daysSinceLastUse < 7) {
        score -= 0.5;
      }
    }

    // Quality factor
    const qualityScore = template.quality_score || 0.5;
    score += qualityScore * 0.2;

    // Success rate factor
    const successRate = template.plays > 0 ? (template.correct || 0) / template.plays : 0.5;
    score += successRate * 0.15;

    // Rating factor
    const avgRating = template.rating_count > 0 ? 
      (template.rating_sum || 0) / template.rating_count / 5 : 0.5;
    score += avgRating * 0.1;

    // Curriculum relevance (prefer templates matching exact quarter)
    if (template.quarter_app === request.quarter) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  private applyDomainDiversity(
    templates: any[],
    targetCount: number,
    minDomains: number
  ): any[] {
    const selectedTemplates: any[] = [];
    const domainsUsed = new Set<string>();
    const remainingTemplates = [...templates];

    // Phase 1: Ensure minimum domain diversity
    while (selectedTemplates.length < targetCount && 
           domainsUsed.size < minDomains && 
           remainingTemplates.length > 0) {
      
      // Find best template from unused domain
      const unusedDomainTemplates = remainingTemplates.filter(t => 
        !domainsUsed.has(t.domain)
      );

      if (unusedDomainTemplates.length > 0) {
        const selected = unusedDomainTemplates[0]; // Already sorted by score
        selectedTemplates.push(selected);
        domainsUsed.add(selected.domain);
        
        // Remove from remaining
        const index = remainingTemplates.indexOf(selected);
        remainingTemplates.splice(index, 1);
      } else {
        break; // No more unused domains
      }
    }

    // Phase 2: Fill remaining slots with best available templates
    while (selectedTemplates.length < targetCount && remainingTemplates.length > 0) {
      selectedTemplates.push(remainingTemplates.shift()!);
    }

    return selectedTemplates;
  }

  private async updateUsageStatistics(templates: any[], userId: string): Promise<void> {
    try {
      // Update global usage statistics
      const updates = templates.map(template => ({
        id: template.id,
        plays: (template.plays || 0) + 1
      }));

      // Batch update plays counter
      for (const update of updates) {
        await supabase
          .from('templates')
          .update({ plays: update.plays })
          .eq('id', update.id);
      }

      console.log(`📊 Updated usage statistics for ${templates.length} templates`);
    } catch (error) {
      console.error('Error updating usage statistics:', error);
    }
  }

  private calculateSelectionMetrics(
    selectedTemplates: any[],
    availableTemplates: any[],
    request: TemplateSelectionRequest
  ) {
    const domains = new Set(selectedTemplates.map(t => t.domain));
    const totalUsage = selectedTemplates.reduce((sum, t) => sum + (t.plays || 0), 0);
    
    return {
      totalAvailable: availableTemplates.length,
      domainCoverage: domains.size,
      avgUsageCount: totalUsage / selectedTemplates.length,
      diversityScore: Math.min(1, domains.size / 4), // Normalize to 4 main math domains
      antiRepetitionScore: 1 - (totalUsage / selectedTemplates.length / 100) // Inverse of usage
    };
  }

  private async fallbackSelection(request: TemplateSelectionRequest): Promise<TemplateSelectionResult> {
    console.log('🔄 Using fallback template selection...');
    
    // Simple random selection as fallback
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('grade', request.grade)
      .limit(request.count * 3); // Get more for random selection

    if (error || !data || data.length === 0) {
      throw new Error('No templates available even for fallback');
    }

    // Random shuffle and take requested count
    const shuffled = data.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, request.count);

    return {
      templates: selected,
      sessionId: `fallback_${Date.now()}`,
      selectionMetrics: {
        totalAvailable: data.length,
        domainCoverage: new Set(selected.map(t => t.domain)).size,
        avgUsageCount: 0,
        diversityScore: 0.5,
        antiRepetitionScore: 0.5
      },
      source: 'fallback'
    };
  }

  // Utility methods for specific use cases
  async selectForUser(userId: string, grade: number, quarter: string, count: number = 5): Promise<TemplateSelectionResult> {
    return this.selectTemplates({
      grade,
      quarter,
      userId,
      count,
      minDomainDiversity: Math.min(2, count)
    });
  }

  async selectForDomain(userId: string, grade: number, domain: string, count: number = 5): Promise<TemplateSelectionResult> {
    return this.selectTemplates({
      grade,
      quarter: 'ANY',
      userId,
      count,
      domains: [domain]
    });
  }

  async selectByDifficulty(
    userId: string, 
    grade: number, 
    difficulty: 'easy' | 'medium' | 'hard', 
    count: number = 5
  ): Promise<TemplateSelectionResult> {
    return this.selectTemplates({
      grade,
      quarter: 'ANY',
      userId,
      count,
      difficulty
    });
  }

  // Analytics and monitoring
  async getSelectionStats(userId: string): Promise<any> {
    const { data: sessions, error } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      return { error: error.message };
    }

    return {
      totalSessions: sessions?.length || 0,
      avgPerformance: sessions?.reduce((sum, s) => sum + (s.correct_answers / s.total_questions), 0) / (sessions?.length || 1),
      domains: new Set(sessions?.map(s => s.category)).size,
      lastActivity: sessions?.[0]?.session_date
    };
  }
}

export const smartTemplateSelector = new SmartTemplateSelector();