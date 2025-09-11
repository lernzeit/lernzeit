import { supabase } from '@/lib/supabase';

export interface ValidationContext {
  grade: number;
  domain: string;
  subcategory: string;
  quarter: string;
  difficulty?: string;
}

export interface ParameterValidationRule {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array';
  required: boolean;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: any[];
  };
  curriculumRule?: (value: any, context: ValidationContext) => boolean;
}

export interface TemplateValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  parameterIssues: string[];
  suggestions: string[];
}

class AdvancedTemplateValidator {
  private parameterRules: Map<string, ParameterValidationRule[]> = new Map();

  constructor() {
    this.initializeParameterRules();
  }

  private initializeParameterRules() {
    // Mathematik Parameter Rules
    this.parameterRules.set('Zahlen & Operationen', [
      {
        name: 'zahl1',
        type: 'number',
        required: true,
        constraints: { min: 1 },
        curriculumRule: (value: number, context: ValidationContext) => {
          return this.validateNumberRange(value, context);
        }
      },
      {
        name: 'zahl2', 
        type: 'number',
        required: false,
        constraints: { min: 1 },
        curriculumRule: (value: number, context: ValidationContext) => {
          return this.validateNumberRange(value, context);
        }
      },
      {
        name: 'operation',
        type: 'string',
        required: true,
        constraints: { allowedValues: ['+', '-', '×', '÷', '*', '/'] },
        curriculumRule: (value: string, context: ValidationContext) => {
          return this.validateOperation(value, context);
        }
      }
    ]);

    // Größen & Messen Parameter Rules
    this.parameterRules.set('Größen & Messen', [
      {
        name: 'wert',
        type: 'number',
        required: true,
        constraints: { min: 0 },
        curriculumRule: (value: number, context: ValidationContext) => {
          return this.validateMeasurementValue(value, context);
        }
      },
      {
        name: 'einheit',
        type: 'string',
        required: true,
        constraints: { allowedValues: ['cm', 'm', 'km', 'g', 'kg', 'ml', 'l', '€', 'ct', 'min', 'h'] },
        curriculumRule: (value: string, context: ValidationContext) => {
          return this.validateUnit(value, context);
        }
      }
    ]);
  }

  async validateTemplate(template: any, context: ValidationContext): Promise<TemplateValidationResult> {
    const issues: string[] = [];
    const parameterIssues: string[] = [];
    const suggestions: string[] = [];

    // 1. Basic Structure Validation
    if (!template.student_prompt || template.student_prompt.length < 10) {
      issues.push('Student prompt zu kurz oder fehlt');
    }

    if (!template.solution) {
      issues.push('Lösung fehlt');
    }

    // 2. Parameter Validation
    const parameterResult = this.validateParameters(template, context);
    parameterIssues.push(...parameterResult.issues);

    // 3. Mathematical Logic Validation
    const logicResult = await this.validateMathematicalLogic(template, context);
    issues.push(...logicResult.issues);

    // 4. Curriculum Alignment Check
    const curriculumResult = this.validateCurriculumAlignment(template, context);
    issues.push(...curriculumResult.issues);
    suggestions.push(...curriculumResult.suggestions);

    // 5. Semantic Duplicate Check
    const duplicateResult = await this.checkSemanticDuplicates(template, context);
    if (duplicateResult.isDuplicate) {
      issues.push(`Semantisch ähnlich zu Template ${duplicateResult.similarTemplateId}`);
      suggestions.push('Variiere Parameter oder Kontext um Eindeutigkeit zu gewährleisten');
    }

    // Calculate overall score
    const score = this.calculateValidationScore(issues, parameterIssues, suggestions);

    return {
      isValid: issues.length === 0 && parameterIssues.length === 0,
      score,
      issues,
      parameterIssues,
      suggestions
    };
  }

  private validateParameters(template: any, context: ValidationContext): { issues: string[] } {
    const issues: string[] = [];
    const rules = this.parameterRules.get(context.domain) || [];

    if (!template.variables) {
      issues.push('Template variables fehlen');
      return { issues };
    }

    for (const rule of rules) {
      const value = template.variables[rule.name];

      // Check if required parameter exists
      if (rule.required && (value === undefined || value === null)) {
        issues.push(`Erforderlicher Parameter '${rule.name}' fehlt`);
        continue;
      }

      // Skip validation if parameter is optional and not present
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateParameterType(value, rule.type)) {
        issues.push(`Parameter '${rule.name}' hat falschen Typ (erwartet: ${rule.type})`);
        continue;
      }

      // Constraint validation
      if (rule.constraints && !this.validateParameterConstraints(value, rule.constraints)) {
        issues.push(`Parameter '${rule.name}' verletzt Constraints`);
        continue;
      }

      // Curriculum rule validation
      if (rule.curriculumRule && !rule.curriculumRule(value, context)) {
        issues.push(`Parameter '${rule.name}' entspricht nicht den Lehrplanvorgaben für Klasse ${context.grade}`);
      }
    }

    return { issues };
  }

  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'string': return typeof value === 'string';
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      default: return false;
    }
  }

  private validateParameterConstraints(value: any, constraints: any): boolean {
    if (constraints.min !== undefined && value < constraints.min) return false;
    if (constraints.max !== undefined && value > constraints.max) return false;
    if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) return false;
    if (constraints.allowedValues && !constraints.allowedValues.includes(value)) return false;
    return true;
  }

  private validateNumberRange(value: number, context: ValidationContext): boolean {
    // Grade-specific number range validation
    switch (context.grade) {
      case 1: return value <= 20;
      case 2: return value <= 100;
      case 3: return value <= 1000;
      case 4: return value <= 1000000;
      default: return value <= 10000000; // Grades 5+
    }
  }

  private validateOperation(operation: string, context: ValidationContext): boolean {
    const allowedByGrade: Record<number, string[]> = {
      1: ['+', '-'],
      2: ['+', '-', '×', '*'],
      3: ['+', '-', '×', '*', '÷', '/'],
      4: ['+', '-', '×', '*', '÷', '/'],
    };

    const allowed = allowedByGrade[context.grade] || ['+', '-', '×', '*', '÷', '/'];
    return allowed.includes(operation);
  }

  private validateMeasurementValue(value: number, context: ValidationContext): boolean {
    // Age-appropriate measurement values
    if (context.grade <= 2) return value <= 100;
    if (context.grade <= 4) return value <= 1000;
    return value <= 10000;
  }

  private validateUnit(unit: string, context: ValidationContext): boolean {
    const unitsByGrade: Record<number, string[]> = {
      1: ['cm', 'm', '€', 'ct'],
      2: ['cm', 'm', 'g', 'kg', '€', 'ct', 'min', 'h'],
      3: ['cm', 'm', 'km', 'g', 'kg', 'ml', 'l', '€', 'ct', 'min', 'h'],
      4: ['cm', 'm', 'km', 'g', 'kg', 'ml', 'l', '€', 'ct', 'min', 'h'],
    };

    const allowed = unitsByGrade[context.grade] || ['cm', 'm', 'km', 'g', 'kg', 'ml', 'l', '€', 'ct', 'min', 'h'];
    return allowed.includes(unit);
  }

  private async validateMathematicalLogic(template: any, context: ValidationContext): Promise<{ issues: string[] }> {
    const issues: string[] = [];

    try {
      // Extract mathematical expressions from student_prompt
      const expressions = this.extractMathExpressions(template.student_prompt);
      
      for (const expr of expressions) {
        if (!this.validateMathExpression(expr)) {
          issues.push(`Mathematischer Ausdruck ist inkorrekt: ${expr}`);
        }
      }

      // Validate solution consistency
      if (template.solution && template.variables) {
        const calculatedSolution = this.calculateExpectedSolution(template, context);
        if (calculatedSolution && calculatedSolution !== template.solution) {
          issues.push('Lösung stimmt nicht mit berechneter Lösung überein');
        }
      }

      // Validate multiple choice options
      if (template.question_type === 'MULTIPLE_CHOICE' && template.distractors) {
        const allOptions = [template.solution, ...template.distractors];
        if (new Set(allOptions).size !== allOptions.length) {
          issues.push('Antwortoptionen enthalten Duplikate');
        }
      }

    } catch (error) {
      issues.push('Fehler bei der mathematischen Validierung');
    }

    return { issues };
  }

  private validateCurriculumAlignment(template: any, context: ValidationContext): { issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check if template matches grade level curriculum
    const curriculumTopics = this.getCurriculumTopics(context);
    const templateTopic = this.extractTemplateTopic(template.student_prompt);

    if (!curriculumTopics.includes(templateTopic)) {
      issues.push(`Thema '${templateTopic}' nicht im Lehrplan für Klasse ${context.grade} ${context.quarter}`);
      suggestions.push(`Verwende Themen aus: ${curriculumTopics.join(', ')}`);
    }

    return { issues, suggestions };
  }

  private async checkSemanticDuplicates(template: any, context: ValidationContext): Promise<{ isDuplicate: boolean; similarTemplateId?: string }> {
    try {
      // Query existing templates with similar content
      const { data: existingTemplates, error } = await supabase
        .from('templates')
        .select('id, student_prompt, solution')
        .eq('grade', context.grade)
        .eq('domain', context.domain)
        .eq('subcategory', context.subcategory)
        .eq('status', 'ACTIVE')
        .limit(100);

      if (error || !existingTemplates) return { isDuplicate: false };

      // Simple semantic similarity check
      for (const existing of existingTemplates) {
        if (this.calculateSimilarity(template.student_prompt, existing.student_prompt) > 0.8) {
          return { isDuplicate: true, similarTemplateId: existing.id };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking semantic duplicates:', error);
      return { isDuplicate: false };
    }
  }

  private extractMathExpressions(text: string): string[] {
    // Extract mathematical expressions like "5 + 3", "10 - 7", etc.
    const mathPattern = /\d+\s*[+\-×÷*/]\s*\d+/g;
    return text.match(mathPattern) || [];
  }

  private validateMathExpression(expression: string): boolean {
    try {
      // Simple validation - replace × with * and ÷ with /
      const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/');
      // Use Function constructor to safely evaluate simple math expressions
      const result = new Function(`return ${normalized}`)();
      return typeof result === 'number' && !isNaN(result);
    } catch {
      return false;
    }
  }

  private calculateExpectedSolution(template: any, context: ValidationContext): any {
    // Simple solution calculation based on template variables
    const vars = template.variables;
    if (!vars) return null;

    try {
      if (vars.zahl1 && vars.zahl2 && vars.operation) {
        switch (vars.operation) {
          case '+': return vars.zahl1 + vars.zahl2;
          case '-': return vars.zahl1 - vars.zahl2;
          case '×':
          case '*': return vars.zahl1 * vars.zahl2;
          case '÷':
          case '/': return vars.zahl2 !== 0 ? vars.zahl1 / vars.zahl2 : null;
          default: return null;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private getCurriculumTopics(context: ValidationContext): string[] {
    // Simplified curriculum mapping
    const topics: Record<string, Record<number, string[]>> = {
      'Zahlen & Operationen': {
        1: ['Zählen bis 20', 'Addition ohne Übergang', 'Subtraktion ohne Übergang'],
        2: ['Zahlenraum 100', 'Einmaleins', 'Addition mit Übergang'],
        3: ['Zahlenraum 1000', 'Schriftliche Addition', 'Division mit Rest'],
        4: ['Zahlenraum Million', 'Dezimalzahlen', 'Schriftliche Verfahren']
      }
    };

    return topics[context.domain]?.[context.grade] || [];
  }

  private extractTemplateTopic(prompt: string): string {
    // Simple topic extraction based on keywords
    if (prompt.includes('addier') || prompt.includes('+')) return 'Addition';
    if (prompt.includes('subtrahier') || prompt.includes('-')) return 'Subtraktion';
    if (prompt.includes('multipli') || prompt.includes('×')) return 'Multiplikation';
    if (prompt.includes('dividi') || prompt.includes('÷')) return 'Division';
    return 'Allgemein';
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation (Jaccard similarity on words)
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateValidationScore(issues: string[], parameterIssues: string[], suggestions: string[]): number {
    const totalIssues = issues.length + parameterIssues.length;
    const suggestionPenalty = suggestions.length * 0.05;
    
    if (totalIssues === 0) return Math.max(0.95 - suggestionPenalty, 0.8);
    if (totalIssues <= 2) return Math.max(0.8 - suggestionPenalty, 0.6);
    if (totalIssues <= 4) return Math.max(0.6 - suggestionPenalty, 0.4);
    return Math.max(0.4 - suggestionPenalty, 0.1);
  }
}

export const advancedTemplateValidator = new AdvancedTemplateValidator();