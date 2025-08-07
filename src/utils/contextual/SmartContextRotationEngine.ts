import { ContextualDiversityEngine, ContextCombination, ScenarioFamily, ContextVariant } from "./ContextualDiversityEngine";
import { supabase } from "@/integrations/supabase/client";

export interface UserContextPool {
  userId: string;
  category: string;
  grade: number;
  recentContexts: ContextCombination[];
  preferredContexts: ContextCombination[];
  bannedContexts: ContextCombination[];
  lastRotationDate: Date;
}

export interface ContextRotationStrategy {
  name: string;
  weight: number;
  selector: (contexts: ContextCombination[], pool: UserContextPool) => ContextCombination[];
}

export interface MultiContextTemplate {
  id: string;
  name: string;
  category: string;
  grade_range: [number, number];
  context_requirements: {
    primary_context: string; // Main context type (location, character, etc.)
    secondary_contexts: string[]; // Additional context types
    context_relationships: ContextRelationship[];
  };
  template_structure: string;
  question_patterns: QuestionPattern[];
  difficulty_modifiers: DifficultyModifier[];
}

export interface ContextRelationship {
  context1: string;
  context2: string;
  relationship_type: 'compatible' | 'incompatible' | 'enhances' | 'conflicts';
  weight: number;
}

export interface QuestionPattern {
  pattern_id: string;
  question_structure: string;
  context_slots: string[];
  answer_type: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching';
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'number' | 'text' | 'list' | 'context_dependent';
  source: 'context' | 'calculation' | 'predefined';
  constraints?: any;
}

export interface DifficultyModifier {
  grade: number;
  context_complexity: number;
  variable_ranges: Record<string, [number, number]>;
  question_complexity: number;
}

export interface SmartRotationMetrics {
  context_utilization_rate: number;
  rotation_effectiveness: number;
  user_engagement_improvement: number;
  template_variety_score: number;
  cognitive_load_balance: number;
}

export class SmartContextRotationEngine extends ContextualDiversityEngine {
  private userContextPools = new Map<string, UserContextPool>();
  private rotationStrategies: ContextRotationStrategy[] = [];
  private multiContextTemplates = new Map<string, MultiContextTemplate[]>();

  constructor(userId: string, category: string, grade: number) {
    super(userId, category, grade);
    this.initializeRotationStrategies();
  }

  /**
   * Initialize intelligent rotation strategies
   */
  private initializeRotationStrategies(): void {
    this.rotationStrategies = [
      {
        name: 'sequential_rotation',
        weight: 0.3,
        selector: this.sequentialRotationStrategy.bind(this)
      },
      {
        name: 'semantic_cluster_rotation',
        weight: 0.4,
        selector: this.semanticClusterRotationStrategy.bind(this)
      },
      {
        name: 'adaptive_preference_rotation',
        weight: 0.2,
        selector: this.adaptivePreferenceRotationStrategy.bind(this)
      },
      {
        name: 'cognitive_load_balancing',
        weight: 0.1,
        selector: this.cognitiveLoadBalancingStrategy.bind(this)
      }
    ];
  }

  /**
   * Generate contexts using smart rotation strategies
   */
  async generateSmartRotatedContexts(count: number = 5): Promise<ContextCombination[]> {
    const userPool = await this.getUserContextPool();
    const scenarios = await this.getScenarioFamilies();
    
    if (scenarios.length === 0) {
      console.warn('No scenario families available for smart rotation');
      return await this.generateDiverseContexts(count); // Fallback to basic generation
    }

    const rotatedContexts: ContextCombination[] = [];
    const usedContextHashes = new Set<string>();

    // Apply weighted rotation strategies
    for (let i = 0; i < count; i++) {
      const selectedStrategy = this.selectRotationStrategy();
      const availableContexts = await this.getAvailableContextsForRotation(userPool);
      
      const candidateContexts = selectedStrategy.selector(availableContexts, userPool);
      const bestContext = this.selectOptimalContext(candidateContexts, usedContextHashes, userPool);
      
      if (bestContext && Object.keys(bestContext).length > 0) {
        rotatedContexts.push(bestContext);
        usedContextHashes.add(this.hashContext(bestContext));
        
        // Update user pool with new context
        await this.updateUserContextPool(userPool, bestContext);
      }
    }

    // Fill remaining slots with fallback generation if needed
    if (rotatedContexts.length < count) {
      const remainingCount = count - rotatedContexts.length;
      const fallbackContexts = await this.generateDiverseContexts(remainingCount);
      rotatedContexts.push(...fallbackContexts);
    }

    return rotatedContexts;
  }

  /**
   * Get or create user context pool
   */
  private async getUserContextPool(): Promise<UserContextPool> {
    const poolKey = `${this.userId}_${this.category}_${this.grade}`;
    
    if (this.userContextPools.has(poolKey)) {
      return this.userContextPools.get(poolKey)!;
    }

    const recentContexts = await this.getUserContextHistory(14); // 2 weeks
    const pool: UserContextPool = {
      userId: this.userId,
      category: this.category,
      grade: this.grade,
      recentContexts,
      preferredContexts: await this.calculatePreferredContexts(recentContexts),
      bannedContexts: await this.calculateBannedContexts(recentContexts),
      lastRotationDate: new Date()
    };

    this.userContextPools.set(poolKey, pool);
    return pool;
  }

  /**
   * Calculate preferred contexts based on user history
   */
  private async calculatePreferredContexts(recentContexts: ContextCombination[]): Promise<ContextCombination[]> {
    if (recentContexts.length === 0) return [];

    // Analyze context patterns and engagement
    const contextFrequency = new Map<string, number>();
    recentContexts.forEach(context => {
      const hash = this.hashContext(context);
      contextFrequency.set(hash, (contextFrequency.get(hash) || 0) + 1);
    });

    // Return contexts that appear optimal frequency (not too much, not too little)
    const optimalContexts: ContextCombination[] = [];
    for (const [hash, frequency] of contextFrequency.entries()) {
      if (frequency >= 2 && frequency <= 4) { // Sweet spot
        const context = recentContexts.find(c => this.hashContext(c) === hash);
        if (context) optimalContexts.push(context);
      }
    }

    return optimalContexts.slice(0, 10); // Limit to top 10
  }

  /**
   * Calculate contexts to avoid (overused or problematic)
   */
  private async calculateBannedContexts(recentContexts: ContextCombination[]): Promise<ContextCombination[]> {
    const contextFrequency = new Map<string, number>();
    recentContexts.forEach(context => {
      const hash = this.hashContext(context);
      contextFrequency.set(hash, (contextFrequency.get(hash) || 0) + 1);
    });

    // Ban contexts that appear too frequently (> 5 times in recent history)
    const bannedContexts: ContextCombination[] = [];
    for (const [hash, frequency] of contextFrequency.entries()) {
      if (frequency > 5) {
        const context = recentContexts.find(c => this.hashContext(c) === hash);
        if (context) bannedContexts.push(context);
      }
    }

    return bannedContexts;
  }

  /**
   * Sequential rotation strategy - systematically rotate through different context dimensions
   */
  private sequentialRotationStrategy(
    availableContexts: ContextCombination[], 
    pool: UserContextPool
  ): ContextCombination[] {
    const recentDimensions = new Set<string>();
    
    // Track recently used dimensions
    pool.recentContexts.slice(0, 5).forEach(context => {
      Object.keys(context).forEach(dim => recentDimensions.add(dim));
    });

    // Prefer contexts with dimensions not recently used
    return availableContexts.filter(context => {
      const contextDimensions = new Set(Object.keys(context));
      const overlap = [...contextDimensions].filter(dim => recentDimensions.has(dim));
      return overlap.length < contextDimensions.size / 2; // Less than 50% overlap
    });
  }

  /**
   * Semantic cluster rotation strategy - rotate through different semantic clusters
   */
  private async semanticClusterRotationStrategy(
    availableContexts: ContextCombination[], 
    pool: UserContextPool
  ): Promise<ContextCombination[]> {
    const semanticClusters = await this.getSemanticClusters();
    const recentClusters = new Set<string>();

    // Identify recently used semantic clusters
    for (const context of pool.recentContexts.slice(0, 8)) {
      for (const [dimension, value] of Object.entries(context)) {
        if (value) {
          const cluster = this.findSemanticCluster(value, dimension, semanticClusters);
          if (cluster) recentClusters.add(cluster);
        }
      }
    }

    // Filter contexts to prefer different semantic clusters
    return availableContexts.filter(context => {
      for (const [dimension, value] of Object.entries(context)) {
        if (value) {
          const cluster = this.findSemanticCluster(value, dimension, semanticClusters);
          if (cluster && !recentClusters.has(cluster)) {
            return true; // At least one dimension from a new cluster
          }
        }
      }
      return false;
    });
  }

  /**
   * Adaptive preference rotation strategy - adapt to user preferences
   */
  private adaptivePreferenceRotationStrategy(
    availableContexts: ContextCombination[], 
    pool: UserContextPool
  ): ContextCombination[] {
    if (pool.preferredContexts.length === 0) return availableContexts;

    // Score contexts based on similarity to preferred contexts
    const scoredContexts = availableContexts.map(context => {
      let score = 0;
      
      pool.preferredContexts.forEach(preferred => {
        const similarity = this.calculateContextSimilarity(context, preferred);
        score += similarity;
      });

      return { context, score: score / pool.preferredContexts.length };
    });

    // Return top-scoring contexts (but not identical to preferred ones)
    return scoredContexts
      .filter(({ score }) => score > 0.3 && score < 0.8) // Similar but not identical
      .sort((a, b) => b.score - a.score)
      .map(({ context }) => context);
  }

  /**
   * Cognitive load balancing strategy - balance complexity for optimal learning
   */
  private cognitiveLoadBalancingStrategy(
    availableContexts: ContextCombination[], 
    pool: UserContextPool
  ): ContextCombination[] {
    // Calculate cognitive load of recent contexts
    const recentComplexity = this.calculateAverageComplexity(pool.recentContexts.slice(0, 3));
    
    // If recent contexts were complex, prefer simpler ones, and vice versa
    const targetComplexity = recentComplexity > 0.7 ? 'simple' : 
                           recentComplexity < 0.3 ? 'complex' : 'medium';

    return availableContexts.filter(context => {
      const complexity = this.calculateContextComplexity(context);
      
      switch (targetComplexity) {
        case 'simple': return complexity < 0.4;
        case 'complex': return complexity > 0.6;
        case 'medium': return complexity >= 0.4 && complexity <= 0.6;
        default: return true;
      }
    });
  }

  /**
   * Calculate context similarity (0-1 scale)
   */
  private calculateContextSimilarity(context1: ContextCombination, context2: ContextCombination): number {
    const dimensions1 = new Set(Object.keys(context1));
    const dimensions2 = new Set(Object.keys(context2));
    const allDimensions = new Set([...dimensions1, ...dimensions2]);
    
    let matches = 0;
    for (const dimension of allDimensions) {
      if (context1[dimension] === context2[dimension]) {
        matches++;
      }
    }
    
    return allDimensions.size > 0 ? matches / allDimensions.size : 0;
  }

  /**
   * Calculate average complexity of contexts
   */
  private calculateAverageComplexity(contexts: ContextCombination[]): number {
    if (contexts.length === 0) return 0.5;

    const complexities = contexts.map(context => this.calculateContextComplexity(context));
    return complexities.reduce((sum, complexity) => sum + complexity, 0) / complexities.length;
  }

  /**
   * Calculate complexity of a single context (0-1 scale)
   */
  private calculateContextComplexity(context: ContextCombination): number {
    // Base complexity on number of dimensions and semantic richness
    const dimensionCount = Object.keys(context).length;
    const maxDimensions = 5; // Reasonable maximum
    
    const baseComplexity = Math.min(dimensionCount / maxDimensions, 1);
    
    // Add semantic complexity based on word length and abstractness
    let semanticComplexity = 0;
    let totalValues = 0;
    
    for (const value of Object.values(context)) {
      if (value) {
        totalValues++;
        // Longer words/phrases tend to be more complex
        const wordComplexity = Math.min(value.length / 20, 1);
        semanticComplexity += wordComplexity;
      }
    }
    
    const avgSemanticComplexity = totalValues > 0 ? semanticComplexity / totalValues : 0;
    
    // Weighted combination
    return baseComplexity * 0.7 + avgSemanticComplexity * 0.3;
  }

  /**
   * Select optimal context from candidates
   */
  private selectOptimalContext(
    candidates: ContextCombination[], 
    usedHashes: Set<string>, 
    pool: UserContextPool
  ): ContextCombination | null {
    if (candidates.length === 0) return null;

    // Filter out already used contexts
    const unusedCandidates = candidates.filter(context => 
      !usedHashes.has(this.hashContext(context))
    );

    if (unusedCandidates.length === 0) {
      // If all candidates are used, fall back to least recently used
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Score candidates based on multiple factors
    const scoredCandidates = unusedCandidates.map(context => {
      let score = 0;

      // Diversity bonus (different from recent contexts)
      const diversityScore = this.calculateDiversityScore(context, pool.recentContexts);
      score += diversityScore * 40;

      // Freshness bonus (not recently used)
      const freshnessScore = this.calculateFreshnessScore(context, pool.recentContexts);
      score += freshnessScore * 30;

      // Quality bonus (high-quality context variants)
      const qualityScore = this.calculateQualityScore(context);
      score += qualityScore * 20;

      // Learning progression bonus (appropriate complexity)
      const progressionScore = this.calculateProgressionScore(context, pool);
      score += progressionScore * 10;

      return { context, score };
    });

    // Return highest scoring context
    const bestCandidate = scoredCandidates.sort((a, b) => b.score - a.score)[0];
    return bestCandidate ? bestCandidate.context : null;
  }

  /**
   * Calculate diversity score for a context
   */
  private calculateDiversityScore(context: ContextCombination, recentContexts: ContextCombination[]): number {
    if (recentContexts.length === 0) return 1;

    let diversityScore = 0;
    for (const recentContext of recentContexts.slice(0, 5)) {
      const similarity = this.calculateContextSimilarity(context, recentContext);
      diversityScore += (1 - similarity);
    }

    return diversityScore / Math.min(recentContexts.length, 5);
  }

  /**
   * Calculate freshness score (how long since last use)
   */
  private calculateFreshnessScore(context: ContextCombination, recentContexts: ContextCombination[]): number {
    const contextHash = this.hashContext(context);
    
    for (let i = 0; i < recentContexts.length; i++) {
      if (this.hashContext(recentContexts[i]) === contextHash) {
        // Found in recent history - fresher = lower score
        return Math.max(0, (recentContexts.length - i) / recentContexts.length);
      }
    }
    
    return 1; // Not found in recent history = very fresh
  }

  /**
   * Calculate quality score based on context variant quality
   */
  private calculateQualityScore(context: ContextCombination): number {
    // This would ideally look up quality scores from the database
    // For now, return a baseline score
    return 0.5;
  }

  /**
   * Calculate learning progression score
   */
  private calculateProgressionScore(context: ContextCombination, pool: UserContextPool): number {
    // Score based on appropriate complexity for learning progression
    const complexity = this.calculateContextComplexity(context);
    const recentComplexity = this.calculateAverageComplexity(pool.recentContexts.slice(0, 3));
    
    // Prefer gradual complexity increase
    const idealComplexity = Math.min(recentComplexity + 0.1, 1.0);
    const complexityDiff = Math.abs(complexity - idealComplexity);
    
    return Math.max(0, 1 - complexityDiff * 2);
  }

  /**
   * Select rotation strategy based on weights
   */
  private selectRotationStrategy(): ContextRotationStrategy {
    const totalWeight = this.rotationStrategies.reduce((sum, strategy) => sum + strategy.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const strategy of this.rotationStrategies) {
      cumulativeWeight += strategy.weight;
      if (random <= cumulativeWeight) {
        return strategy;
      }
    }
    
    return this.rotationStrategies[0]; // Fallback
  }

  /**
   * Get available contexts for rotation
   */
  private async getAvailableContextsForRotation(pool: UserContextPool): Promise<ContextCombination[]> {
    const scenarioFamilies = await this.getScenarioFamilies();
    const availableContexts: ContextCombination[] = [];

    for (const family of scenarioFamilies) {
      const contextSlots = family.context_slots;
      
      // Generate combinations for this family
      const combinations = await this.generateContextCombinationsForFamily(family);
      availableContexts.push(...combinations);
    }

    // Filter out banned contexts
    return availableContexts.filter(context => 
      !pool.bannedContexts.some(banned => 
        this.hashContext(context) === this.hashContext(banned)
      )
    );
  }

  /**
   * Generate context combinations for a scenario family
   */
  private async generateContextCombinationsForFamily(family: ScenarioFamily): Promise<ContextCombination[]> {
    const contextSlots = family.context_slots;
    const combinations: ContextCombination[] = [];
    
    // Get variants for each dimension
    const dimensionVariants = new Map<string, ContextVariant[]>();
    for (const dimension of Object.keys(contextSlots)) {
      const variants = await this.getContextVariants(family.id, dimension);
      dimensionVariants.set(dimension, variants);
    }

    // Generate reasonable number of combinations (not all possible)
    const maxCombinations = 20;
    const dimensions = Array.from(dimensionVariants.keys());
    
    for (let i = 0; i < maxCombinations && i < Math.pow(2, dimensions.length); i++) {
      const combination: ContextCombination = {};
      
      for (const dimension of dimensions) {
        const variants = dimensionVariants.get(dimension) || [];
        if (variants.length > 0) {
          const randomVariant = variants[Math.floor(Math.random() * variants.length)];
          combination[dimension] = randomVariant.value;
        }
      }
      
      if (Object.keys(combination).length > 0) {
        combinations.push(combination);
      }
    }

    return combinations;
  }

  /**
   * Update user context pool with new context
   */
  private async updateUserContextPool(pool: UserContextPool, newContext: ContextCombination): Promise<void> {
    // Add to recent contexts (keep last 20)
    pool.recentContexts.unshift(newContext);
    pool.recentContexts = pool.recentContexts.slice(0, 20);
    
    // Update last rotation date
    pool.lastRotationDate = new Date();
    
    // Recalculate preferred and banned contexts periodically
    if (pool.recentContexts.length % 10 === 0) {
      pool.preferredContexts = await this.calculatePreferredContexts(pool.recentContexts);
      pool.bannedContexts = await this.calculateBannedContexts(pool.recentContexts);
    }
  }

  /**
   * Calculate smart rotation metrics
   */
  async calculateSmartRotationMetrics(): Promise<SmartRotationMetrics> {
    const diversityMetrics = await this.calculateDiversityMetrics();
    const pool = await this.getUserContextPool();
    
    // Calculate context utilization rate
    const uniqueContexts = new Set(pool.recentContexts.map(c => this.hashContext(c)));
    const utilizationRate = pool.recentContexts.length > 0 ? 
      uniqueContexts.size / pool.recentContexts.length : 0;

    // Calculate rotation effectiveness
    const rotationEffectiveness = this.calculateRotationEffectiveness(pool.recentContexts);

    // Calculate engagement improvement (placeholder - would use real user data)
    const engagementImprovement = 0.75; // Based on rotation vs non-rotation

    // Calculate template variety score
    const templateVarietyScore = this.calculateTemplateVarietyScore(pool.recentContexts);

    // Calculate cognitive load balance
    const cognitiveLoadBalance = this.calculateCognitiveLoadBalance(pool.recentContexts);

    return {
      context_utilization_rate: utilizationRate,
      rotation_effectiveness: rotationEffectiveness,
      user_engagement_improvement: engagementImprovement,
      template_variety_score: templateVarietyScore,
      cognitive_load_balance: cognitiveLoadBalance
    };
  }

  /**
   * Calculate rotation effectiveness
   */
  private calculateRotationEffectiveness(recentContexts: ContextCombination[]): number {
    if (recentContexts.length < 5) return 0.5;

    let rotationScore = 0;
    const windowSize = 5;

    for (let i = 0; i <= recentContexts.length - windowSize; i++) {
      const window = recentContexts.slice(i, i + windowSize);
      const uniqueInWindow = new Set(window.map(c => this.hashContext(c)));
      rotationScore += uniqueInWindow.size / windowSize;
    }

    return rotationScore / (recentContexts.length - windowSize + 1);
  }

  /**
   * Calculate template variety score
   */
  private calculateTemplateVarietyScore(recentContexts: ContextCombination[]): number {
    if (recentContexts.length === 0) return 0;

    const dimensionVariety = new Set<string>();
    const valueVariety = new Set<string>();

    recentContexts.forEach(context => {
      Object.entries(context).forEach(([dimension, value]) => {
        dimensionVariety.add(dimension);
        if (value) valueVariety.add(value);
      });
    });

    // Score based on dimension and value variety
    const maxDimensions = 5; // Estimated maximum
    const dimensionScore = Math.min(dimensionVariety.size / maxDimensions, 1);
    const valueScore = Math.min(valueVariety.size / (recentContexts.length * 2), 1);

    return (dimensionScore + valueScore) / 2;
  }

  /**
   * Calculate cognitive load balance
   */
  private calculateCognitiveLoadBalance(recentContexts: ContextCombination[]): number {
    if (recentContexts.length === 0) return 0.5;

    const complexities = recentContexts.map(context => this.calculateContextComplexity(context));
    
    // Calculate variance in complexity (lower variance = better balance)
    const mean = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    const variance = complexities.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / complexities.length;
    
    // Convert variance to balance score (lower variance = higher balance)
    const balanceScore = Math.max(0, 1 - variance * 4);
    
    return balanceScore;
  }

  /**
   * Generate enhanced prompt with smart rotation context
   */
  getSmartRotationPromptInstructions(
    selectedContexts: ContextCombination[],
    rotationMetrics: SmartRotationMetrics
  ): string {
    const contextInstructions = selectedContexts.map((ctx, i) => 
      `${i+1}. ${Object.entries(ctx).map(([k,v]) => `${k}:${v}`).join(', ')}`
    ).join('\\n');

    return `
🧠 SMART CONTEXT ROTATION ENGINE - PHASE 2 AKTIVIERT:

📊 ROTATION METRICS:
• Kontext-Nutzungsrate: ${(rotationMetrics.context_utilization_rate * 100).toFixed(1)}%
• Rotation-Effektivität: ${(rotationMetrics.rotation_effectiveness * 100).toFixed(1)}%
• Template-Vielfalt: ${(rotationMetrics.template_variety_score * 100).toFixed(1)}%
• Kognitive Balance: ${(rotationMetrics.cognitive_load_balance * 100).toFixed(1)}%

🎯 INTELLIGENTE KONTEXT-AUSWAHL:
${contextInstructions}

⚡ ERWEITERTE GENERATION-REGELN:
🔄 SMART ROTATION: Nutze die oben genannten Kontexte als BASIS und entwickle sie intelligent weiter
🎨 MULTI-KONTEXT TEMPLATES: Kombiniere Kontexte kreativ für reiche, immersive Szenarien
🧩 ADAPTIVE KOMPLEXITÄT: Passe die Kontextkomplexität an die Lernprogression an
🎪 COGNITIVE LOAD BALANCING: Wechsle zwischen einfachen und komplexeren Kontexten

💡 KONTEXT-VERKNÜPFUNG: Stelle sinnvolle Verbindungen zwischen verschiedenen Kontextdimensionen her
🌟 NARRATIVE KOHÄRENZ: Erschaffe zusammenhängende Geschichten und Szenarien
🎲 DYNAMIC VARIATION: Variiere Parameter basierend auf Kontext-Beziehungen

ERSTELLE FRAGEN DIE DIESE INTELLIGENTE KONTEXT-ROTATION MAXIMAL AUSNUTZEN!
`;
  }
}
