// Migration Runner - Orchestrates the step-by-step migration to Template-Bank system
import { EnhancedTemplateBankService } from '@/services/templateBankService';
import { topUpBank, pruneOldBad } from './templateBankRunner';
import { supabase } from '@/integrations/supabase/client';

interface MigrationConfig {
  enableTemplateBankMode: boolean;
  enableQualityPruning: boolean;
  enableAutoTopUp: boolean;
  targetTemplatesPerDomain: number;
  phases: ('template-bank' | 'knowledge-integration' | 'legacy-cleanup' | 'optimization')[];
}

interface MigrationResult {
  phase: string;
  success: boolean;
  details: string;
  metrics?: any;
  error?: string;
}

export class MigrationRunner {
  private static instance: MigrationRunner;
  private templateBankService: EnhancedTemplateBankService;

  constructor() {
    this.templateBankService = EnhancedTemplateBankService.getInstance();
  }

  static getInstance(): MigrationRunner {
    if (!MigrationRunner.instance) {
      MigrationRunner.instance = new MigrationRunner();
    }
    return MigrationRunner.instance;
  }

  /**
   * Run the complete migration to Template-Bank system
   */
  async runMigration(config: Partial<MigrationConfig> = {}): Promise<MigrationResult[]> {
    const fullConfig: MigrationConfig = {
      enableTemplateBankMode: true,
      enableQualityPruning: true,
      enableAutoTopUp: true,
      targetTemplatesPerDomain: 50,
      phases: ['template-bank', 'knowledge-integration', 'legacy-cleanup', 'optimization'],
      ...config
    };

    console.log('🚀 Starting Template-Bank Migration');
    console.log('📋 Configuration:', fullConfig);

    const results: MigrationResult[] = [];

    for (const phase of fullConfig.phases) {
      try {
        console.log(`\n📍 Starting Phase: ${phase}`);
        const result = await this.runPhase(phase, fullConfig);
        results.push(result);
        
        if (!result.success) {
          console.error(`❌ Phase ${phase} failed: ${result.error}`);
          break;
        }
        
        console.log(`✅ Phase ${phase} completed: ${result.details}`);
      } catch (error) {
        const errorResult: MigrationResult = {
          phase,
          success: false,
          details: 'Phase execution failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        console.error(`❌ Phase ${phase} crashed:`, error);
        break;
      }
    }

    console.log('\n📊 Migration Summary:');
    results.forEach(result => {
      console.log(`  ${result.success ? '✅' : '❌'} ${result.phase}: ${result.details}`);
    });

    return results;
  }

  /**
   * Run individual migration phase
   */
  private async runPhase(phase: string, config: MigrationConfig): Promise<MigrationResult> {
    switch (phase) {
      case 'template-bank':
        return await this.runTemplateBankPhase(config);
      case 'knowledge-integration':
        return await this.runKnowledgeIntegrationPhase(config);
      case 'legacy-cleanup':
        return await this.runLegacyCleanupPhase(config);
      case 'optimization':
        return await this.runOptimizationPhase(config);
      default:
        return {
          phase,
          success: false,
          details: 'Unknown phase',
          error: `Phase ${phase} is not implemented`
        };
    }
  }

  /**
   * Phase 1: Template-Bank Integration
   */
  private async runTemplateBankPhase(config: MigrationConfig): Promise<MigrationResult> {
    console.log('🏦 Phase 1: Template-Bank Integration');

    try {
      // 1. Quality pruning if enabled
      let prunedCount = 0;
      if (config.enableQualityPruning) {
        console.log('  🧹 Pruning low-quality templates');
        const pruneResult = await pruneOldBad();
        prunedCount = pruneResult.archived;
        console.log(`  📉 Archived ${prunedCount} low-quality templates`);
      }

      // 2. Template bank top-up if enabled
      let topUpResults = {};
      if (config.enableAutoTopUp) {
        console.log('  📈 Topping up template bank');
        const grades = [1, 2, 3, 4, 5];
        const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
        
        for (const grade of grades) {
          for (const quarter of quarters) {
            const result = await topUpBank(grade, quarter, 10);
            topUpResults = { ...topUpResults, [`G${grade}-${quarter}`]: result.created };
          }
        }
        console.log('  📊 Top-up results:', topUpResults);
      }

      // 3. Test Template-Bank Service
      console.log('  🧪 Testing Template-Bank Service');
      const testResult = await this.templateBankService.generateQuestions(
        'mathematik',
        3,
        'Q1',
        5,
        { enableQualityControl: true, minQualityThreshold: 0.7, diversityWeight: 0.3, fallbackToLegacy: true }
      );

      return {
        phase: 'template-bank',
        success: true,
        details: `Integration completed. Pruned: ${prunedCount}, Test questions: ${testResult.questions.length}`,
        metrics: {
          prunedTemplates: prunedCount,
          topUpResults,
          testQuestionsGenerated: testResult.questions.length,
          testSource: testResult.source
        }
      };

    } catch (error) {
      return {
        phase: 'template-bank',
        success: false,
        details: 'Template-Bank integration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Phase 2: Knowledge Integration
   */
  private async runKnowledgeIntegrationPhase(config: MigrationConfig): Promise<MigrationResult> {
    console.log('🧠 Phase 2: Knowledge Integration');

    try {
      // Test knowledge system loading
      const { loadKnowledge, preselectCards } = await import('@/knowledge/knowledge');
      const { cards, blueprints } = await loadKnowledge();
      
      console.log(`  📚 Loaded ${cards.length} knowledge cards`);
      console.log(`  📐 Loaded ${blueprints.length} blueprints`);

      // Test knowledge-based generation
      const testCards = preselectCards(cards, {
        grade: 3,
        quarter: "Q1",
        wantDomains: ["Zahlen & Operationen"]
      });

      console.log(`  🎯 Preselected ${testCards.length} relevant cards for Grade 3 Q1`);

      return {
        phase: 'knowledge-integration',
        success: true,
        details: `Knowledge system active. Cards: ${cards.length}, Blueprints: ${blueprints.length}`,
        metrics: {
          totalCards: cards.length,
          totalBlueprints: blueprints.length,
          testPreselection: testCards.length
        }
      };

    } catch (error) {
      return {
        phase: 'knowledge-integration',
        success: false,
        details: 'Knowledge integration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Phase 3: Legacy Cleanup
   */
  private async runLegacyCleanupPhase(config: MigrationConfig): Promise<MigrationResult> {
    console.log('🧹 Phase 3: Legacy Cleanup');

    try {
      // Analyze template usage
      const { data: templateUsage, error } = await supabase
        .from('templates')
        .select('domain, grade, status')
        .eq('status', 'ACTIVE');

      if (error) throw error;

      const usageStats = templateUsage?.reduce((acc: any, template) => {
        const key = `${template.domain}-${template.grade}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log('  📊 Template usage analysis:', usageStats);

      // Mark legacy hooks as deprecated (in comments/logging)
      console.log('  🏷️ Legacy hooks identified for deprecation:');
      console.log('    - useBalancedQuestionGeneration');
      console.log('    - useAdvancedQuestionGeneration (if exists)');
      console.log('    - Legacy template files in utils/templates/');

      // TODO: Implement gradual deprecation warnings
      // This would involve adding deprecation warnings to legacy hooks

      return {
        phase: 'legacy-cleanup',
        success: true,
        details: `Cleanup analysis completed. Active templates: ${templateUsage?.length || 0}`,
        metrics: {
          activeTemplates: templateUsage?.length || 0,
          usageDistribution: usageStats,
          deprecatedHooks: ['useBalancedQuestionGeneration'],
          legacyFiles: ['utils/templates/mathTemplates.ts', 'utils/templates/germanTemplates.ts']
        }
      };

    } catch (error) {
      return {
        phase: 'legacy-cleanup',
        success: false,
        details: 'Legacy cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Phase 4: Optimization
   */
  private async runOptimizationPhase(config: MigrationConfig): Promise<MigrationResult> {
    console.log('⚡ Phase 4: Optimization');

    try {
      // Performance testing
      const startTime = Date.now();
      
      const testResults = await Promise.all([
        this.templateBankService.generateQuestions('mathematik', 1, 'Q1', 3),
        this.templateBankService.generateQuestions('mathematik', 3, 'Q1', 3),
        this.templateBankService.generateQuestions('mathematik', 5, 'Q1', 3)
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`  ⏱️ Performance test: ${totalTime}ms for 3 parallel generations`);

      // Cache performance
      this.templateBankService.clearCache();
      console.log('  🧹 Cache cleared for fresh start');

      // Quality metrics analysis
      const qualityMetrics = testResults.map(result => ({
        source: result.source,
        quality: result.qualityMetrics.averageQuality,
        coverage: result.qualityMetrics.templateCoverage,
        diversity: result.qualityMetrics.domainDiversity
      }));

      console.log('  📈 Quality metrics:', qualityMetrics);

      return {
        phase: 'optimization',
        success: true,
        details: `Optimization completed. Performance: ${totalTime}ms, Quality average: ${qualityMetrics.reduce((sum, m) => sum + m.quality, 0) / qualityMetrics.length}`,
        metrics: {
          performanceMs: totalTime,
          testResults: testResults.length,
          qualityMetrics,
          cacheCleared: true
        }
      };

    } catch (error) {
      return {
        phase: 'optimization',
        success: false,
        details: 'Optimization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick test of the Template-Bank system
   */
  async quickTest(category = 'mathematik', grade = 3): Promise<any> {
    console.log(`🧪 Quick Template-Bank test: ${category} Grade ${grade}`);
    
    try {
      const result = await this.templateBankService.generateQuestions(
        category,
        grade,
        'Q1',
        3,
        { enableQualityControl: true, minQualityThreshold: 0.7, diversityWeight: 0.3, fallbackToLegacy: true }
      );

      console.log(`✅ Quick test successful: ${result.questions.length} questions from ${result.source}`);
      return {
        success: true,
        questionsGenerated: result.questions.length,
        source: result.source,
        qualityMetrics: result.qualityMetrics
      };

    } catch (error) {
      console.error('❌ Quick test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export convenience functions
export const migrationRunner = MigrationRunner.getInstance();

export async function runQuickMigration() {
  return await migrationRunner.runMigration({
    phases: ['template-bank', 'knowledge-integration']
  });
}

export async function runFullMigration() {
  return await migrationRunner.runMigration();
}

export async function testTemplateBankSystem() {
  return await migrationRunner.quickTest();
}