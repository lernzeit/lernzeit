import { supabase } from "@/integrations/supabase/client";
import { ContextCombination } from "./ContextualDiversityEngine";

export interface MultiContextTemplate {
  id: string;
  name: string;
  category: string;
  grade_range: [number, number];
  context_requirements: ContextRequirements;
  template_structure: string;
  question_patterns: QuestionPattern[];
  difficulty_modifiers: DifficultyModifier[];
  quality_score: number;
  usage_count: number;
  success_rate: number;
}

export interface ContextRequirements {
  primary_context: string;
  secondary_contexts: string[];
  context_relationships: ContextRelationship[];
  minimum_context_dimensions: number;
  context_complexity_level: 'simple' | 'medium' | 'complex';
}

export interface ContextRelationship {
  context1: string;
  context2: string;
  relationship_type: 'compatible' | 'incompatible' | 'enhances' | 'conflicts';
  weight: number;
  interaction_rules: string[];
}

export interface QuestionPattern {
  pattern_id: string;
  question_structure: string;
  context_slots: string[];
  answer_type: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching' | 'drag-drop';
  variables: TemplateVariable[];
  complexity_indicators: ComplexityIndicator[];
}

export interface TemplateVariable {
  name: string;
  type: 'number' | 'text' | 'list' | 'context_dependent' | 'calculated';
  source: 'context' | 'calculation' | 'predefined' | 'dynamic';
  constraints: VariableConstraints;
  context_dependencies: string[];
}

export interface VariableConstraints {
  min_value?: number;
  max_value?: number;
  allowed_values?: string[];
  pattern?: string;
  calculation_formula?: string;
  context_mapping?: Record<string, any>;
}

export interface ComplexityIndicator {
  factor: string;
  weight: number;
  calculation_method: string;
}

export interface DifficultyModifier {
  grade: number;
  context_complexity: number;
  variable_ranges: Record<string, [number, number]>;
  question_complexity: number;
  cognitive_load_factors: CognitiveLoadFactor[];
}

export interface CognitiveLoadFactor {
  factor_name: string;
  impact_level: 'low' | 'medium' | 'high';
  adjustment_value: number;
}

export interface GeneratedMultiContextQuestion {
  id: string;
  question_type: 'text-input' | 'multiple-choice' | 'word-selection' | 'matching' | 'drag-drop';
  question_text: string;
  answer: any;
  context_combination: ContextCombination;
  template_id: string;
  pattern_id: string;
  complexity_score: number;
  cognitive_load: number;
  variables: Record<string, any>;
  explanation?: string;
  metadata: QuestionMetadata;
}

export interface QuestionMetadata {
  context_richness: number;
  narrative_coherence: number;
  learning_objectives: string[];
  skill_targets: string[];
  context_relationships_used: string[];
}

export class MultiContextTemplateEngine {
  private templateCache = new Map<string, MultiContextTemplate[]>();
  private lastCacheUpdate = new Map<string, number>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get multi-context templates for category and grade
   */
  async getMultiContextTemplates(category: string, grade: number): Promise<MultiContextTemplate[]> {
    const cacheKey = `${category}_${grade}`;
    const now = Date.now();
    
    if (this.templateCache.has(cacheKey)) {
      const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
      if (now - lastUpdate < this.CACHE_TTL) {
        return this.templateCache.get(cacheKey)!;
      }
    }

    const templates = await this.loadMultiContextTemplates(category, grade);
    this.templateCache.set(cacheKey, templates);
    this.lastCacheUpdate.set(cacheKey, now);
    
    return templates;
  }

  /**
   * Load multi-context templates from database or create them
   */
  private async loadMultiContextTemplates(category: string, grade: number): Promise<MultiContextTemplate[]> {
    // For now, return predefined templates
    // In a full implementation, these would be stored in the database
    return this.getPredefinedMultiContextTemplates(category, grade);
  }

  /**
   * Get predefined multi-context templates
   */
  private getPredefinedMultiContextTemplates(category: string, grade: number): MultiContextTemplate[] {
    const templates: MultiContextTemplate[] = [];

    // Math templates
    if (category === 'math' || category === 'mathematik') {
      templates.push(...this.getMathMultiContextTemplates(grade));
    }

    // German templates
    if (category === 'german' || category === 'deutsch') {
      templates.push(...this.getGermanMultiContextTemplates(grade));
    }

    // Science templates
    if (category === 'science' || category === 'naturwissenschaften') {
      templates.push(...this.getScienceMultiContextTemplates(grade));
    }

    return templates;
  }

  /**
   * Get math multi-context templates
   */
  private getMathMultiContextTemplates(grade: number): MultiContextTemplate[] {
    return [
      {
        id: 'math_shopping_scenario',
        name: 'Shopping Scenario Template',
        category: 'math',
        grade_range: [1, 4],
        context_requirements: {
          primary_context: 'location',
          secondary_contexts: ['character', 'objects', 'activity'],
          context_relationships: [
            {
              context1: 'location',
              context2: 'objects',
              relationship_type: 'enhances',
              weight: 0.8,
              interaction_rules: ['shop_sells_appropriate_items', 'realistic_pricing']
            }
          ],
          minimum_context_dimensions: 3,
          context_complexity_level: 'medium'
        },
        template_structure: 'In der {location} kauft {character} {objects}. {activity_description}.',
        question_patterns: [
          {
            pattern_id: 'addition_shopping',
            question_structure: '{character} kauft {item1} für {price1}€ und {item2} für {price2}€. Wie viel bezahlt {character} insgesamt?',
            context_slots: ['character', 'location', 'item1', 'item2'],
            answer_type: 'text-input',
            variables: [
              {
                name: 'price1',
                type: 'number',
                source: 'calculation',
                constraints: {
                  min_value: 1,
                  max_value: 10,
                  calculation_formula: 'grade_appropriate_price'
                },
                context_dependencies: ['item1', 'location']
              },
              {
                name: 'price2',
                type: 'number',
                source: 'calculation',
                constraints: {
                  min_value: 1,
                  max_value: 10,
                  calculation_formula: 'grade_appropriate_price'
                },
                context_dependencies: ['item2', 'location']
              }
            ],
            complexity_indicators: [
              {
                factor: 'number_size',
                weight: 0.4,
                calculation_method: 'max_value / grade_factor'
              },
              {
                factor: 'context_richness',
                weight: 0.3,
                calculation_method: 'context_dimensions_count / 5'
              }
            ]
          }
        ],
        difficulty_modifiers: [
          {
            grade: 1,
            context_complexity: 0.3,
            variable_ranges: {
              'price1': [1, 5],
              'price2': [1, 5]
            },
            question_complexity: 0.2,
            cognitive_load_factors: [
              {
                factor_name: 'simple_addition',
                impact_level: 'low',
                adjustment_value: 0.1
              }
            ]
          },
          {
            grade: 3,
            context_complexity: 0.6,
            variable_ranges: {
              'price1': [5, 15],
              'price2': [5, 15]
            },
            question_complexity: 0.5,
            cognitive_load_factors: [
              {
                factor_name: 'multi_step_calculation',
                impact_level: 'medium',
                adjustment_value: 0.3
              }
            ]
          }
        ],
        quality_score: 0.85,
        usage_count: 0,
        success_rate: 0.78
      },
      {
        id: 'math_time_scenario',
        name: 'Time Management Scenario',
        category: 'math',
        grade_range: [2, 5],
        context_requirements: {
          primary_context: 'activity',
          secondary_contexts: ['character', 'location', 'time_setting'],
          context_relationships: [
            {
              context1: 'activity',
              context2: 'time_setting',
              relationship_type: 'compatible',
              weight: 0.9,
              interaction_rules: ['realistic_time_duration', 'appropriate_time_of_day']
            }
          ],
          minimum_context_dimensions: 3,
          context_complexity_level: 'medium'
        },
        template_structure: '{character} {activity} {time_setting} in der {location}.',
        question_patterns: [
          {
            pattern_id: 'time_calculation',
            question_structure: '{character} beginnt um {start_time} Uhr mit {activity} und ist um {end_time} Uhr fertig. Wie lange dauert {activity}?',
            context_slots: ['character', 'activity', 'location'],
            answer_type: 'text-input',
            variables: [
              {
                name: 'start_time',
                type: 'number',
                source: 'context_dependent',
                constraints: {
                  min_value: 7,
                  max_value: 18,
                  context_mapping: {
                    'school': [8, 15],
                    'home': [7, 20],
                    'playground': [10, 18]
                  }
                },
                context_dependencies: ['location', 'activity']
              }
            ],
            complexity_indicators: [
              {
                factor: 'time_span',
                weight: 0.5,
                calculation_method: 'duration / 60'
              }
            ]
          }
        ],
        difficulty_modifiers: [
          {
            grade: 2,
            context_complexity: 0.4,
            variable_ranges: {
              'duration': [30, 120]
            },
            question_complexity: 0.3,
            cognitive_load_factors: [
              {
                factor_name: 'time_understanding',
                impact_level: 'medium',
                adjustment_value: 0.2
              }
            ]
          }
        ],
        quality_score: 0.82,
        usage_count: 0,
        success_rate: 0.75
      }
    ];
  }

  /**
   * Get German multi-context templates
   */
  private getGermanMultiContextTemplates(grade: number): MultiContextTemplate[] {
    return [
      {
        id: 'german_story_scenario',
        name: 'Story Writing Scenario',
        category: 'german',
        grade_range: [1, 6],
        context_requirements: {
          primary_context: 'character',
          secondary_contexts: ['location', 'activity', 'objects'],
          context_relationships: [
            {
              context1: 'character',
              context2: 'activity',
              relationship_type: 'enhances',
              weight: 0.7,
              interaction_rules: ['character_appropriate_activity', 'age_appropriate_actions']
            }
          ],
          minimum_context_dimensions: 4,
          context_complexity_level: 'complex'
        },
        template_structure: '{character} ist in der {location} und {activity} mit {objects}.',
        question_patterns: [
          {
            pattern_id: 'sentence_building',
            question_structure: 'Schreibe einen Satz über {character}, der/die in der {location} {activity}.',
            context_slots: ['character', 'location', 'activity'],
            answer_type: 'text-input',
            variables: [
              {
                name: 'sentence_structure',
                type: 'text',
                source: 'predefined',
                constraints: {
                  allowed_values: ['simple', 'compound', 'complex'],
                  context_mapping: {
                    'grade_1': ['simple'],
                    'grade_2': ['simple', 'compound'],
                    'grade_3': ['simple', 'compound', 'complex']
                  }
                },
                context_dependencies: ['grade']
              }
            ],
            complexity_indicators: [
              {
                factor: 'sentence_complexity',
                weight: 0.6,
                calculation_method: 'structure_complexity_score'
              }
            ]
          }
        ],
        difficulty_modifiers: [
          {
            grade: 1,
            context_complexity: 0.3,
            variable_ranges: {},
            question_complexity: 0.2,
            cognitive_load_factors: [
              {
                factor_name: 'simple_sentence_construction',
                impact_level: 'low',
                adjustment_value: 0.1
              }
            ]
          }
        ],
        quality_score: 0.88,
        usage_count: 0,
        success_rate: 0.82
      }
    ];
  }

  /**
   * Get science multi-context templates
   */
  private getScienceMultiContextTemplates(grade: number): MultiContextTemplate[] {
    return [
      {
        id: 'science_experiment_scenario',
        name: 'Science Experiment Scenario',
        category: 'science',
        grade_range: [2, 6],
        context_requirements: {
          primary_context: 'activity',
          secondary_contexts: ['location', 'objects', 'character'],
          context_relationships: [
            {
              context1: 'activity',
              context2: 'objects',
              relationship_type: 'enhances',
              weight: 0.9,
              interaction_rules: ['experiment_appropriate_materials', 'safety_considerations']
            }
          ],
          minimum_context_dimensions: 3,
          context_complexity_level: 'medium'
        },
        template_structure: '{character} führt in der {location} ein Experiment durch: {activity} mit {objects}.',
        question_patterns: [
          {
            pattern_id: 'prediction_question',
            question_structure: 'Was passiert, wenn {character} {activity} mit {objects}?',
            context_slots: ['character', 'activity', 'objects'],
            answer_type: 'multiple-choice',
            variables: [
              {
                name: 'expected_outcome',
                type: 'text',
                source: 'dynamic',
                constraints: {
                  context_mapping: {
                    'water_experiment': ['es_wird_warm', 'es_wird_kalt', 'es_ändert_farbe'],
                    'magnet_experiment': ['es_wird_angezogen', 'es_wird_abgestoßen', 'nichts_passiert']
                  }
                },
                context_dependencies: ['activity', 'objects']
              }
            ],
            complexity_indicators: [
              {
                factor: 'scientific_complexity',
                weight: 0.7,
                calculation_method: 'concept_difficulty_score'
              }
            ]
          }
        ],
        difficulty_modifiers: [
          {
            grade: 2,
            context_complexity: 0.4,
            variable_ranges: {},
            question_complexity: 0.3,
            cognitive_load_factors: [
              {
                factor_name: 'simple_observation',
                impact_level: 'medium',
                adjustment_value: 0.2
              }
            ]
          }
        ],
        quality_score: 0.86,
        usage_count: 0,
        success_rate: 0.79
      }
    ];
  }

  /**
   * Generate question from multi-context template
   */
  async generateQuestionFromTemplate(
    template: MultiContextTemplate,
    contextCombination: ContextCombination,
    grade: number
  ): Promise<GeneratedMultiContextQuestion | null> {
    // Validate context requirements
    if (!this.validateContextRequirements(template.context_requirements, contextCombination)) {
      console.warn('Context combination does not meet template requirements', {
        template: template.id,
        context: contextCombination
      });
      return null;
    }

    // Select appropriate question pattern
    const pattern = this.selectQuestionPattern(template.question_patterns, grade);
    if (!pattern) {
      console.warn('No suitable question pattern found', { template: template.id, grade });
      return null;
    }

    // Generate variables
    const variables = await this.generateVariables(pattern.variables, contextCombination, grade);

    // Fill question template
    const questionText = this.fillQuestionTemplate(pattern.question_structure, contextCombination, variables);

    // Calculate complexity metrics
    const complexityScore = this.calculateComplexityScore(template, pattern, variables, grade);
    const cognitiveLoad = this.calculateCognitiveLoad(template, contextCombination, variables);

    // Generate answer
    const answer = await this.generateAnswer(pattern, contextCombination, variables);

    // Create metadata
    const metadata = this.createQuestionMetadata(template, contextCombination, pattern);

    return {
      id: `mcq_${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question_type: pattern.answer_type,
      question_text: questionText,
      answer,
      context_combination: contextCombination,
      template_id: template.id,
      pattern_id: pattern.pattern_id,
      complexity_score: complexityScore,
      cognitive_load: cognitiveLoad,
      variables,
      metadata
    };
  }

  /**
   * Validate context requirements
   */
  private validateContextRequirements(
    requirements: ContextRequirements,
    context: ContextCombination
  ): boolean {
    // Check minimum dimensions
    if (Object.keys(context).length < requirements.minimum_context_dimensions) {
      return false;
    }

    // Check primary context exists
    if (!context[requirements.primary_context]) {
      return false;
    }

    // Check secondary contexts (at least some should exist)
    const availableSecondary = requirements.secondary_contexts.filter(
      secondary => context[secondary]
    );
    
    if (availableSecondary.length === 0) {
      return false;
    }

    // Check context relationships
    for (const relationship of requirements.context_relationships) {
      if (!this.validateContextRelationship(relationship, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate context relationship
   */
  private validateContextRelationship(
    relationship: ContextRelationship,
    context: ContextCombination
  ): boolean {
    const value1 = context[relationship.context1];
    const value2 = context[relationship.context2];

    if (!value1 || !value2) return true; // Skip if contexts not available

    // Apply relationship rules (simplified validation)
    switch (relationship.relationship_type) {
      case 'incompatible':
        // Check if values are incompatible (would need predefined incompatibility rules)
        return true; // Placeholder
      case 'compatible':
        // Check if values are compatible
        return true; // Placeholder
      case 'enhances':
        // Check if one context enhances the other
        return true; // Placeholder
      case 'conflicts':
        // Check for conflicts
        return true; // Placeholder
      default:
        return true;
    }
  }

  /**
   * Select appropriate question pattern
   */
  private selectQuestionPattern(patterns: QuestionPattern[], grade: number): QuestionPattern | null {
    if (patterns.length === 0) return null;

    // For now, select the first pattern
    // In a full implementation, this would consider grade appropriateness and complexity
    return patterns[0];
  }

  /**
   * Generate variables for the question
   */
  private async generateVariables(
    variableDefinitions: TemplateVariable[],
    context: ContextCombination,
    grade: number
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    for (const varDef of variableDefinitions) {
      let value: any;

      switch (varDef.source) {
        case 'context':
          value = context[varDef.name];
          break;
        case 'calculation':
          value = this.calculateVariableValue(varDef, context, grade);
          break;
        case 'predefined':
          value = this.selectPredefinedValue(varDef, context, grade);
          break;
        case 'dynamic':
          value = await this.generateDynamicValue(varDef, context, grade);
          break;
        default:
          value = this.generateDefaultValue(varDef);
      }

      variables[varDef.name] = value;
    }

    return variables;
  }

  /**
   * Calculate variable value based on context and constraints
   */
  private calculateVariableValue(
    varDef: TemplateVariable,
    context: ContextCombination,
    grade: number
  ): any {
    const constraints = varDef.constraints;

    if (varDef.type === 'number') {
      const min = constraints.min_value || 1;
      const max = constraints.max_value || 10;
      
      // Adjust range based on grade
      const gradeAdjustedMax = Math.min(max, grade * 5 + 5);
      
      return Math.floor(Math.random() * (gradeAdjustedMax - min + 1)) + min;
    }

    if (varDef.type === 'text' && constraints.allowed_values) {
      return constraints.allowed_values[
        Math.floor(Math.random() * constraints.allowed_values.length)
      ];
    }

    return null;
  }

  /**
   * Select predefined value based on context
   */
  private selectPredefinedValue(
    varDef: TemplateVariable,
    context: ContextCombination,
    grade: number
  ): any {
    const constraints = varDef.constraints;

    if (constraints.context_mapping) {
      // Try to find value based on context
      for (const [contextKey, values] of Object.entries(constraints.context_mapping)) {
        if (Object.values(context).includes(contextKey) || contextKey === `grade_${grade}`) {
          if (Array.isArray(values)) {
            return values[Math.floor(Math.random() * values.length)];
          }
          return values;
        }
      }
    }

    if (constraints.allowed_values) {
      return constraints.allowed_values[
        Math.floor(Math.random() * constraints.allowed_values.length)
      ];
    }

    return null;
  }

  /**
   * Generate dynamic value (placeholder for complex generation)
   */
  private async generateDynamicValue(
    varDef: TemplateVariable,
    context: ContextCombination,
    grade: number
  ): Promise<any> {
    // Placeholder for dynamic value generation
    // This could involve AI generation, database lookups, etc.
    return this.generateDefaultValue(varDef);
  }

  /**
   * Generate default value for variable
   */
  private generateDefaultValue(varDef: TemplateVariable): any {
    switch (varDef.type) {
      case 'number':
        return Math.floor(Math.random() * 10) + 1;
      case 'text':
        return 'default_text';
      case 'list':
        return [];
      default:
        return null;
    }
  }

  /**
   * Fill question template with context and variables
   */
  private fillQuestionTemplate(
    template: string,
    context: ContextCombination,
    variables: Record<string, any>
  ): string {
    let filledTemplate = template;

    // Replace context placeholders
    for (const [key, value] of Object.entries(context)) {
      if (value) {
        filledTemplate = filledTemplate.replace(
          new RegExp(`{${key}}`, 'g'),
          value
        );
      }
    }

    // Replace variable placeholders
    for (const [key, value] of Object.entries(variables)) {
      if (value !== null && value !== undefined) {
        filledTemplate = filledTemplate.replace(
          new RegExp(`{${key}}`, 'g'),
          value.toString()
        );
      }
    }

    return filledTemplate;
  }

  /**
   * Generate answer for the question
   */
  private async generateAnswer(
    pattern: QuestionPattern,
    context: ContextCombination,
    variables: Record<string, any>
  ): Promise<any> {
    // Simplified answer generation
    // In a full implementation, this would be more sophisticated
    
    switch (pattern.answer_type) {
      case 'text-input':
        // For math problems, calculate the answer
        if (variables.price1 && variables.price2) {
          return variables.price1 + variables.price2;
        }
        return 'sample_answer';
        
      case 'multiple-choice':
        // Generate options including the correct answer
        return {
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: 0
        };
        
      default:
        return null;
    }
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexityScore(
    template: MultiContextTemplate,
    pattern: QuestionPattern,
    variables: Record<string, any>,
    grade: number
  ): number {
    let complexityScore = 0;

    // Base complexity from template
    complexityScore += template.quality_score * 0.3;

    // Pattern complexity
    for (const indicator of pattern.complexity_indicators) {
      switch (indicator.factor) {
        case 'number_size':
          const maxNumber = Math.max(...Object.values(variables).filter(v => typeof v === 'number'));
          complexityScore += (maxNumber / (grade * 10)) * indicator.weight;
          break;
        case 'context_richness':
          const contextDimensions = Object.keys(template.context_requirements.secondary_contexts).length;
          complexityScore += (contextDimensions / 5) * indicator.weight;
          break;
      }
    }

    return Math.min(complexityScore, 1);
  }

  /**
   * Calculate cognitive load
   */
  private calculateCognitiveLoad(
    template: MultiContextTemplate,
    context: ContextCombination,
    variables: Record<string, any>
  ): number {
    // Simplified cognitive load calculation
    const contextComplexity = Object.keys(context).length / 5;
    const variableComplexity = Object.keys(variables).length / 10;
    const templateComplexity = template.context_requirements.context_complexity_level === 'complex' ? 0.8 :
                               template.context_requirements.context_complexity_level === 'medium' ? 0.5 : 0.2;

    return (contextComplexity + variableComplexity + templateComplexity) / 3;
  }

  /**
   * Create question metadata
   */
  private createQuestionMetadata(
    template: MultiContextTemplate,
    context: ContextCombination,
    pattern: QuestionPattern
  ): QuestionMetadata {
    return {
      context_richness: Object.keys(context).length / 5,
      narrative_coherence: 0.8, // Placeholder
      learning_objectives: [`${template.category}_skills`, 'context_understanding'],
      skill_targets: ['problem_solving', 'context_application'],
      context_relationships_used: template.context_requirements.context_relationships.map(r => 
        `${r.context1}_${r.context2}_${r.relationship_type}`
      )
    };
  }

  /**
   * Get template performance metrics
   */
  async getTemplatePerformanceMetrics(templateId: string): Promise<{
    usage_count: number;
    success_rate: number;
    avg_complexity: number;
    user_satisfaction: number;
  }> {
    // Placeholder implementation
    // In a full implementation, this would query the database for metrics
    return {
      usage_count: 0,
      success_rate: 0.8,
      avg_complexity: 0.6,
      user_satisfaction: 0.75
    };
  }

  /**
   * Update template usage statistics
   */
  async updateTemplateUsage(
    templateId: string,
    patternId: string,
    wasSuccessful: boolean,
    complexityScore: number,
    cognitiveLoad: number
  ): Promise<void> {
    // Placeholder implementation
    // In a full implementation, this would update database statistics
    console.log('Template usage updated:', {
      templateId,
      patternId,
      wasSuccessful,
      complexityScore,
      cognitiveLoad
    });
  }
}