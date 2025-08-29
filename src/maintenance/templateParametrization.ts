/**
 * Template Parametrization System
 * Converts hardcoded templates to parametrized ones for diversity
 */

import { supabase } from '@/lib/supabase';

export interface ParametrizationRule {
  pattern: RegExp;
  replacements: {
    [key: string]: {
      type: 'number' | 'word';
      range?: [number, number];
      values?: string[];
      gradeAdjusted?: boolean;
    };
  };
  calculationLogic: string;
}

export class TemplateParametrizationService {
  
  /**
   * Parametrization rules for common hardcoded templates
   */
  private static readonly PARAMETRIZATION_RULES: ParametrizationRule[] = [
    // "Ein Bäcker backt pro Stunde X Brote. Wie viele Brote backt er in Y Stunden?"
    {
      pattern: /Ein (\w+) backt pro Stunde (\d+) (\w+)\. .*?(\d+) Stunden?/i,
      replacements: {
        profession: { type: 'word', values: ['Bäcker', 'Koch', 'Konditor'] },
        rate: { type: 'number', range: [8, 20], gradeAdjusted: true },
        item: { type: 'word', values: ['Brote', 'Brötchen', 'Kuchen', 'Kekse'] },
        hours: { type: 'number', range: [2, 8], gradeAdjusted: true }
      },
      calculationLogic: 'multiplication'
    },
    
    // Rectangle area: "Ein Rechteck hat die Länge X cm und die Breite Y cm. Wie groß ist die Fläche?"
    {
      pattern: /Ein Rechteck hat die Länge (\d+) cm und die Breite (\d+) cm.*?Fläche/i,
      replacements: {
        length: { type: 'number', range: [5, 25], gradeAdjusted: true },
        width: { type: 'number', range: [3, 20], gradeAdjusted: true }
      },
      calculationLogic: 'rectangle_area'
    },
    
    // Rectangle perimeter: "Ein Rechteck hat die Länge X cm und die Breite Y cm. Wie groß ist der Umfang?"
    {
      pattern: /Ein Rechteck hat die Länge (\d+) cm und die Breite (\d+) cm.*?Umfang/i,
      replacements: {
        length: { type: 'number', range: [5, 25], gradeAdjusted: true },
        width: { type: 'number', range: [3, 20], gradeAdjusted: true }
      },
      calculationLogic: 'rectangle_perimeter'
    },
    
    // Percentage problems: "In einer Klasse sind X Schüler. Y% davon sind Mädchen. Wie viele Mädchen sind das?"
    {
      pattern: /In einer Klasse sind (\d+) Schüler.*?(\d+)%.*?Mädchen.*?das/i,
      replacements: {
        total: { type: 'number', range: [20, 40], gradeAdjusted: true },
        percentage: { type: 'number', range: [25, 75], gradeAdjusted: false }
      },
      calculationLogic: 'percentage'
    },
    
    // Basic addition: "Anna hat X Euro und bekommt Y Euro dazu. Wie viel hat sie dann?"
    {
      pattern: /(\w+) hat (\d+) Euro.*?(\d+) Euro dazu/i,
      replacements: {
        name: { type: 'word', values: ['Anna', 'Ben', 'Clara', 'David', 'Emma'] },
        amount1: { type: 'number', range: [5, 50], gradeAdjusted: true },
        amount2: { type: 'number', range: [3, 30], gradeAdjusted: true }
      },
      calculationLogic: 'addition'
    },
    
    // Basic subtraction: "Ein Bäcker backt X Brötchen. Er verkauft Y. Wie viele bleiben übrig?"
    {
      pattern: /Ein (\w+) backt (\d+) (\w+)\. Er verkauft (\d+)/i,
      replacements: {
        profession: { type: 'word', values: ['Bäcker', 'Koch', 'Verkäufer'] },
        total: { type: 'number', range: [20, 60], gradeAdjusted: true },
        item: { type: 'word', values: ['Brötchen', 'Kuchen', 'Brote'] },
        sold: { type: 'number', range: [5, 25], gradeAdjusted: true }
      },
      calculationLogic: 'subtraction'
    }
  ];
  
  /**
   * Parametrize a single hardcoded template
   */
  static parametrizeTemplate(template: any): {
    parametrizedPrompt: string;
    parameterDefinitions: Record<string, any>;
    calculationLogic: string;
  } | null {
    
    for (const rule of this.PARAMETRIZATION_RULES) {
      const match = template.student_prompt.match(rule.pattern);
      if (match) {
        
        // Create parametrized prompt by replacing numbers with placeholders
        let parametrizedPrompt = template.student_prompt;
        const parameterDefinitions: Record<string, any> = {};
        
        // Replace matched groups with parameter placeholders
        Object.entries(rule.replacements).forEach(([paramName, config], index) => {
          if (config.type === 'number') {
            // Replace the number in the original position
            const numberMatch = match[index + 1];
            if (numberMatch && !isNaN(parseInt(numberMatch))) {
              parametrizedPrompt = parametrizedPrompt.replace(numberMatch, `{${paramName}}`);
              
              // Adjust range based on grade if needed
              let range = config.range || [1, 100];
              if (config.gradeAdjusted && template.grade) {
                range = this.adjustRangeForGrade(range, template.grade);
              }
              
              parameterDefinitions[paramName] = {
                type: 'number',
                range: range
              };
            }
          } else if (config.type === 'word') {
            // For words, use first value as default but allow variation
            const wordMatch = match[index + 1];
            if (wordMatch && config.values?.includes(wordMatch)) {
              parametrizedPrompt = parametrizedPrompt.replace(wordMatch, `{${paramName}}`);
              parameterDefinitions[paramName] = {
                type: 'word',
                values: config.values
              };
            }
          }
        });
        
        return {
          parametrizedPrompt,
          parameterDefinitions,
          calculationLogic: rule.calculationLogic
        };
      }
    }
    
    return null;
  }
  
  /**
   * Adjust number ranges based on grade level
   */
  private static adjustRangeForGrade(baseRange: [number, number], grade: number): [number, number] {
    const [min, max] = baseRange;
    
    if (grade <= 2) {
      // Grades 1-2: Smaller numbers
      return [Math.max(1, Math.floor(min * 0.3)), Math.max(10, Math.floor(max * 0.3))];
    } else if (grade <= 4) {
      // Grades 3-4: Medium numbers
      return [Math.max(1, Math.floor(min * 0.6)), Math.max(20, Math.floor(max * 0.6))];
    } else if (grade <= 6) {
      // Grades 5-6: Normal range
      return baseRange;
    } else {
      // Grades 7+: Larger numbers
      return [Math.floor(min * 1.5), Math.floor(max * 1.8)];
    }
  }
  
  /**
   * Batch parametrize templates in the database
   */
  static async parametrizeHardcodedTemplates(limit: number = 100): Promise<{
    processed: number;
    parametrized: number;
    errors: string[];
  }> {
    
    const errors: string[] = [];
    let processed = 0;
    let parametrized = 0;
    
    try {
      // Fetch hardcoded templates
      const { data: templates, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_parametrized', false)
        .limit(limit);
      
      if (error) {
        errors.push(`Database fetch error: ${error.message}`);
        return { processed, parametrized, errors };
      }
      
      if (!templates || templates.length === 0) {
        return { processed, parametrized, errors };
      }
      
      // Process each template and update if parametrizable
      for (const template of templates) {
        processed++;
        
        const result = this.parametrizeTemplate(template);
        if (result) {
          // Update template in database
          const { error: updateError } = await supabase
            .from('templates')
            .update({
              student_prompt: result.parametrizedPrompt,
              parameter_definitions: result.parameterDefinitions,
              calculation_logic: result.calculationLogic,
              is_parametrized: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', template.id);
          
          if (updateError) {
            errors.push(`Update error for template ${template.id}: ${updateError.message}`);
          } else {
            parametrized++;
            console.log(`✅ Parametrized template ${template.id}: ${result.parametrizedPrompt}`);
          }
        }
      }
      
    } catch (error) {
      errors.push(`Batch parametrization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return { processed, parametrized, errors };
  }
  
  /**
   * Generate parameters for a parametrized template at runtime
   */
  static generateParameters(
    parameterDefinitions: Record<string, any>,
    grade: number = 5
  ): Record<string, any> {
    
    const params: Record<string, any> = {};
    
    Object.entries(parameterDefinitions).forEach(([name, config]) => {
      if (config.type === 'number') {
        const [min, max] = config.range || [1, 10];
        params[name] = Math.floor(Math.random() * (max - min + 1)) + min;
      } else if (config.type === 'word') {
        const values = config.values || ['Standard'];
        params[name] = values[Math.floor(Math.random() * values.length)];
      }
    });
    
    return params;
  }
}