/**
 * Phase 5: Quality Assurance and Template Validation System
 * Ensures high-quality question generation and template management
 */

import { SelectionQuestion } from '@/types/questionTypes';
import { QuestionTemplate } from '../questionTemplates';
import { ImprovedGermanMathParser } from './ImprovedGermanMathParser';

export interface QualityReport {
  overallScore: number;
  issues: QualityIssue[];
  recommendations: string[];
  passesThreshold: boolean;
}

export interface QualityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'content' | 'structure' | 'answer' | 'language' | 'curriculum';
  description: string;
  suggestion?: string;
}

export interface TemplateQualityMetrics {
  contentClarity: number;
  answerAccuracy: number;
  curriculumAlignment: number;
  languageQuality: number;
  structuralIntegrity: number;
}

export class QualityAssuranceEngine {
  private static readonly QUALITY_THRESHOLD = 0.7;
  private static readonly CRITICAL_ISSUE_THRESHOLD = 0.3;
  
  /**
   * Comprehensive quality assessment for generated questions
   */
  static assessQuestionQuality(
    question: SelectionQuestion,
    originalTemplate?: QuestionTemplate,
    context?: { category: string; grade: number }
  ): QualityReport {
    const issues: QualityIssue[] = [];
    const metrics = this.calculateQualityMetrics(question, originalTemplate, context);
    
    // Content quality checks
    this.checkContentQuality(question, issues);
    
    // Answer accuracy checks
    this.checkAnswerAccuracy(question, originalTemplate, issues);
    
    // Language quality checks
    this.checkLanguageQuality(question, issues);
    
    // Curriculum alignment checks
    if (context) {
      this.checkCurriculumAlignment(question, context, issues);
    }
    
    // Structural integrity checks
    this.checkStructuralIntegrity(question, issues);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, issues);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, metrics);
    
    return {
      overallScore,
      issues,
      recommendations,
      passesThreshold: overallScore >= this.QUALITY_THRESHOLD && 
                      !issues.some(i => i.severity === 'critical')
    };
  }
  
  /**
   * Validate template quality before use
   */
  static validateTemplate(template: QuestionTemplate): QualityReport {
    const issues: QualityIssue[] = [];
    
    // Basic structure validation
    if (!template.id || template.id.trim().length === 0) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        description: 'Template missing unique ID',
        suggestion: 'Add a unique, descriptive ID'
      });
    }
    
    if (!template.template || template.template.trim().length === 0) {
      issues.push({
        severity: 'critical',
        category: 'content',
        description: 'Template missing question text',
        suggestion: 'Add template text with parameter placeholders'
      });
    }
    
    if (!template.parameters || template.parameters.length === 0) {
      issues.push({
        severity: 'high',
        category: 'structure',
        description: 'Template has no parameters',
        suggestion: 'Add parameter definitions for dynamic content'
      });
    }
    
    // Parameter validation
    if (template.parameters) {
      for (const param of template.parameters) {
        if (!param.name || !param.type) {
          issues.push({
            severity: 'high',
            category: 'structure',
            description: `Parameter missing name or type: ${JSON.stringify(param)}`,
            suggestion: 'Ensure all parameters have name and type properties'
          });
        }
        
        if (param.type === 'number' && param.range) {
          const [min, max] = param.range;
          if (min >= max) {
            issues.push({
              severity: 'medium',
              category: 'structure',
              description: `Invalid parameter range: ${param.name} [${min}, ${max}]`,
              suggestion: 'Ensure min < max in parameter ranges'
            });
          }
        }
      }
    }
    
    // Content quality checks
    if (template.template) {
      const placeholderMatches = template.template.match(/\{(\w+)\}/g) || [];
      const definedParams = new Set(template.parameters?.map(p => p.name) || []);
      
      for (const match of placeholderMatches) {
        const paramName = match.slice(1, -1);
        if (!definedParams.has(paramName)) {
          issues.push({
            severity: 'high',
            category: 'structure',
            description: `Undefined parameter used in template: ${paramName}`,
            suggestion: 'Define all parameters used in template text'
          });
        }
      }
    }
    
    // Grade appropriateness
    if (template.grade < 1 || template.grade > 12) {
      issues.push({
        severity: 'medium',
        category: 'curriculum',
        description: `Invalid grade level: ${template.grade}`,
        suggestion: 'Set grade between 1 and 12'
      });
    }
    
    // Difficulty validation
    if (!['easy', 'medium', 'hard'].includes(template.difficulty || '')) {
      issues.push({
        severity: 'low',
        category: 'curriculum',
        description: 'Missing or invalid difficulty level',
        suggestion: 'Set difficulty to easy, medium, or hard'
      });
    }
    
    const overallScore = Math.max(0, 1 - (issues.length * 0.1) - 
                                    issues.filter(i => i.severity === 'critical').length * 0.5);
    
    return {
      overallScore,
      issues,
      recommendations: this.generateTemplateRecommendations(issues),
      passesThreshold: overallScore >= this.QUALITY_THRESHOLD && 
                      !issues.some(i => i.severity === 'critical')
    };
  }
  
  /**
   * Batch validate multiple questions for consistency
   */
  static batchValidateQuestions(questions: SelectionQuestion[]): {
    reports: QualityReport[];
    batchIssues: QualityIssue[];
    averageQuality: number;
  } {
    const reports = questions.map(q => this.assessQuestionQuality(q));
    const batchIssues: QualityIssue[] = [];
    
    // Check for batch-level issues
    this.checkQuestionDiversity(questions, batchIssues);
    this.checkDifficultyProgression(questions, batchIssues);
    this.checkTopicBalance(questions, batchIssues);
    
    const averageQuality = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;
    
    return {
      reports,
      batchIssues,
      averageQuality
    };
  }
  
  /**
   * Calculate detailed quality metrics
   */
  private static calculateQualityMetrics(
    question: SelectionQuestion,
    template?: QuestionTemplate,
    context?: { category: string; grade: number }
  ): TemplateQualityMetrics {
    return {
      contentClarity: this.assessContentClarity(question),
      answerAccuracy: this.assessAnswerAccuracy(question, template),
      curriculumAlignment: context ? this.assessCurriculumAlignment(question, context) : 0.8,
      languageQuality: this.assessLanguageQuality(question),
      structuralIntegrity: this.assessStructuralIntegrity(question)
    };
  }
  
  /**
   * Content quality assessment
   */
  private static checkContentQuality(question: SelectionQuestion, issues: QualityIssue[]): void {
    // Length checks
    if (question.question.length < 10) {
      issues.push({
        severity: 'high',
        category: 'content',
        description: 'Question text too short',
        suggestion: 'Expand question to be more descriptive'
      });
    }
    
    if (question.question.length > 300) {
      issues.push({
        severity: 'medium',
        category: 'content',
        description: 'Question text too long',
        suggestion: 'Simplify question for better readability'
      });
    }
    
    // Clarity checks
    if (question.question.includes('?') && !question.question.endsWith('?')) {
      issues.push({
        severity: 'low',
        category: 'content',
        description: 'Question mark not at end',
        suggestion: 'Move question mark to end of question'
      });
    }
    
    // Placeholder artifacts
    if (question.question.includes('{') || question.question.includes('}')) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        description: 'Unresolved template placeholders',
        suggestion: 'Ensure all placeholders are replaced with values'
      });
    }
    
    // German language specific checks
    if (question.type === 'german') {
      this.checkGermanLanguageSpecifics(question, issues);
    }
  }
  
  /**
   * Answer accuracy assessment
   */
  private static checkAnswerAccuracy(
    question: SelectionQuestion,
    template: QuestionTemplate | undefined,
    issues: QualityIssue[]
  ): void {
    if (question.questionType === 'text-input') {
      const answer = (question as any).answer;
      
      if (!answer && answer !== 0) {
        issues.push({
          severity: 'critical',
          category: 'answer',
          description: 'Missing answer for text input question',
          suggestion: 'Provide correct answer'
        });
        return;
      }
      
      // Math answer validation
      if (question.type === 'math') {
        const mathValidation = this.validateMathAnswer(question);
        if (!mathValidation.isValid) {
          issues.push({
            severity: 'high',
            category: 'answer',
            description: mathValidation.error || 'Math answer validation failed',
            suggestion: 'Verify mathematical calculation'
          });
        }
      }
    } else if (question.questionType === 'multiple-choice') {
      if (!question.options || question.options.length < 2) {
        issues.push({
          severity: 'critical',
          category: 'answer',
          description: 'Multiple choice question needs at least 2 options',
          suggestion: 'Add more answer options'
        });
      }
      
      if (question.correctAnswer === undefined || 
          question.correctAnswer < 0 || 
          question.correctAnswer >= (question.options?.length || 0)) {
        issues.push({
          severity: 'critical',
          category: 'answer',
          description: 'Invalid correct answer index',
          suggestion: 'Set correct answer index within options range'
        });
      }
    }
  }
  
  /**
   * Validate mathematical answers
   */
  private static validateMathAnswer(question: SelectionQuestion): { isValid: boolean; error?: string } {
    try {
      const mathResult = ImprovedGermanMathParser.parse(question.question);
      
      if (mathResult.success && mathResult.answer !== undefined) {
        const expectedAnswer = mathResult.answer.toString();
        const actualAnswer = (question as any).answer?.toString() || '';
        
        // Handle different number formats
        const normalizeNumber = (num: string) => {
          return num.replace(',', '.').replace(/\s+/g, '');
        };
        
        if (normalizeNumber(expectedAnswer) !== normalizeNumber(actualAnswer)) {
          return {
            isValid: false,
            error: `Answer mismatch: expected ${expectedAnswer}, got ${actualAnswer}`
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Math validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Language quality checks
   */
  private static checkLanguageQuality(question: SelectionQuestion, issues: QualityIssue[]): void {
    const text = question.question.toLowerCase();
    
    // Basic grammar checks for German
    if (question.type === 'german' || text.includes('ä') || text.includes('ö') || text.includes('ü')) {
      // Check for common German grammar mistakes
      if (text.includes('ss') && text.includes('ß')) {
        issues.push({
          severity: 'low',
          category: 'language',
          description: 'Inconsistent use of ß and ss',
          suggestion: 'Use consistent German spelling rules'
        });
      }
    }
    
    // Capitalization check
    if (!question.question.match(/^[A-ZÄÖÜ]/)) {
      issues.push({
        severity: 'low',
        category: 'language',
        description: 'Question should start with capital letter',
        suggestion: 'Capitalize first letter'
      });
    }
  }
  
  /**
   * German language specific checks
   */
  private static checkGermanLanguageSpecifics(question: SelectionQuestion, issues: QualityIssue[]): void {
    const text = question.question;
    
    // Check for proper German umlauts
    if (text.includes('ae') || text.includes('oe') || text.includes('ue')) {
      issues.push({
        severity: 'medium',
        category: 'language',
        description: 'Use proper German umlauts instead of ae/oe/ue',
        suggestion: 'Replace ae with ä, oe with ö, ue with ü'
      });
    }
    
    // Check for German question format
    if (text.includes('?') && !text.match(/\b(was|wie|wo|wann|warum|welche|wer)\b/i)) {
      issues.push({
        severity: 'low',
        category: 'language',
        description: 'German question may be missing question word',
        suggestion: 'Consider adding question words like was, wie, wo, etc.'
      });
    }
  }
  
  /**
   * Check curriculum alignment
   */
  private static checkCurriculumAlignment(
    question: SelectionQuestion,
    context: { category: string; grade: number },
    issues: QualityIssue[]
  ): void {
    // Grade-appropriate complexity
    const complexityScore = this.assessQuestionComplexity(question);
    const expectedComplexity = this.getExpectedComplexity(context.grade);
    
    if (Math.abs(complexityScore - expectedComplexity) > 0.3) {
      const severity = complexityScore > expectedComplexity ? 'medium' : 'low';
      issues.push({
        severity,
        category: 'curriculum',
        description: `Question complexity (${complexityScore.toFixed(2)}) doesn't match grade ${context.grade}`,
        suggestion: `Adjust complexity to approximately ${expectedComplexity.toFixed(2)}`
      });
    }
  }
  
  /**
   * Structural integrity checks
   */
  private static checkStructuralIntegrity(question: SelectionQuestion, issues: QualityIssue[]): void {
    // Required fields
    if (!question.explanation || question.explanation.length < 5) {
      issues.push({
        severity: 'medium',
        category: 'structure',
        description: 'Missing or inadequate explanation',
        suggestion: 'Add detailed explanation for the answer'
      });
    }
    
    if (!question.type || !['math', 'german'].includes(question.type)) {
      issues.push({
        severity: 'medium',
        category: 'structure',
        description: 'Invalid or missing question type',
        suggestion: 'Set type to math or german'
      });
    }
  }
  
  /**
   * Calculate overall quality score
   */
  private static calculateOverallScore(metrics: TemplateQualityMetrics, issues: QualityIssue[]): number {
    const baseScore = (
      metrics.contentClarity +
      metrics.answerAccuracy +
      metrics.curriculumAlignment +
      metrics.languageQuality +
      metrics.structuralIntegrity
    ) / 5;
    
    // Apply penalties for issues
    let penalty = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': penalty += 0.3; break;
        case 'high': penalty += 0.15; break;
        case 'medium': penalty += 0.08; break;
        case 'low': penalty += 0.03; break;
      }
    });
    
    return Math.max(0, Math.min(1, baseScore - penalty));
  }
  
  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(issues: QualityIssue[], metrics: TemplateQualityMetrics): string[] {
    const recommendations: string[] = [];
    
    // Critical issues first
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Address critical issues immediately: ' + 
        criticalIssues.map(i => i.description).join(', '));
    }
    
    // Metric-based recommendations
    if (metrics.contentClarity < 0.7) {
      recommendations.push('📝 Improve content clarity: Make question text more explicit and easier to understand');
    }
    
    if (metrics.answerAccuracy < 0.8) {
      recommendations.push('🎯 Verify answer accuracy: Double-check calculations and correct answers');
    }
    
    if (metrics.languageQuality < 0.7) {
      recommendations.push('🗣️ Enhance language quality: Check grammar, spelling, and sentence structure');
    }
    
    // General improvements
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push('⚠️ Address high-priority issues: ' + 
        highIssues.map(i => i.suggestion).filter(s => s).join(', '));
    }
    
    return recommendations;
  }
  
  private static generateTemplateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.category === 'structure')) {
      recommendations.push('🏗️ Fix structural issues before using template');
    }
    
    if (issues.some(i => i.category === 'content')) {
      recommendations.push('📝 Improve template content quality');
    }
    
    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('🚨 Template has critical issues and should not be used');
    }
    
    return recommendations;
  }
  
  // Helper assessment methods
  private static assessContentClarity(question: SelectionQuestion): number {
    let score = 0.8;
    
    // Length appropriateness
    const length = question.question.length;
    if (length >= 20 && length <= 150) score += 0.1;
    else if (length < 10 || length > 250) score -= 0.3;
    
    // Question structure
    if (question.question.includes('?')) score += 0.05;
    if (question.question.match(/^[A-ZÄÖÜ]/)) score += 0.05;
    
    return Math.min(1, score);
  }
  
  private static assessAnswerAccuracy(question: SelectionQuestion, template?: QuestionTemplate): number {
    if (question.questionType === 'text-input') {
      return (question as any).answer ? 0.9 : 0.2;
    } else if (question.questionType === 'multiple-choice') {
      const hasOptions = question.options && question.options.length >= 2;
      const hasValidIndex = question.correctAnswer !== undefined && 
                           question.correctAnswer >= 0 && 
                           question.correctAnswer < (question.options?.length || 0);
      return (hasOptions && hasValidIndex) ? 0.9 : 0.3;
    }
    return 0.5;
  }
  
  private static assessCurriculumAlignment(question: SelectionQuestion, context: { category: string; grade: number }): number {
    // Simplified curriculum alignment assessment
    const complexity = this.assessQuestionComplexity(question);
    const expectedComplexity = this.getExpectedComplexity(context.grade);
    
    const alignment = 1 - Math.abs(complexity - expectedComplexity);
    return Math.max(0.3, alignment);
  }
  
  private static assessLanguageQuality(question: SelectionQuestion): number {
    let score = 0.8;
    
    // Basic language checks
    if (question.question.match(/^[A-ZÄÖÜ]/)) score += 0.1;
    if (!question.question.includes('{') && !question.question.includes('}')) score += 0.1;
    
    return Math.min(1, score);
  }
  
  private static assessStructuralIntegrity(question: SelectionQuestion): number {
    let score = 0.6;
    
    if (question.explanation && question.explanation.length > 5) score += 0.2;
    if (question.type && ['math', 'german'].includes(question.type)) score += 0.1;
    if (question.questionType && ['text-input', 'multiple-choice'].includes(question.questionType)) score += 0.1;
    
    return Math.min(1, score);
  }
  
  private static assessQuestionComplexity(question: SelectionQuestion): number {
    const text = question.question.toLowerCase();
    let complexity = 0.3;
    
    // Word count factor
    const wordCount = text.split(' ').length;
    complexity += Math.min(0.3, wordCount / 20);
    
    // Mathematical operations
    if (text.includes('×') || text.includes('÷')) complexity += 0.2;
    if (text.includes('+') || text.includes('-')) complexity += 0.1;
    
    // Numbers in question
    const numbers = text.match(/\d+/g);
    if (numbers) {
      const maxNumber = Math.max(...numbers.map(n => parseInt(n)));
      if (maxNumber > 100) complexity += 0.2;
      else if (maxNumber > 20) complexity += 0.1;
    }
    
    return Math.min(1, complexity);
  }
  
  private static getExpectedComplexity(grade: number): number {
    // Expected complexity increases with grade
    return Math.min(0.9, 0.2 + (grade - 1) * 0.08);
  }
  
  // Batch validation helpers
  private static checkQuestionDiversity(questions: SelectionQuestion[], issues: QualityIssue[]): void {
    const types = new Set(questions.map(q => q.questionType));
    if (types.size === 1 && questions.length > 3) {
      issues.push({
        severity: 'medium',
        category: 'structure',
        description: 'All questions are the same type',
        suggestion: 'Mix different question types for variety'
      });
    }
  }
  
  private static checkDifficultyProgression(questions: SelectionQuestion[], issues: QualityIssue[]): void {
    const complexities = questions.map(q => this.assessQuestionComplexity(q));
    const variance = this.calculateVariance(complexities);
    
    if (variance < 0.01) {
      issues.push({
        severity: 'low',
        category: 'curriculum',
        description: 'Questions have very similar difficulty',
        suggestion: 'Vary question difficulty for better progression'
      });
    }
  }
  
  private static checkTopicBalance(questions: SelectionQuestion[], issues: QualityIssue[]): void {
    const topics = new Map<string, number>();
    
    questions.forEach(q => {
      const text = q.question.toLowerCase();
      if (text.includes('+') || text.includes('addier')) {
        topics.set('addition', (topics.get('addition') || 0) + 1);
      }
      if (text.includes('×') || text.includes('mal')) {
        topics.set('multiplication', (topics.get('multiplication') || 0) + 1);
      }
      // Add more topic detection...
    });
    
    const maxCount = Math.max(...topics.values());
    if (maxCount > questions.length * 0.7) {
      issues.push({
        severity: 'medium',
        category: 'curriculum',
        description: 'One topic dominates the question set',
        suggestion: 'Balance different mathematical topics'
      });
    }
  }
  
  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
}