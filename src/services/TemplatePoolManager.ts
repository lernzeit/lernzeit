import { supabase } from '@/integrations/supabase/client';

interface TemplateGap {
  grade: number;
  quarter_app: string;
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH';
  current_count: number;
  target_count: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CoverageStats {
  totalCombinations: number;
  coveredCombinations: number;
  coveragePercentage: number;
  gaps: TemplateGap[];
  priorities: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export class TemplatePoolManager {
  private static readonly TARGET_TEMPLATES_PER_COMBINATION = 15;
  private static readonly MIN_TEMPLATES_PER_COMBINATION = 5;

  static async analyzeCoverage(): Promise<CoverageStats> {
    console.log('🔍 Analyzing template coverage...');
    
    try {
      // Get all active templates
      const { data: templates, error } = await supabase
        .from('templates')
        .select('grade, quarter_app, domain, difficulty, question_type')
        .eq('status', 'ACTIVE');

      if (error) throw error;

      // Define expected combinations
      const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const domains = [
        'Zahlen & Operationen',
        'Raum & Form', 
        'Größen & Messen',
        'Daten & Zufall',
        'Gleichungen & Funktionen'
      ];
      const difficulties = ['easy', 'medium', 'hard'];
      const questionTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH'];

      // Generate all possible combinations
      const expectedCombinations: any[] = [];
      grades.forEach(grade => {
        quarters.forEach(quarter => {
          domains.forEach(domain => {
            // Skip domains not applicable to certain grades
            if (domain === 'Gleichungen & Funktionen' && grade < 4) return;
            if (domain === 'Daten & Zufall' && grade < 2) return;
            
            difficulties.forEach(difficulty => {
              questionTypes.forEach(questionType => {
                expectedCombinations.push({
                  grade,
                  quarter_app: quarter,
                  domain,
                  difficulty,
                  question_type: questionType,
                  priority: this.getPriority(grade)
                });
              });
            });
          });
        });
      });

      // Count existing templates per combination
      const templateCounts = new Map<string, number>();
      templates?.forEach(template => {
        const key = `${template.grade}-${template.quarter_app}-${template.domain}-${template.difficulty}-${template.question_type}`;
        templateCounts.set(key, (templateCounts.get(key) || 0) + 1);
      });

      // Identify gaps
      const gaps: TemplateGap[] = [];
      expectedCombinations.forEach(combo => {
        const key = `${combo.grade}-${combo.quarter_app}-${combo.domain}-${combo.difficulty}-${combo.question_type}`;
        const currentCount = templateCounts.get(key) || 0;
        
        if (currentCount < this.TARGET_TEMPLATES_PER_COMBINATION) {
          gaps.push({
            ...combo,
            current_count: currentCount,
            target_count: this.TARGET_TEMPLATES_PER_COMBINATION
          });
        }
      });

      // Calculate coverage stats
      const coveredCombinations = expectedCombinations.length - gaps.filter(gap => gap.current_count === 0).length;
      const coveragePercentage = (coveredCombinations / expectedCombinations.length) * 100;

      const priorities = {
        HIGH: gaps.filter(gap => gap.priority === 'HIGH').length,
        MEDIUM: gaps.filter(gap => gap.priority === 'MEDIUM').length,
        LOW: gaps.filter(gap => gap.priority === 'LOW').length
      };

      console.log(`📊 Coverage Analysis Complete:
        - Total Combinations: ${expectedCombinations.length}
        - Covered: ${coveredCombinations} (${coveragePercentage.toFixed(1)}%)
        - Gaps: ${gaps.length}
        - HIGH Priority: ${priorities.HIGH}
        - MEDIUM Priority: ${priorities.MEDIUM}  
        - LOW Priority: ${priorities.LOW}`);

      return {
        totalCombinations: expectedCombinations.length,
        coveredCombinations,
        coveragePercentage,
        gaps,
        priorities
      };
    } catch (error) {
      console.error('❌ Error analyzing coverage:', error);
      throw error;
    }
  }

  static async getPriorityQueue(limit = 100): Promise<TemplateGap[]> {
    const coverage = await this.analyzeCoverage();
    
    // Sort gaps by priority and current count (lowest first)
    const prioritizedGaps = coverage.gaps
      .sort((a, b) => {
        // First sort by priority
        const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by current count (fill gaps first)
        return a.current_count - b.current_count;
      })
      .slice(0, limit);

    console.log(`🎯 Priority Queue Generated: ${prioritizedGaps.length} gaps ready for generation`);
    return prioritizedGaps;
  }

  private static getPriority(grade: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (grade >= 1 && grade <= 4) return 'HIGH';
    if (grade >= 5 && grade <= 6) return 'MEDIUM';
    return 'LOW';
  }

  static async getTemplateDistribution(grade?: number): Promise<any> {
    const query = supabase
      .from('templates')
      .select('grade, quarter_app, domain, difficulty, question_type')
      .eq('status', 'ACTIVE');

    if (grade) {
      query.eq('grade', grade);
    }

    const { data: templates, error } = await query;
    if (error) throw error;

    const distribution = {
      byGrade: {} as Record<number, number>,
      byQuarter: {} as Record<string, number>,
      byDomain: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      byQuestionType: {} as Record<string, number>
    };

    templates?.forEach(template => {
      distribution.byGrade[template.grade] = (distribution.byGrade[template.grade] || 0) + 1;
      distribution.byQuarter[template.quarter_app] = (distribution.byQuarter[template.quarter_app] || 0) + 1;
      distribution.byDomain[template.domain] = (distribution.byDomain[template.domain] || 0) + 1;
      distribution.byDifficulty[template.difficulty] = (distribution.byDifficulty[template.difficulty] || 0) + 1;
      distribution.byQuestionType[template.question_type] = (distribution.byQuestionType[template.question_type] || 0) + 1;
    });

    return distribution;
  }

  static async ensureMinimumTemplates(grade: number, quarter: string, domain: string): Promise<boolean> {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id')
      .eq('grade', grade)
      .eq('quarter_app', quarter)
      .eq('domain', domain)
      .eq('status', 'ACTIVE');

    if (error) {
      console.error('Error checking template count:', error);
      return false;
    }

    const currentCount = templates?.length || 0;
    return currentCount >= this.MIN_TEMPLATES_PER_COMBINATION;
  }
}