// Template Bank Maintenance & Analytics
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceStats {
  total_templates: number;
  active_templates: number;
  archived_templates: number;
  avg_quality_score: number;
  coverage_by_domain: Record<string, number>;
  coverage_by_grade: Record<string, number>;
  low_coverage_areas: Array<{
    domain: string;
    grade: number;
    count: number;
    target: number;
  }>;
}

interface PruningResult {
  pruned_count: number;
  archived_templates: string[];
  criteria_used: string[];
}

export class TemplateBankMaintenance {
  private static readonly TARGET_TEMPLATES_PER_DOMAIN_GRADE = 60;
  private static readonly MIN_PLAYS_FOR_EVALUATION = 10;
  private static readonly POOR_PERFORMANCE_THRESHOLD = 0.3;
  private static readonly LOW_RATING_THRESHOLD = 2.0;

  // Get comprehensive maintenance statistics
  static async getMaintenanceStats(): Promise<MaintenanceStats> {
    console.log('📊 Calculating template bank maintenance statistics...');

    try {
      // Get overall template counts
      const { data: allTemplates, error: allError } = await supabase
        .from('templates')
        .select('id, status, domain, grade, plays, correct, rating_sum, rating_count');

      if (allError) {
        console.error('Error fetching templates:', allError);
        throw allError;
      }

      const templates = allTemplates || [];
      const activeTemplates = templates.filter(t => t.status === 'ACTIVE');
      const archivedTemplates = templates.filter(t => t.status === 'ARCHIVED');

      // Calculate average quality score
      const templatesWithRating = activeTemplates.filter(t => t.rating_count > 0);
      const avgQuality = templatesWithRating.length > 0 
        ? templatesWithRating.reduce((sum, t) => sum + (t.rating_sum / t.rating_count), 0) / templatesWithRating.length
        : 0;

      // Coverage by domain
      const domainCoverage: Record<string, number> = {};
      activeTemplates.forEach(template => {
        domainCoverage[template.domain] = (domainCoverage[template.domain] || 0) + 1;
      });

      // Coverage by grade
      const gradeCoverage: Record<string, number> = {};
      activeTemplates.forEach(template => {
        gradeCoverage[template.grade.toString()] = (gradeCoverage[template.grade.toString()] || 0) + 1;
      });

      // Identify low coverage areas
      const lowCoverageAreas: Array<{
        domain: string;
        grade: number;
        count: number;
        target: number;
      }> = [];

      const domains = ['Zahlen & Operationen', 'Größen & Messen', 'Raum & Form', 'Gleichungen & Funktionen', 'Daten & Zufall'];
      const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      for (const domain of domains) {
        for (const grade of grades) {
          const count = activeTemplates.filter(t => t.domain === domain && t.grade === grade).length;
          if (count < this.TARGET_TEMPLATES_PER_DOMAIN_GRADE) {
            lowCoverageAreas.push({
              domain,
              grade,
              count,
              target: this.TARGET_TEMPLATES_PER_DOMAIN_GRADE
            });
          }
        }
      }

      const stats: MaintenanceStats = {
        total_templates: templates.length,
        active_templates: activeTemplates.length,
        archived_templates: archivedTemplates.length,
        avg_quality_score: avgQuality,
        coverage_by_domain: domainCoverage,
        coverage_by_grade: gradeCoverage,
        low_coverage_areas: lowCoverageAreas.sort((a, b) => a.count - b.count)
      };

      console.log('📈 Maintenance stats calculated:', {
        total: stats.total_templates,
        active: stats.active_templates,
        quality: stats.avg_quality_score.toFixed(2),
        low_coverage: stats.low_coverage_areas.length
      });

      return stats;

    } catch (error) {
      console.error('Failed to calculate maintenance stats:', error);
      throw error;
    }
  }

  // Prune poorly performing templates
  static async prunePoorTemplates(): Promise<PruningResult> {
    console.log('🔧 Starting template pruning process...');

    try {
      // Find templates with poor performance
      const { data: candidates, error } = await supabase
        .from('templates')
        .select('id, student_prompt, domain, grade, plays, correct, rating_sum, rating_count')
        .eq('status', 'ACTIVE')
        .gte('plays', this.MIN_PLAYS_FOR_EVALUATION);

      if (error) {
        console.error('Error fetching pruning candidates:', error);
        throw error;
      }

      const templatesForPruning: string[] = [];
      const criteriaUsed: string[] = [];

      if (candidates) {
        for (const template of candidates) {
          let shouldPrune = false;
          const reasons: string[] = [];

          // Low success rate
          const successRate = template.plays > 0 ? template.correct / template.plays : 0;
          if (successRate < this.POOR_PERFORMANCE_THRESHOLD) {
            shouldPrune = true;
            reasons.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
          }

          // Low rating
          if (template.rating_count > 0) {
            const avgRating = template.rating_sum / template.rating_count;
            if (avgRating < this.LOW_RATING_THRESHOLD) {
              shouldPrune = true;
              reasons.push(`Low rating: ${avgRating.toFixed(1)}/5`);
            }
          }

          if (shouldPrune) {
            templatesForPruning.push(template.id);
            console.log(`🗑️ Marking for pruning: ${template.student_prompt} (${reasons.join(', ')})`);
            criteriaUsed.push(...reasons);
          }
        }
      }

      // Archive the poor performing templates
      if (templatesForPruning.length > 0) {
        const { error: archiveError } = await supabase
          .from('templates')
          .update({ status: 'ARCHIVED' })
          .in('id', templatesForPruning);

        if (archiveError) {
          console.error('Error archiving templates:', archiveError);
          throw archiveError;
        }

        console.log(`✅ Archived ${templatesForPruning.length} poor performing templates`);
      }

      return {
        pruned_count: templatesForPruning.length,
        archived_templates: templatesForPruning,
        criteria_used: [...new Set(criteriaUsed)]
      };

    } catch (error) {
      console.error('Template pruning failed:', error);
      throw error;
    }
  }

  // Trigger template generation for low coverage areas
  static async topUpLowCoverageAreas(): Promise<void> {
    console.log('🚀 Starting template top-up for low coverage areas...');

    try {
      const stats = await this.getMaintenanceStats();
      const priorityAreas = stats.low_coverage_areas
        .filter(area => area.count < area.target * 0.5) // Focus on areas with less than 50% coverage
        .slice(0, 10); // Process top 10 priority areas

      for (const area of priorityAreas) {
        console.log(`📝 Generating templates for ${area.domain} Grade ${area.grade} (${area.count}/${area.target})`);

        try {
          const templatesNeeded = Math.min(15, area.target - area.count); // Generate up to 15 at a time
          
          const { data, error } = await supabase.functions.invoke('seed_templates', {
            body: {
              grade: area.grade,
              domain: area.domain,
              n: templatesNeeded
            }
          });

          if (error) {
            console.error(`Failed to generate templates for ${area.domain} Grade ${area.grade}:`, error);
          } else {
            console.log(`✅ Template generation triggered for ${area.domain} Grade ${area.grade}`);
          }

          // Add delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Error processing ${area.domain} Grade ${area.grade}:`, error);
        }
      }

      console.log(`🎉 Top-up process completed for ${priorityAreas.length} areas`);

    } catch (error) {
      console.error('Template top-up failed:', error);
      throw error;
    }
  }

  // Run full maintenance cycle
  static async runMaintenanceCycle(): Promise<{
    stats: MaintenanceStats;
    pruning: PruningResult;
    topUp: boolean;
  }> {
    console.log('🔧 Starting full template bank maintenance cycle...');

    try {
      // Step 1: Get current stats
      const initialStats = await this.getMaintenanceStats();
      console.log(`📊 Initial stats: ${initialStats.active_templates} active templates`);

      // Step 2: Prune poor performers
      const pruningResult = await this.prunePoorTemplates();
      console.log(`🗑️ Pruned ${pruningResult.pruned_count} templates`);

      // Step 3: Top up low coverage areas
      let topUpSuccess = true;
      try {
        await this.topUpLowCoverageAreas();
        console.log('🚀 Top-up process completed');
      } catch (error) {
        console.error('Top-up process failed:', error);
        topUpSuccess = false;
      }

      // Step 4: Get final stats
      const finalStats = await this.getMaintenanceStats();
      console.log(`📈 Final stats: ${finalStats.active_templates} active templates`);

      return {
        stats: finalStats,
        pruning: pruningResult,
        topUp: topUpSuccess
      };

    } catch (error) {
      console.error('Maintenance cycle failed:', error);
      throw error;
    }
  }

  // Get template bank health score (0-100)
  static async getHealthScore(): Promise<{
    score: number;
    factors: Record<string, { score: number; weight: number; description: string }>;
  }> {
    try {
      const stats = await this.getMaintenanceStats();
      
      const factors = {
        coverage: {
          score: Math.min(100, (stats.active_templates / (5 * 10 * this.TARGET_TEMPLATES_PER_DOMAIN_GRADE)) * 100),
          weight: 0.4,
          description: 'Template coverage across domains and grades'
        },
        quality: {
          score: Math.min(100, (stats.avg_quality_score / 5) * 100),
          weight: 0.3,
          description: 'Average quality rating of templates'
        },
        diversity: {
          score: Math.min(100, (Object.keys(stats.coverage_by_domain).length / 5) * 100),
          weight: 0.2,
          description: 'Domain diversity coverage'
        },
        balance: {
          score: 100 - (stats.low_coverage_areas.length / (5 * 10)) * 100,
          weight: 0.1,
          description: 'Balance across all areas'
        }
      };

      const overallScore = Object.values(factors).reduce(
        (total, factor) => total + (factor.score * factor.weight), 
        0
      );

      return {
        score: Math.round(overallScore),
        factors
      };

    } catch (error) {
      console.error('Failed to calculate health score:', error);
      return {
        score: 0,
        factors: {}
      };
    }
  }
}