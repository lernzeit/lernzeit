import { supabase } from "@/integrations/supabase/client";

export interface ContextCombination {
  location?: string;
  character?: string;
  activity?: string;
  objects?: string;
  time_setting?: string;
  [key: string]: string | undefined;
}

export interface ScenarioFamily {
  id: string;
  name: string;
  category: string;
  grade_min: number;
  grade_max: number;
  base_template: string;
  context_slots: any; // JSONB type from database
  difficulty_level: string; // Database returns string
}

export interface ContextVariant {
  id: string;
  scenario_family_id: string;
  dimension_type: string;
  value: string;
  semantic_cluster?: string;
  usage_count: number;
  quality_score: number;
}

export interface SemanticCluster {
  id: string;
  cluster_name: string;
  dimension_type: string;
  category: string;
  representative_terms: string[];
  semantic_distance_threshold: number;
}

export interface DiversityMetrics {
  context_repetition_rate: number; // CRR - lower is better
  semantic_distance_score: number; // SDS - higher is better  
  scenario_family_coverage: number; // SFC - higher is better
  user_engagement_score: number; // UES - higher is better
}

export class ContextualDiversityEngine {
  protected userId: string;
  protected category: string;
  protected grade: number;

  constructor(userId: string, category: string, grade: number) {
    this.userId = userId;
    this.category = category;
    this.grade = grade;
  }

  /**
   * Get appropriate scenario families for the current category and grade
   */
  async getScenarioFamilies(): Promise<ScenarioFamily[]> {
    const { data, error } = await supabase
      .from('scenario_families')
      .select('*')
      .eq('category', this.category)
      .lte('grade_min', this.grade)
      .gte('grade_max', this.grade)
      .order('difficulty_level');

    if (error) {
      console.error('Error fetching scenario families:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get context variants for a specific scenario family and dimension
   * NOTE: context_variants table doesn't exist yet - returning empty array
   */
  async getContextVariants(scenarioFamilyId: string, dimensionType: string): Promise<ContextVariant[]> {
    console.warn('⚠️ getContextVariants: context_variants table not implemented yet');
    return [];
  }

  /**
   * Get user's recent context history to avoid repetition
   */
  async getUserContextHistory(days: number = 7): Promise<ContextCombination[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('user_context_history')
      .select('context_combination')
      .eq('user_id', this.userId)
      .eq('category', this.category)
      .eq('grade', this.grade)
      .gte('session_date', cutoffDate.toISOString())
      .order('session_date', { ascending: false });

    if (error) {
      console.error('Error fetching user context history:', error);
      return [];
    }

    return data?.map(item => item.context_combination as ContextCombination) || [];
  }

  /**
   * Get semantic clusters for better diversity tracking
   * NOTE: semantic_clusters table doesn't exist yet - returning empty array
   */
  async getSemanticClusters(): Promise<SemanticCluster[]> {
    console.warn('⚠️ getSemanticClusters: semantic_clusters table not implemented yet');
    return [];
  }

  /**
   * Generate diverse context combinations avoiding recent contexts
   * NOTE: Simplified implementation due to missing tables
   */
  async generateDiverseContexts(count: number = 5): Promise<ContextCombination[]> {
    const scenarioFamilies = await this.getScenarioFamilies();
    const recentContexts = await this.getUserContextHistory();

    if (scenarioFamilies.length === 0) {
      console.warn('No scenario families found for category:', this.category);
      // Return basic contexts as fallback
      return Array.from({ length: count }, (_, i) => ({
        location: `context_${i}`,
        character: `person_${i}`,
        activity: `activity_${i}`
      }));
    }

    const generatedContexts: ContextCombination[] = [];
    const usedContextHashes = new Set(recentContexts.map(ctx => this.hashContext(ctx)));

    for (let i = 0; i < count; i++) {
      const scenarioFamily = scenarioFamilies[i % scenarioFamilies.length];
      const contextSlots = scenarioFamily.context_slots;

      const newContext: ContextCombination = {};

      // Fill context slots based on scenario family structure
      for (const [slotType, _] of Object.entries(contextSlots || {})) {
        newContext[slotType] = `${slotType}_${i}`;
      }

      const contextHash = this.hashContext(newContext);
      if (!usedContextHashes.has(contextHash) && Object.keys(newContext).length > 0) {
        generatedContexts.push(newContext);
        usedContextHashes.add(contextHash);
      }
    }

    return generatedContexts;
  }

  /**
   * Record context usage for future diversity calculations
   */
  async recordContextUsage(
    context: ContextCombination, 
    scenarioFamilyId: string,
    questionId?: string
  ): Promise<void> {
    const contextHash = this.hashContext(context);

    try {
      await supabase
        .from('user_context_history')
        .insert({
          user_id: this.userId,
          scenario_family_id: scenarioFamilyId,
          context_combination: context,
          context_hash: contextHash,
          category: this.category,
          grade: this.grade,
          question_id: questionId,
          session_date: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording context usage:', error);
    }
  }

  /**
   * Calculate diversity metrics for user's recent contexts
   */
  async calculateDiversityMetrics(days: number = 7): Promise<DiversityMetrics> {
    const recentContexts = await this.getUserContextHistory(days);
    const scenarioFamilies = await this.getScenarioFamilies();

    if (recentContexts.length === 0) {
      return {
        context_repetition_rate: 0,
        semantic_distance_score: 1,
        scenario_family_coverage: 0,
        user_engagement_score: 0
      };
    }

    // Calculate Context Repetition Rate (CRR)
    const uniqueContexts = new Set(recentContexts.map(ctx => this.hashContext(ctx)));
    const crr = 1 - (uniqueContexts.size / recentContexts.length);

    // Calculate Semantic Distance Score (simplified)
    const sds = Math.min(1, uniqueContexts.size / Math.max(1, recentContexts.length));

    // Calculate Scenario Family Coverage (SFC)
    const sfc = scenarioFamilies.length > 0 ? uniqueContexts.size / scenarioFamilies.length : 0;

    // Calculate User Engagement Score (UES)
    const ues = Math.max(0, 1 - crr) * sds * (sfc + 0.1);

    return { context_repetition_rate: crr, semantic_distance_score: sds, scenario_family_coverage: sfc, user_engagement_score: ues };
  }

  /**
   * Store diversity metrics for tracking over time
   * NOTE: context_diversity_metrics table doesn't exist yet
   */
  async storeDiversityMetrics(metrics: DiversityMetrics): Promise<void> {
    console.warn('⚠️ storeDiversityMetrics: context_diversity_metrics table not implemented yet');
  }

  /**
   * Find which semantic cluster a value belongs to
   */
  protected findSemanticCluster(
    value: string, 
    dimensionType: string, 
    semanticClusters: SemanticCluster[]
  ): string | null {
    const cluster = semanticClusters.find(cluster => 
      cluster.dimension_type === dimensionType && 
      cluster.representative_terms.includes(value)
    );
    return cluster ? cluster.cluster_name : null;
  }

  /**
   * Generate a hash for a context combination for quick comparison
   */
  protected hashContext(context: ContextCombination): string {
    const sorted = Object.keys(context)
      .sort()
      .map(key => `${key}:${context[key]}`)
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Fill a template with context values
   */
  fillTemplate(template: string, context: ContextCombination): string {
    let filledTemplate = template;
    
    for (const [key, value] of Object.entries(context)) {
      if (value) {
        const placeholder = `{${key}}`;
        filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
      }
    }
    
    return filledTemplate;
  }

  /**
   * Get enhanced prompt instructions for AI generation with context diversity
   */
  getEnhancedPromptInstructions(excludedContexts: ContextCombination[] = []): string {
    const excludedInstructions = excludedContexts.length > 0 
      ? `\n🚫 VERMEIDE DIESE KONTEXTE:\n${excludedContexts.map((ctx, i) => 
          `${i+1}. ${Object.entries(ctx).map(([k,v]) => `${k}:${v}`).join(', ')}`
        ).join('\n')}`
      : '';

    return `
KONTEXTUELLE VIELFALT - WICHTIGE REGELN:

📍 LOCATION DIVERSITY: Nutze verschiedene Orte - nicht nur "Bäckerei" oder "Korb"
  • Geschäfte: Bäckerei, Markt, Laden, Restaurant, Apotheke
  • Bildung: Schule, Bibliothek, Museum, Klassenzimmer
  • Draußen: Park, Strand, Wald, Spielplatz, Garten
  • Zuhause: Küche, Wohnzimmer, Kinderzimmer

🎭 CHARACTER DIVERSITY: Wechsle zwischen verschiedenen Personen
  • Familie: Mama, Papa, Oma, Geschwister
  • Berufe: Lehrer, Bäcker, Verkäufer, Koch, Gärtner
  • Kinder: Student, Schüler, Freunde

🎯 ACTIVITY DIVERSITY: Variiere die Tätigkeiten
  • Kaufen, sammeln, sortieren, bauen, teilen
  • Lernen, spielen, kochen, pflanzen, organisieren

🎲 OBJECT DIVERSITY: Wechsle die Gegenstände
  • Lebensmittel: nicht nur Äpfel! Auch Brot, Kekse, Gemüse
  • Spielzeug: Bälle, Puppen, Bausteine, Puzzle
  • Schulsachen: Bücher, Stifte, Hefte, Radiergummi

${excludedInstructions}

⚡ KREATIVITÄTS-BOOST: Kombiniere ungewöhnliche aber sinnvolle Kontexte für maximale Vielfalt!
`;
  }
}