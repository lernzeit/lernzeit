import { supabase } from '@/integrations/supabase/client';

interface QualityCheckResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface DifficultyRule {
  grade: number;
  zahlenraumMin: number;
  zahlenraumMax: number;
  allowedOperations: string[];
  complexityLevel: 'basic' | 'intermediate' | 'advanced';
}

export class QualityAssurancePipeline {
  
  private static readonly DIFFICULTY_RULES: DifficultyRule[] = [
    // Klasse 1: ZR 1-20, Grundformen, einfache Addition
    { grade: 1, zahlenraumMin: 1, zahlenraumMax: 20, allowedOperations: ['+', '-'], complexityLevel: 'basic' },
    // Klasse 2: ZR 1-100, Einmaleins, Geld bis 100€
    { grade: 2, zahlenraumMin: 1, zahlenraumMax: 100, allowedOperations: ['+', '-', '×', '÷'], complexityLevel: 'basic' },
    // Klasse 3: ZR 1-1000, schriftliche Verfahren, Division mit Rest
    { grade: 3, zahlenraumMin: 1, zahlenraumMax: 1000, allowedOperations: ['+', '-', '×', '÷'], complexityLevel: 'intermediate' },
    // Klasse 4: ZR Millionen, Dezimalzahlen, komplexe Sachaufgaben
    { grade: 4, zahlenraumMin: 1, zahlenraumMax: 1000000, allowedOperations: ['+', '-', '×', '÷'], complexityLevel: 'advanced' }
  ];

  static async validateTemplate(templateData: any): Promise<QualityCheckResult> {
    console.log('🔍 Validating template quality...', templateData.grade, templateData.domain);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100; // Start with perfect score and deduct points

    try {
      // 1. Basic Structure Validation
      const structureCheck = this.validateStructure(templateData);
      if (!structureCheck.isValid) {
        errors.push(...structureCheck.errors);
        score -= 30;
      }

      // 2. Curriculum Compliance Check
      const curriculumCheck = this.validateCurriculumCompliance(templateData);
      if (!curriculumCheck.isValid) {
        errors.push(...curriculumCheck.errors);
        warnings.push(...curriculumCheck.warnings);
        score -= 20;
      }

      // 3. Question Type Specific Validation
      const typeCheck = this.validateQuestionType(templateData);
      if (!typeCheck.isValid) {
        errors.push(...typeCheck.errors);
        score -= 25;
      }

      // 4. Difficulty Level Validation
      const difficultyCheck = this.validateDifficultyLevel(templateData);
      if (!difficultyCheck.isValid) {
        warnings.push(...difficultyCheck.warnings);
        score -= 15;
      }

      // 5. Mathematical Accuracy (for math templates)
      if (templateData.domain === 'Zahlen & Operationen') {
        const mathCheck = this.validateMathematicalAccuracy(templateData);
        if (!mathCheck.isValid) {
          errors.push(...mathCheck.errors);
          score -= 35;
        }
      }

      // 6. Content Quality Check
      const contentCheck = this.validateContent(templateData);
      warnings.push(...contentCheck.warnings);
      suggestions.push(...contentCheck.suggestions);
      score -= contentCheck.deductPoints;

      const finalScore = Math.max(0, score / 100);
      const isValid = errors.length === 0 && finalScore >= 0.7;

      console.log(`✅ Template validation complete: Score ${finalScore.toFixed(2)}, Valid: ${isValid}`);

      return {
        isValid,
        score: finalScore,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      console.error('❌ Template validation error:', error);
      return {
        isValid: false,
        score: 0,
        errors: [`Validation error: ${error}`],
        warnings: [],
        suggestions: []
      };
    }
  }

  private static validateStructure(template: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.student_prompt || template.student_prompt.trim().length < 10) {
      errors.push('Student prompt is missing or too short');
    }

    if (!template.solution) {
      errors.push('Solution is missing');
    }

    if (!template.grade || template.grade < 1 || template.grade > 10) {
      errors.push('Invalid grade level');
    }

    if (!template.quarter_app || !['Q1', 'Q2', 'Q3', 'Q4'].includes(template.quarter_app)) {
      errors.push('Invalid quarter');
    }

    if (!template.domain) {
      errors.push('Domain is missing');
    }

    if (!template.difficulty || !['easy', 'medium', 'hard'].includes(template.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (!template.question_type || !['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH'].includes(template.question_type)) {
      errors.push('Invalid question type');
    }

    return { isValid: errors.length === 0, errors };
  }

  private static validateCurriculumCompliance(template: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rule = this.DIFFICULTY_RULES.find(r => r.grade === template.grade);
    if (!rule) {
      warnings.push(`No difficulty rules defined for grade ${template.grade}`);
      return { isValid: true, errors, warnings };
    }

    // Check if numbers in the problem are within allowed range
    const numbers = this.extractNumbers(template.student_prompt);
    const invalidNumbers = numbers.filter(num => num < rule.zahlenraumMin || num > rule.zahlenraumMax);
    
    if (invalidNumbers.length > 0) {
      errors.push(`Numbers out of range for grade ${template.grade}: ${invalidNumbers.join(', ')} (allowed: ${rule.zahlenraumMin}-${rule.zahlenraumMax})`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private static validateQuestionType(template: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (template.question_type) {
      case 'MULTIPLE_CHOICE':
        if (!template.distractors || !Array.isArray(template.distractors) || template.distractors.length !== 3) {
          errors.push('Multiple choice questions must have exactly 3 distractors');
        }
        break;
      
      case 'SORT':
        if (!template.variables?.items || !Array.isArray(template.variables.items) || template.variables.items.length < 3) {
          errors.push('Sort questions must have at least 3 items to sort');
        }
        
        // Check for identical values in sort questions (e.g., 1,5 m = 150 cm)
        if (template.variables?.items) {
          const identicalCheck = this.checkForIdenticalSortValues(template.variables.items);
          if (!identicalCheck.isValid) {
            errors.push(...identicalCheck.errors);
          }
        }
        break;
      
      case 'MATCH':
        if (!template.variables?.pairs || !Array.isArray(template.variables.pairs) || template.variables.pairs.length < 2) {
          errors.push('Match questions must have at least 2 pairs');
        }
        break;
      
      case 'FREETEXT':
        if (!template.solution || typeof template.solution !== 'object') {
          errors.push('Freetext questions must have a proper solution object');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  private static validateDifficultyLevel(template: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // This is a simplified check - in reality, we'd have more sophisticated difficulty scoring
    const textLength = template.student_prompt.length;
    const wordCount = template.student_prompt.split(' ').length;

    if (template.difficulty === 'easy' && wordCount > 20) {
      warnings.push('Easy questions should be more concise (≤20 words)');
    }
    
    if (template.difficulty === 'hard' && wordCount < 15) {
      warnings.push('Hard questions should be more complex (≥15 words)');
    }

    return { isValid: true, warnings };
  }

  private static validateMathematicalAccuracy(template: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // For multiple choice questions, ensure the correct answer is in the options
      if (template.question_type === 'MULTIPLE_CHOICE') {
        const solution = typeof template.solution === 'object' ? template.solution.value : template.solution;
        const allOptions = [solution, ...(template.distractors || [])];
        
        if (!allOptions.includes(solution)) {
          errors.push('Correct answer not found in multiple choice options');
        }

        // Check for duplicate options
        const uniqueOptions = new Set(allOptions);
        if (uniqueOptions.size !== allOptions.length) {
          errors.push('Duplicate options found in multiple choice');
        }
      }

      // Extract mathematical expression and verify solution
      const expression = this.extractMathExpression(template.student_prompt);
      if (expression) {
        const calculatedResult = this.evaluateMathExpression(expression);
        const providedSolution = typeof template.solution === 'object' ? 
          template.solution.value : template.solution;
        
        if (calculatedResult !== null && Math.abs(calculatedResult - Number(providedSolution)) > 0.001) {
          errors.push(`Mathematical error: Expected ${calculatedResult}, got ${providedSolution}`);
        }
      }
    } catch (error) {
      errors.push(`Math validation error: ${error}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private static validateContent(template: any): { warnings: string[]; suggestions: string[]; deductPoints: number } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let deductPoints = 0;

    // Check for placeholder text
    if (template.student_prompt.includes('...') || template.student_prompt.includes('XXX')) {
      warnings.push('Template contains placeholder text');
      deductPoints += 10;
    }

    // Check for proper German grammar (basic check)
    if (template.domain && !template.student_prompt.match(/[.!?]$/)) {
      suggestions.push('Consider ending the question with proper punctuation');
      deductPoints += 2;
    }

    // Check explanation quality
    if (!template.explanation || template.explanation.length < 20) {
      warnings.push('Explanation is missing or too short');
      deductPoints += 5;
    }

    return { warnings, suggestions, deductPoints };
  }

  private static extractNumbers(text: string): number[] {
    const numberMatches = text.match(/\b\d+(?:[.,]\d+)?\b/g);
    return numberMatches ? numberMatches.map(n => parseFloat(n.replace(',', '.'))) : [];
  }

  private static extractMathExpression(text: string): string | null {
    // Simple regex to find basic math expressions
    const mathPattern = /(\d+(?:[.,]\d+)?)\s*([+\-×÷*/])\s*(\d+(?:[.,]\d+)?)/;
    const match = text.match(mathPattern);
    return match ? match[0] : null;
  }

  private static evaluateMathExpression(expression: string): number | null {
    try {
      // Replace German decimal comma with dot and math symbols
      const normalized = expression
        .replace(',', '.')
        .replace('×', '*')
        .replace('÷', '/');
      
      // Simple evaluation (in production, use a proper math parser)
      return Function(`"use strict"; return (${normalized})`)();
    } catch {
      return null;
    }
  }

  static async batchValidateTemplates(templateIds: string[]): Promise<Map<string, QualityCheckResult>> {
    console.log(`🔍 Batch validating ${templateIds.length} templates...`);
    
    const results = new Map<string, QualityCheckResult>();
    
    // Get templates from database
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .in('id', templateIds);

    if (error) {
      console.error('Error fetching templates for validation:', error);
      return results;
    }

    // Validate each template
    for (const template of templates || []) {
      const result = await this.validateTemplate(template);
      results.set(template.id, result);
    }

    console.log(`✅ Batch validation complete: ${results.size} templates processed`);
    return results;
  }

  private static checkForIdenticalSortValues(items: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Convert all items to comparable values (handle units)
    const normalizedValues = items.map(item => this.normalizeValueWithUnit(item));
    
    // Check for duplicates in normalized values
    const uniqueValues = new Set(normalizedValues);
    if (uniqueValues.size !== normalizedValues.length) {
      errors.push('Sort question contains mathematically identical values (e.g., 1,5 m = 150 cm)');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private static normalizeValueWithUnit(item: string): string {
    if (!item) return item;
    
    const text = item.toLowerCase().trim();
    
    // Handle length units: convert to cm
    if (text.includes('meter') || text.includes(' m ') || text.match(/\d+,?\d*\s*m$/)) {
      const meterMatch = text.match(/(\d+(?:,\d+)?)\s*m/);
      if (meterMatch) {
        const meters = parseFloat(meterMatch[1].replace(',', '.'));
        return `${meters * 100}cm`;
      }
    }
    
    if (text.includes('zentimeter') || text.includes(' cm')) {
      const cmMatch = text.match(/(\d+(?:,\d+)?)\s*(?:zentimeter|cm)/);
      if (cmMatch) {
        const cm = parseFloat(cmMatch[1].replace(',', '.'));
        return `${cm}cm`;
      }
    }
    
    // Handle weight units: convert to grams
    if (text.includes('kilogramm') || text.includes(' kg')) {
      const kgMatch = text.match(/(\d+(?:,\d+)?)\s*(?:kilogramm|kg)/);
      if (kgMatch) {
        const kg = parseFloat(kgMatch[1].replace(',', '.'));
        return `${kg * 1000}g`;
      }
    }
    
    if (text.includes('gramm') || text.includes(' g ')) {
      const gMatch = text.match(/(\d+(?:,\d+)?)\s*(?:gramm|g)/);
      if (gMatch) {
        const grams = parseFloat(gMatch[1].replace(',', '.'));
        return `${grams}g`;
      }
    }
    
    // Handle time units: convert to minutes
    if (text.includes('stunde') || text.includes(' h')) {
      const hMatch = text.match(/(\d+(?:,\d+)?)\s*(?:stunde|stunden|h)/);
      if (hMatch) {
        const hours = parseFloat(hMatch[1].replace(',', '.'));
        return `${hours * 60}min`;
      }
    }
    
    if (text.includes('minute') || text.includes(' min')) {
      const minMatch = text.match(/(\d+(?:,\d+)?)\s*(?:minute|minuten|min)/);
      if (minMatch) {
        const minutes = parseFloat(minMatch[1].replace(',', '.'));
        return `${minutes}min`;
      }
    }
    
    // Return original if no conversion needed
    return text;
  }

  static async updateTemplateQualityScore(templateId: string, qualityScore: number): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .update({ 
        quality_score: qualityScore,
        last_validated: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating template quality score:', error);
    }
  }
}