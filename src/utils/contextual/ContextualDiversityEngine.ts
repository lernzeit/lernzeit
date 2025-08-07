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
   */
  async getContextVariants(scenarioFamilyId: string, dimensionType: string): Promise<ContextVariant[]> {
    const { data, error } = await supabase
      .from('context_variants')
      .select('*')
      .eq('scenario_family_id', scenarioFamilyId)
      .eq('dimension_type', dimensionType)
      .order('usage_count'); // Prefer less used variants

    if (error) {
      console.error('Error fetching context variants:', error);
      return [];
    }

    return data || [];
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
   */
  async getSemanticClusters(): Promise<SemanticCluster[]> {
    const { data, error } = await supabase
      .from('semantic_clusters')
      .select('*')
      .eq('category', this.category);

    if (error) {
      console.error('Error fetching semantic clusters:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Generate diverse context combinations avoiding recent contexts
   */
  async generateDiverseContexts(count: number = 5): Promise<ContextCombination[]> {
    const scenarioFamilies = await this.getScenarioFamilies();
    const recentContexts = await this.getUserContextHistory();
    const semanticClusters = await this.getSemanticClusters();

    if (scenarioFamilies.length === 0) {
      console.warn('No scenario families found for category:', this.category);
      return [];
    }

    const generatedContexts: ContextCombination[] = [];
    const usedContextHashes = new Set(recentContexts.map(ctx => this.hashContext(ctx)));
    const usedSemanticClusters = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Select scenario family (rotate through different families)
      const scenarioFamily = scenarioFamilies[i % scenarioFamilies.length];
      const contextSlots = scenarioFamily.context_slots;

      const newContext: ContextCombination = {};

      // Fill each context slot with diverse values
      for (const [slotType, _] of Object.entries(contextSlots)) {
        const variants = await this.getContextVariants(scenarioFamily.id, slotType);
        
        if (variants.length === 0) continue;

        // Prioritize variants from unused semantic clusters
        const diverseVariant = this.selectDiverseVariant(
          variants, 
          usedSemanticClusters,
          semanticClusters
        );

        if (diverseVariant) {
          newContext[slotType] = diverseVariant.value;
          if (diverseVariant.semantic_cluster) {
            usedSemanticClusters.add(diverseVariant.semantic_cluster);
          }
        }
      }

      // Check if this context combination is sufficiently different
      const contextHash = this.hashContext(newContext);
      if (!usedContextHashes.has(contextHash) && Object.keys(newContext).length > 0) {
        generatedContexts.push(newContext);
        usedContextHashes.add(contextHash);
      }
    }

    return generatedContexts;
  }

  /**
   * Select a variant that maximizes diversity
   */
  private selectDiverseVariant(
    variants: ContextVariant[], 
    usedClusters: Set<string>,
    semanticClusters: SemanticCluster[]
  ): ContextVariant | null {
    if (variants.length === 0) return null;

    // First, try to find variants from unused semantic clusters
    const unusedClusterVariants = variants.filter(variant => 
      variant.semantic_cluster && !usedClusters.has(variant.semantic_cluster)
    );

    if (unusedClusterVariants.length > 0) {
      // Sort by quality and usage (prefer high quality, low usage)
      return unusedClusterVariants.sort((a, b) => 
        (b.quality_score - a.quality_score) || (a.usage_count - b.usage_count)
      )[0];
    }

    // If all clusters are used, pick the least used variant
    return variants.sort((a, b) => 
      (b.quality_score - a.quality_score) || (a.usage_count - b.usage_count)
    )[0];
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

      // Update usage counts for the used variants
      for (const [dimensionType, value] of Object.entries(context)) {
        if (value) {
          await this.incrementVariantUsage(scenarioFamilyId, dimensionType, value);
        }
      }
    } catch (error) {
      console.error('Error recording context usage:', error);
    }
  }

  /**
   * Increment usage count for a specific context variant
   */
  private async incrementVariantUsage(
    scenarioFamilyId: string, 
    dimensionType: string, 
    value: string
  ): Promise<void> {
    try {
      // Manual update since RPC doesn't exist yet
      const { data: variants } = await supabase
        .from('context_variants')
        .select('id, usage_count')
        .eq('scenario_family_id', scenarioFamilyId)
        .eq('dimension_type', dimensionType)
        .eq('value', value)
        .limit(1);

      if (variants && variants.length > 0) {
        await supabase
          .from('context_variants')
          .update({ usage_count: variants[0].usage_count + 1 })
          .eq('id', variants[0].id);
      }
    } catch (error) {
      console.error('Error incrementing variant usage:', error);
    }
  }

  /**
   * Calculate diversity metrics for user's recent contexts
   */
  async calculateDiversityMetrics(days: number = 7): Promise<DiversityMetrics> {
    const recentContexts = await this.getUserContextHistory(days);
    const scenarioFamilies = await this.getScenarioFamilies();
    const semanticClusters = await this.getSemanticClusters();

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

    // Calculate Semantic Distance Score (SDS)
    const sds = this.calculateSemanticDistanceScore(recentContexts, semanticClusters);

    // Calculate Scenario Family Coverage (SFC)
    const usedFamilies = new Set(); // Would need to track which families were used
    const sfc = scenarioFamilies.length > 0 ? usedFamilies.size / scenarioFamilies.length : 0;

    // Calculate User Engagement Score (UES) - placeholder for now
    const ues = Math.max(0, 1 - crr) * sds * (sfc + 0.1); // Boost by SDS and SFC

    return { context_repetition_rate: crr, semantic_distance_score: sds, scenario_family_coverage: sfc, user_engagement_score: ues };
  }

  /**
   * Calculate semantic distance score between recent contexts
   */
  private calculateSemanticDistanceScore(
    contexts: ContextCombination[], 
    semanticClusters: SemanticCluster[]
  ): number {
    if (contexts.length < 2) return 1;

    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < contexts.length - 1; i++) {
      for (let j = i + 1; j < contexts.length; j++) {
        const distance = this.calculateContextDistance(contexts[i], contexts[j], semanticClusters);
        totalDistance += distance;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDistance / comparisons : 1;
  }

  /**
   * Calculate distance between two contexts based on semantic clusters
   */
  private calculateContextDistance(
    context1: ContextCombination, 
    context2: ContextCombination,
    semanticClusters: SemanticCluster[]
  ): number {
    const dimensions = new Set([...Object.keys(context1), ...Object.keys(context2)]);
    let totalDistance = 0;
    let validDimensions = 0;

    for (const dimension of dimensions) {
      const value1 = context1[dimension];
      const value2 = context2[dimension];

      if (value1 && value2) {
        const cluster1 = this.findSemanticCluster(value1, dimension, semanticClusters);
        const cluster2 = this.findSemanticCluster(value2, dimension, semanticClusters);

        if (cluster1 && cluster2) {
          // Same cluster = low distance, different clusters = high distance
          totalDistance += cluster1 === cluster2 ? 0.2 : 1.0;
        } else {
          // Direct string comparison fallback
          totalDistance += value1 === value2 ? 0.1 : 0.8;
        }
        validDimensions++;
      }
    }

    return validDimensions > 0 ? totalDistance / validDimensions : 0;
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
   * Store diversity metrics for tracking over time
   */
  async storeDiversityMetrics(metrics: DiversityMetrics): Promise<void> {
    try {
      await supabase
        .from('context_diversity_metrics')
        .upsert({
          user_id: this.userId,
          category: this.category,
          grade: this.grade,
          session_date: new Date().toISOString().split('T')[0], // Today's date
          context_repetition_rate: metrics.context_repetition_rate,
          semantic_distance_score: metrics.semantic_distance_score,
          scenario_family_coverage: metrics.scenario_family_coverage,
          user_engagement_score: metrics.user_engagement_score,
          total_questions: 0, // Would be updated separately
          unique_contexts: 0   // Would be updated separately
        });
    } catch (error) {
      console.error('Error storing diversity metrics:', error);
    }
  }

  /**
   * Generate a hash for a context combination for quick comparison
   */
  protected hashContext(context: ContextCombination): string {
    const sorted = Object.keys(context)
      .sort()
      .map(key => `${key}:${context[key]}`)
      .join('|');
    
    // Simple hash function (could be replaced with crypto.subtle.digest in production)
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