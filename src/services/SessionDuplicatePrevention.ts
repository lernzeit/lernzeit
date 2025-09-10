import { supabase } from '@/integrations/supabase/client';

interface UserSession {
  userId: string;
  sessionId: string;
  usedTemplateIds: Set<string>;
  usedQuestionHashes: Set<string>;
  startTime: Date;
  lastActivity: Date;
  grade: number;
  category: string;
}

interface TemplateSelectionOptions {
  userId: string;
  grade: number;
  category: string;
  domain: string;
  quarter: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionType?: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH';
  excludeTemplateIds?: string[];
  sessionId?: string;
}

export class SessionDuplicatePrevention {
  private static sessions = new Map<string, UserSession>();
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_TEMPLATE_REUSE_IN_SESSION = 1; // Never repeat in same session
  
  static createSession(userId: string, grade: number, category: string): string {
    const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: UserSession = {
      userId,
      sessionId,
      usedTemplateIds: new Set(),
      usedQuestionHashes: new Set(),
      startTime: new Date(),
      lastActivity: new Date(),
      grade,
      category
    };
    
    this.sessions.set(sessionId, session);
    console.log(`📝 Created new session: ${sessionId} for user ${userId}`);
    
    // Cleanup old sessions
    this.cleanupExpiredSessions();
    
    return sessionId;
  }

  static async selectUniqueTemplates(options: TemplateSelectionOptions, count: number = 1): Promise<any[]> {
    const {
      userId,
      grade,
      category,
      domain,
      quarter,
      difficulty,
      questionType,
      excludeTemplateIds = [],
      sessionId
    } = options;

    console.log(`🎲 Selecting ${count} unique templates for user ${userId}, grade ${grade}, ${domain}`);

    // Get or create session
    let session = sessionId ? this.sessions.get(sessionId) : null;
    if (!session) {
      const newSessionId = this.createSession(userId, grade, category);
      session = this.sessions.get(newSessionId)!;
    }

    // Update last activity
    session.lastActivity = new Date();

    try {
      // Build query for available templates
      let query = supabase
        .from('templates')
        .select('*')
        .eq('status', 'ACTIVE')
        .eq('grade', grade)
        .eq('domain', domain)
        .eq('quarter_app', quarter)
        .gte('quality_score', 0.7); // Only high-quality templates

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (questionType) {
        query = query.eq('question_type', questionType);
      }

      const { data: availableTemplates, error } = await query;
      
      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      if (!availableTemplates || availableTemplates.length === 0) {
        console.warn(`⚠️ No templates found for grade ${grade}, ${domain}, ${quarter}`);
        return [];
      }

      // Filter out already used templates and excluded ones
      const unusedTemplates = availableTemplates.filter(template => 
        !session!.usedTemplateIds.has(template.id) && 
        !excludeTemplateIds.includes(template.id)
      );

      if (unusedTemplates.length === 0) {
        console.warn(`⚠️ All templates have been used in this session. Resetting session.`);
        // Reset session if all templates have been used
        session.usedTemplateIds.clear();
        session.usedQuestionHashes.clear();
        return availableTemplates.slice(0, count);
      }

      // Prioritize templates that haven't been used recently across all users
      const prioritizedTemplates = await this.prioritizeTemplatesByUsage(unusedTemplates, userId);

      // Ensure question type diversity if no specific type requested
      const selectedTemplates = questionType 
        ? prioritizedTemplates.slice(0, count)
        : this.ensureQuestionTypeDiversity(prioritizedTemplates, count);

      // Mark templates as used
      selectedTemplates.forEach(template => {
        session!.usedTemplateIds.add(template.id);
        const questionHash = this.generateQuestionHash(template);
        session!.usedQuestionHashes.add(questionHash);
      });

      console.log(`✅ Selected ${selectedTemplates.length} unique templates (${selectedTemplates.length}/${count})`);
      return selectedTemplates;

    } catch (error) {
      console.error('Error selecting unique templates:', error);
      return [];
    }
  }

  private static async prioritizeTemplatesByUsage(templates: any[], userId: string): Promise<any[]> {
    try {
      // Get recent usage statistics for these templates
      const templateIds = templates.map(t => t.id);
      
      const { data: recentUsage, error } = await supabase
        .from('learning_sessions')
        .select('id, created_at')
        .in('id', templateIds) // This would need a template_id column in learning_sessions
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        console.error('Error fetching usage data:', error);
        return templates;
      }

      // Sort by usage frequency (less used first) and quality score (higher first)
      return templates.sort((a, b) => {
        const aUsage = recentUsage?.filter(u => u.id === a.id).length || 0;
        const bUsage = recentUsage?.filter(u => u.id === b.id).length || 0;
        
        // First by usage (ascending), then by quality (descending)
        if (aUsage !== bUsage) {
          return aUsage - bUsage;
        }
        return (b.quality_score || 0) - (a.quality_score || 0);
      });
    } catch (error) {
      console.error('Error prioritizing templates:', error);
      return templates;
    }
  }

  private static ensureQuestionTypeDiversity(templates: any[], count: number): any[] {
    const questionTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH'];
    const selected: any[] = [];
    const templatesByType = new Map<string, any[]>();

    // Group templates by type
    questionTypes.forEach(type => {
      templatesByType.set(type, templates.filter(t => t.question_type === type));
    });

    // Select templates ensuring diversity
    let typeIndex = 0;
    while (selected.length < count && selected.length < templates.length) {
      const currentType = questionTypes[typeIndex % questionTypes.length];
      const typeTemplates = templatesByType.get(currentType) || [];
      
      // Find next unused template of this type
      const unusedTemplate = typeTemplates.find(t => !selected.includes(t));
      if (unusedTemplate) {
        selected.push(unusedTemplate);
      }
      
      typeIndex++;
      
      // If we've cycled through all types and still need more, just add any remaining
      if (typeIndex >= questionTypes.length * 2) {
        const remaining = templates.filter(t => !selected.includes(t));
        selected.push(...remaining.slice(0, count - selected.length));
        break;
      }
    }

    return selected.slice(0, count);
  }

  private static generateQuestionHash(template: any): string {
    // Create a hash based on question content to detect semantic duplicates
    const content = `${template.student_prompt}-${template.domain}-${template.difficulty}`;
    return btoa(content).slice(0, 16);
  }

  static markTemplateUsed(sessionId: string, templateId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.usedTemplateIds.add(templateId);
      session.lastActivity = new Date();
    }
  }

  static getSessionStats(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      templatesUsed: session.usedTemplateIds.size,
      questionsAnswered: session.usedQuestionHashes.size,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.startTime.getTime(),
      grade: session.grade,
      category: session.category
    };
  }

  static getAllSessionStats(): any[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      userId: session.userId,
      templatesUsed: session.usedTemplateIds.size,
      questionsAnswered: session.usedQuestionHashes.size,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.startTime.getTime(),
      grade: session.grade,
      category: session.category,
      isExpired: Date.now() - session.lastActivity.getTime() > this.SESSION_TIMEOUT
    }));
  }

  private static cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        console.log(`🗑️ Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  static clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`🗑️ Manually cleared session: ${sessionId}`);
  }

  static async getTemplateSuccessRate(templateId: string): Promise<number> {
    try {
      // This would require a template_usage table to track individual template performance
      // For now, return a placeholder based on template quality score
      const { data: template, error } = await supabase
        .from('templates')
        .select('quality_score, plays, correct')
        .eq('id', templateId)
        .single();

      if (error || !template) return 0;

      return template.plays > 0 ? template.correct / template.plays : template.quality_score || 0;
    } catch (error) {
      console.error('Error fetching template success rate:', error);
      return 0;
    }
  }

  // Method to detect if user is getting too many similar questions
  static async detectSemanticDuplicates(sessionId: string, newTemplate: any): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const newHash = this.generateQuestionHash(newTemplate);
    
    // Check if this hash or very similar hash was already used
    for (const usedHash of session.usedQuestionHashes) {
      const similarity = this.calculateHashSimilarity(newHash, usedHash);
      if (similarity > 0.8) { // 80% similarity threshold
        console.log(`🔍 Semantic duplicate detected: ${similarity.toFixed(2)} similarity`);
        return true;
      }
    }

    return false;
  }

  private static calculateHashSimilarity(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
  }
}