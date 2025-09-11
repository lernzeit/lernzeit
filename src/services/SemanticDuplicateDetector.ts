import { supabase } from '@/lib/supabase';

export interface SemanticMatch {
  templateId: string;
  similarity: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  matches: SemanticMatch[];
  recommendations: string[];
}

class SemanticDuplicateDetector {
  private readonly EXACT_THRESHOLD = 0.95;
  private readonly HIGH_THRESHOLD = 0.85;
  private readonly MEDIUM_THRESHOLD = 0.7;
  private readonly LOW_THRESHOLD = 0.5;

  async checkForDuplicates(
    template: any,
    context: { grade: number; domain: string; subcategory: string }
  ): Promise<DuplicateCheckResult> {
    try {
      // Get existing templates from same context
      const existingTemplates = await this.getExistingTemplates(context);
      
      const matches: SemanticMatch[] = [];
      
      for (const existing of existingTemplates) {
        const similarity = this.calculateSemanticSimilarity(template, existing);
        
        if (similarity >= this.LOW_THRESHOLD) {
          const matchType = this.getMatchType(similarity);
          const reasons = this.analyzeMatchReasons(template, existing);
          
          matches.push({
            templateId: existing.id,
            similarity,
            matchType,
            reasons
          });
        }
      }

      // Sort by similarity (highest first)
      matches.sort((a, b) => b.similarity - a.similarity);

      const highestSimilarity = matches.length > 0 ? matches[0].similarity : 0;
      const isDuplicate = highestSimilarity >= this.HIGH_THRESHOLD;
      
      const recommendations = this.generateRecommendations(matches, template);

      return {
        isDuplicate,
        confidence: highestSimilarity,
        matches: matches.slice(0, 5), // Return top 5 matches
        recommendations
      };
    } catch (error) {
      console.error('Error checking for semantic duplicates:', error);
      return {
        isDuplicate: false,
        confidence: 0,
        matches: [],
        recommendations: ['Fehler bei Duplikatsprüfung - manuelle Überprüfung empfohlen']
      };
    }
  }

  private async getExistingTemplates(context: { grade: number; domain: string; subcategory: string }) {
    const { data, error } = await supabase
      .from('templates')
      .select('id, student_prompt, solution, variables, question_type, distractors')
      .eq('grade', context.grade)
      .eq('domain', context.domain)
      .eq('subcategory', context.subcategory)
      .eq('status', 'ACTIVE')
      .limit(200);

    if (error) {
      console.error('Error fetching existing templates:', error);
      return [];
    }

    return data || [];
  }

  private calculateSemanticSimilarity(template1: any, template2: any): number {
    const weights = {
      prompt: 0.5,
      solution: 0.2,
      structure: 0.15,
      variables: 0.15
    };

    let totalScore = 0;

    // 1. Prompt similarity
    const promptSimilarity = this.calculateTextSimilarity(
      template1.student_prompt || '', 
      template2.student_prompt || ''
    );
    totalScore += promptSimilarity * weights.prompt;

    // 2. Solution similarity  
    const solutionSimilarity = this.calculateSolutionSimilarity(
      template1.solution,
      template2.solution
    );
    totalScore += solutionSimilarity * weights.solution;

    // 3. Structural similarity
    const structuralSimilarity = this.calculateStructuralSimilarity(template1, template2);
    totalScore += structuralSimilarity * weights.structure;

    // 4. Variable pattern similarity
    const variableSimilarity = this.calculateVariableSimilarity(
      template1.variables || {},
      template2.variables || {}
    );
    totalScore += variableSimilarity * weights.variables;

    return Math.min(totalScore, 1.0);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Normalize texts
    const normalize = (text: string) => 
      text.toLowerCase()
          .replace(/\d+/g, 'NUM') // Replace numbers with placeholder
          .replace(/[^\w\s]/g, ' ') // Remove punctuation
          .split(/\s+/)
          .filter(word => word.length > 2); // Keep meaningful words

    const words1 = normalize(text1);
    const words2 = normalize(text2);

    // Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    // Also check for phrase similarity
    const phraseSimilarity = this.calculatePhraseSimilarity(words1, words2);
    const jaccardSimilarity = intersection.size / union.size;

    return Math.max(jaccardSimilarity, phraseSimilarity);
  }

  private calculatePhraseSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    let maxSimilarity = 0;

    // Check for common phrases (3-grams)
    for (let i = 0; i <= words1.length - 3; i++) {
      const phrase1 = words1.slice(i, i + 3).join(' ');
      
      for (let j = 0; j <= words2.length - 3; j++) {
        const phrase2 = words2.slice(j, j + 3).join(' ');
        
        if (phrase1 === phrase2) {
          maxSimilarity = Math.max(maxSimilarity, 0.8);
        }
      }
    }

    return maxSimilarity;
  }

  private calculateSolutionSimilarity(solution1: any, solution2: any): number {
    if (!solution1 || !solution2) return 0;

    // If both are numbers
    if (typeof solution1 === 'number' && typeof solution2 === 'number') {
      return solution1 === solution2 ? 1.0 : 0.0;
    }

    // If both are strings
    if (typeof solution1 === 'string' && typeof solution2 === 'string') {
      return solution1.toLowerCase() === solution2.toLowerCase() ? 1.0 : 0.0;
    }

    return 0;
  }

  private calculateStructuralSimilarity(template1: any, template2: any): number {
    let score = 0;
    let factors = 0;

    // Question type
    if (template1.question_type && template2.question_type) {
      factors++;
      if (template1.question_type === template2.question_type) {
        score += 0.5;
      }
    }

    // For multiple choice, check option count and structure
    if (template1.question_type === 'MULTIPLE_CHOICE' && 
        template2.question_type === 'MULTIPLE_CHOICE') {
      factors++;
      
      const options1 = template1.distractors?.length || 0;
      const options2 = template2.distractors?.length || 0;
      
      if (options1 === options2) {
        score += 0.3;
      }
    }

    // Check for similar mathematical patterns
    const pattern1 = this.extractMathematicalPattern(template1.student_prompt || '');
    const pattern2 = this.extractMathematicalPattern(template2.student_prompt || '');
    
    if (pattern1 && pattern2) {
      factors++;
      if (pattern1 === pattern2) {
        score += 0.4;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  private calculateVariableSimilarity(vars1: any, vars2: any): number {
    const keys1 = Object.keys(vars1);
    const keys2 = Object.keys(vars2);

    if (keys1.length === 0 && keys2.length === 0) return 1.0;
    if (keys1.length === 0 || keys2.length === 0) return 0.0;

    // Check for common variable names
    const commonKeys = keys1.filter(key => keys2.includes(key));
    const allKeys = [...new Set([...keys1, ...keys2])];

    const keysSimilarity = commonKeys.length / allKeys.length;

    // Check for similar value ranges/types
    let typeSimilarity = 0;
    let typeCount = 0;

    for (const key of commonKeys) {
      typeCount++;
      const val1 = vars1[key];
      const val2 = vars2[key];

      if (typeof val1 === typeof val2) {
        typeSimilarity += 0.5;
        
        // Check value ranges for numbers
        if (typeof val1 === 'number' && typeof val2 === 'number') {
          const range1 = this.getNumberRange(val1);
          const range2 = this.getNumberRange(val2);
          if (range1 === range2) {
            typeSimilarity += 0.3;
          }
        }
      }
    }

    const avgTypeSimilarity = typeCount > 0 ? typeSimilarity / typeCount : 0;

    return (keysSimilarity * 0.7) + (avgTypeSimilarity * 0.3);
  }

  private extractMathematicalPattern(text: string): string | null {
    // Extract basic mathematical patterns
    if (/\baddier|\+/.test(text)) return 'addition';
    if (/\bsubtrahier|\-/.test(text)) return 'subtraction';  
    if (/\bmultiplizi|×|\*/.test(text)) return 'multiplication';
    if (/\bdividi|÷|\//.test(text)) return 'division';
    if (/\bvergleich|\bgrößer|\bkleiner/.test(text)) return 'comparison';
    if (/\brund|\bschätz/.test(text)) return 'estimation';
    
    return null;
  }

  private getNumberRange(num: number): string {
    if (num <= 10) return '1-10';
    if (num <= 20) return '11-20';
    if (num <= 100) return '21-100';
    if (num <= 1000) return '101-1000';
    return '1000+';
  }

  private getMatchType(similarity: number): 'exact' | 'high' | 'medium' | 'low' {
    if (similarity >= this.EXACT_THRESHOLD) return 'exact';
    if (similarity >= this.HIGH_THRESHOLD) return 'high';
    if (similarity >= this.MEDIUM_THRESHOLD) return 'medium';
    return 'low';
  }

  private analyzeMatchReasons(template1: any, template2: any): string[] {
    const reasons: string[] = [];

    // Check prompt similarity
    const promptSim = this.calculateTextSimilarity(
      template1.student_prompt || '', 
      template2.student_prompt || ''
    );
    if (promptSim > 0.8) {
      reasons.push('Sehr ähnliche Fragestellung');
    }

    // Check solution similarity
    if (template1.solution === template2.solution) {
      reasons.push('Identische Lösung');
    }

    // Check variable patterns
    const varSim = this.calculateVariableSimilarity(
      template1.variables || {}, 
      template2.variables || {}
    );
    if (varSim > 0.8) {
      reasons.push('Ähnliche Parameter-Struktur');
    }

    // Check mathematical pattern
    const pattern1 = this.extractMathematicalPattern(template1.student_prompt || '');
    const pattern2 = this.extractMathematicalPattern(template2.student_prompt || '');
    if (pattern1 && pattern1 === pattern2) {
      reasons.push(`Gleicher mathematischer Typ: ${pattern1}`);
    }

    return reasons;
  }

  private generateRecommendations(matches: SemanticMatch[], template: any): string[] {
    const recommendations: string[] = [];

    const exactMatches = matches.filter(m => m.matchType === 'exact');
    const highMatches = matches.filter(m => m.matchType === 'high');

    if (exactMatches.length > 0) {
      recommendations.push('❌ Template abgelehnt - Exaktes Duplikat gefunden');
      recommendations.push(`Identisch mit Template ${exactMatches[0].templateId}`);
      return recommendations;
    }

    if (highMatches.length > 0) {
      recommendations.push('⚠️ Hohes Duplikatsrisiko - Überarbeitung empfohlen');
      
      const commonReasons = this.getMostCommonReasons(highMatches);
      for (const reason of commonReasons) {
        switch (reason) {
          case 'Sehr ähnliche Fragestellung':
            recommendations.push('• Formulierung der Frage variieren');
            break;
          case 'Identische Lösung':
            recommendations.push('• Zahlenwerte oder Parameter anpassen');
            break;
          case 'Ähnliche Parameter-Struktur':
            recommendations.push('• Andere Variable oder Kontext verwenden');
            break;
        }
      }
    }

    if (matches.length > 0) {
      recommendations.push(`Ähnliche Templates gefunden: ${matches.slice(0,3).map(m => m.templateId).join(', ')}`);
    }

    return recommendations;
  }

  private getMostCommonReasons(matches: SemanticMatch[]): string[] {
    const reasonCounts: Record<string, number> = {};
    
    for (const match of matches) {
      for (const reason of match.reasons) {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }

    return Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([reason]) => reason);
  }
}

export const semanticDuplicateDetector = new SemanticDuplicateDetector();