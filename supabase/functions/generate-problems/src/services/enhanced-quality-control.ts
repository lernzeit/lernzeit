import { logger } from "../utils/logger.ts";
import type { SelectionQuestion, QualityMetrics } from "../types.ts";

export interface EnhancedQualityMetrics extends QualityMetrics {
  educational_value: number;
  engagement_score: number;
  accessibility_score: number;
  progression_alignment: number;
  content_richness: number;
  technical_correctness: number;
}

export interface QualityControlConfig {
  minOverallScore: number;
  minEducationalValue: number;
  minEngagementScore: number;
  requireProgressionAlignment: boolean;
  strictMode: boolean;
}

export class EnhancedQualityControlService {
  private readonly defaultConfig: QualityControlConfig = {
    minOverallScore: 0.6,
    minEducationalValue: 0.5,
    minEngagementScore: 0.4,
    requireProgressionAlignment: true,
    strictMode: false
  };

  /**
   * Evaluate question quality with enhanced metrics
   */
  evaluateQuestionQuality(
    question: SelectionQuestion,
    category: string,
    grade: number,
    config?: Partial<QualityControlConfig>
  ): EnhancedQualityMetrics {
    const qualityConfig = { ...this.defaultConfig, ...config };
    
    const metrics: EnhancedQualityMetrics = {
      curriculum_alignment: this.evaluateCurriculumAlignment(question, category, grade),
      difficulty_appropriateness: this.evaluateDifficultyAppropriateness(question, grade),
      uniqueness_score: 0, // Will be set externally
      overall_score: 0, // Calculated at the end
      educational_value: this.evaluateEducationalValue(question, category, grade),
      engagement_score: this.evaluateEngagementScore(question, category),
      accessibility_score: this.evaluateAccessibilityScore(question, grade),
      progression_alignment: this.evaluateProgressionAlignment(question, category, grade),
      content_richness: this.evaluateContentRichness(question),
      technical_correctness: this.evaluateTechnicalCorrectness(question, category)
    };

    // Calculate weighted overall score
    metrics.overall_score = this.calculateOverallScore(metrics, qualityConfig);

    logger.debug('Quality evaluation completed', {
      questionId: question.id,
      overallScore: metrics.overall_score,
      educationalValue: metrics.educational_value,
      engagement: metrics.engagement_score
    });

    return metrics;
  }

  /**
   * Check if question meets quality standards
   */
  meetsQualityStandards(
    metrics: EnhancedQualityMetrics,
    config?: Partial<QualityControlConfig>
  ): { passes: boolean; reasons: string[] } {
    const qualityConfig = { ...this.defaultConfig, ...config };
    const reasons: string[] = [];

    if (metrics.overall_score < qualityConfig.minOverallScore) {
      reasons.push(`Overall score too low: ${metrics.overall_score.toFixed(2)} < ${qualityConfig.minOverallScore}`);
    }

    if (metrics.educational_value < qualityConfig.minEducationalValue) {
      reasons.push(`Educational value too low: ${metrics.educational_value.toFixed(2)} < ${qualityConfig.minEducationalValue}`);
    }

    if (metrics.engagement_score < qualityConfig.minEngagementScore) {
      reasons.push(`Engagement score too low: ${metrics.engagement_score.toFixed(2)} < ${qualityConfig.minEngagementScore}`);
    }

    if (qualityConfig.requireProgressionAlignment && metrics.progression_alignment < 0.3) {
      reasons.push(`Poor progression alignment: ${metrics.progression_alignment.toFixed(2)}`);
    }

    if (qualityConfig.strictMode) {
      if (metrics.technical_correctness < 0.8) {
        reasons.push(`Technical correctness insufficient: ${metrics.technical_correctness.toFixed(2)}`);
      }
      
      if (metrics.accessibility_score < 0.6) {
        reasons.push(`Accessibility score too low: ${metrics.accessibility_score.toFixed(2)}`);
      }
    }

    return {
      passes: reasons.length === 0,
      reasons
    };
  }

  /**
   * Evaluate curriculum alignment
   */
  private evaluateCurriculumAlignment(
    question: SelectionQuestion,
    category: string,
    grade: number
  ): number {
    let score = 0.5; // Base score

    const gradeKeywords = this.getGradeSpecificKeywords(category, grade);
    const questionText = question.question.toLowerCase();

    // Check for grade-appropriate keywords
    const keywordMatches = gradeKeywords.filter(keyword => 
      questionText.includes(keyword.toLowerCase())
    ).length;

    score += Math.min(keywordMatches * 0.1, 0.3);

    // Check complexity appropriateness
    const wordCount = questionText.split(/\s+/).length;
    const complexWords = questionText.split(/\s+/).filter(word => word.length > 8).length;
    const complexityRatio = complexWords / wordCount;

    const expectedComplexity = this.getExpectedComplexityForGrade(grade);
    const complexityScore = 1 - Math.abs(complexityRatio - expectedComplexity);
    score += complexityScore * 0.2;

    return Math.min(score, 1);
  }

  /**
   * Evaluate difficulty appropriateness
   */
  private evaluateDifficultyAppropriateness(
    question: SelectionQuestion,
    grade: number
  ): number {
    const questionText = question.question;
    let score = 0.5;

    // Analyze sentence structure
    const sentences = questionText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

    // Grade-appropriate sentence length ranges
    const expectedLengths = {
      1: { min: 3, max: 8 },
      2: { min: 4, max: 10 },
      3: { min: 5, max: 12 },
      4: { min: 6, max: 15 }
    };

    const expected = expectedLengths[grade as keyof typeof expectedLengths] || expectedLengths[4];
    
    if (avgSentenceLength >= expected.min && avgSentenceLength <= expected.max) {
      score += 0.3;
    } else {
      const deviation = Math.min(
        Math.abs(avgSentenceLength - expected.min),
        Math.abs(avgSentenceLength - expected.max)
      );
      score += Math.max(0.3 - (deviation * 0.05), 0);
    }

    // Check for age-appropriate vocabulary
    const vocabularyScore = this.evaluateVocabularyAppropriateness(questionText, grade);
    score += vocabularyScore * 0.2;

    return Math.min(score, 1);
  }

  /**
   * Evaluate educational value
   */
  private evaluateEducationalValue(
    question: SelectionQuestion,
    category: string,
    grade: number
  ): number {
    let score = 0.3; // Base score

    // Check for learning objectives alignment
    const learningObjectives = this.getLearningObjectives(category, grade);
    const questionText = question.question.toLowerCase();

    const objectiveMatches = learningObjectives.filter(obj => 
      questionText.includes(obj.toLowerCase())
    ).length;

    score += Math.min(objectiveMatches * 0.15, 0.4);

    // Check for explanation quality
    if (question.explanation && question.explanation.length > 20) {
      score += 0.2;
      
      // Bonus for step-by-step explanations
      if (question.explanation.includes('Schritt') || question.explanation.includes('zunächst') || 
          question.explanation.includes('dann') || question.explanation.includes('daher')) {
        score += 0.1;
      }
    }

    // Check for practical application
    const practicalKeywords = ['alltag', 'beispiel', 'anwendung', 'situation', 'problem'];
    const hasPracticalContext = practicalKeywords.some(keyword => 
      questionText.includes(keyword)
    );
    
    if (hasPracticalContext) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Evaluate engagement score
   */
  private evaluateEngagementScore(question: SelectionQuestion, category: string): number {
    let score = 0.4; // Base score
    const questionText = question.question.toLowerCase();

    // Check for engaging language patterns
    const engagingPatterns = [
      /stell dir vor/,
      /kannst du/,
      /findest du/,
      /was denkst du/,
      /wie viele/,
      /welche/,
      /warum/,
      /interessant/,
      /spannend/,
      /entdecke/
    ];

    const patternMatches = engagingPatterns.filter(pattern => 
      pattern.test(questionText)
    ).length;

    score += Math.min(patternMatches * 0.1, 0.3);

    // Check for interactive elements
    if (question.questionType === 'multiple-choice' || question.questionType === 'word-selection') {
      score += 0.1;
    }

    // Check for visual/contextual elements
    const contextualKeywords = ['bild', 'geschichte', 'beispiel', 'situation'];
    const hasContext = contextualKeywords.some(keyword => 
      questionText.includes(keyword)
    );
    
    if (hasContext) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Evaluate accessibility score
   */
  private evaluateAccessibilityScore(question: SelectionQuestion, grade: number): number {
    let score = 0.5; // Base score
    const questionText = question.question;

    // Check for clear, simple language
    const words = questionText.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    const expectedWordLength = grade <= 2 ? 5 : grade <= 4 ? 6 : 7;
    
    if (avgWordLength <= expectedWordLength) {
      score += 0.2;
    }

    // Check for clear structure
    if (questionText.includes('?')) {
      score += 0.1;
    }

    // Check for common language issues
    const hasComplexStructure = questionText.includes(',') && questionText.split(',').length > 3;
    const hasNestedClauses = /\([^)]*\)/.test(questionText);
    
    if (!hasComplexStructure) score += 0.1;
    if (!hasNestedClauses) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Evaluate progression alignment
   */
  private evaluateProgressionAlignment(
    question: SelectionQuestion,
    category: string,
    grade: number
  ): number {
    let score = 0.4; // Base score

    // Check if question builds on previous grade concepts
    const previousGradeConcepts = this.getGradeSpecificKeywords(category, grade - 1);
    const currentGradeConcepts = this.getGradeSpecificKeywords(category, grade);
    
    const questionText = question.question.toLowerCase();
    
    const usesPreviousConcepts = previousGradeConcepts.some(concept => 
      questionText.includes(concept.toLowerCase())
    );
    
    const usesCurrentConcepts = currentGradeConcepts.some(concept => 
      questionText.includes(concept.toLowerCase())
    );

    if (usesPreviousConcepts) score += 0.2;
    if (usesCurrentConcepts) score += 0.4;

    return Math.min(score, 1);
  }

  /**
   * Evaluate content richness
   */
  private evaluateContentRichness(question: SelectionQuestion): number {
    let score = 0.3; // Base score

    // Check explanation depth
    if (question.explanation) {
      const explanationLength = question.explanation.length;
      score += Math.min(explanationLength / 200, 0.3);
      
      // Check for examples in explanation
      if (question.explanation.includes('beispiel') || question.explanation.includes('zum beispiel')) {
        score += 0.2;
      }
    }

    // Check for multiple learning elements
    const hasMultipleElements = (
      (question.questionType === 'multiple-choice' && question.options && question.options.length >= 4) ||
      (question.questionType === 'word-selection' && question.selectableWords && question.selectableWords.length >= 3) ||
      (question.questionType === 'matching' && question.items && question.items.length >= 4)
    );

    if (hasMultipleElements) score += 0.2;

    return Math.min(score, 1);
  }

  /**
   * Evaluate technical correctness
   */
  private evaluateTechnicalCorrectness(question: SelectionQuestion, category: string): number {
    let score = 0.7; // Assume mostly correct by default

    // Check for obvious errors
    const questionText = question.question;
    
    // Check for incomplete sentences
    if (!questionText.includes('?') && !questionText.includes('.') && !questionText.includes('!')) {
      score -= 0.2;
    }

    // Check for placeholder text
    const placeholders = ['{{', '}}', '{', '}', 'undefined', 'null', 'NaN'];
    const hasPlaceholders = placeholders.some(placeholder => 
      questionText.includes(placeholder)
    );
    
    if (hasPlaceholders) score -= 0.5;

    // Category-specific checks
    if (category === 'math') {
      score += this.validateMathQuestion(question);
    }

    return Math.max(score, 0);
  }

  /**
   * Validate math question specifically
   */
  private validateMathQuestion(question: SelectionQuestion): number {
    let bonus = 0;
    const questionText = question.question;

    // Check for valid mathematical expressions
    const mathPattern = /\d+\s*[+\-×÷]\s*\d+/;
    if (mathPattern.test(questionText)) {
      bonus += 0.2;
    }

    // Check for proper mathematical notation
    if (questionText.includes('=') && questionText.includes('?')) {
      bonus += 0.1;
    }

    return bonus;
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(
    metrics: EnhancedQualityMetrics,
    config: QualityControlConfig
  ): number {
    const weights = {
      curriculum_alignment: 0.25,
      difficulty_appropriateness: 0.20,
      educational_value: 0.20,
      engagement_score: 0.15,
      accessibility_score: 0.10,
      technical_correctness: 0.10
    };

    return (
      metrics.curriculum_alignment * weights.curriculum_alignment +
      metrics.difficulty_appropriateness * weights.difficulty_appropriateness +
      metrics.educational_value * weights.educational_value +
      metrics.engagement_score * weights.engagement_score +
      metrics.accessibility_score * weights.accessibility_score +
      metrics.technical_correctness * weights.technical_correctness
    );
  }

  // Helper methods
  private getGradeSpecificKeywords(category: string, grade: number): string[] {
    const keywords = {
      math: {
        1: ['zählen', 'plus', 'minus', 'gleich', 'mehr', 'weniger'],
        2: ['mal', 'geteilt', 'einmaleins', 'rechnen'],
        3: ['hundert', 'tausend', 'bruch', 'komma'],
        4: ['dezimal', 'prozent', 'fläche', 'umfang']
      },
      german: {
        1: ['buchstabe', 'wort', 'satz', 'lesen'],
        2: ['geschichte', 'erzählen', 'adjektiv', 'nomen'],
        3: ['zeitform', 'vergangenheit', 'zukunft', 'präposition'],
        4: ['nebensatz', 'hauptsatz', 'konjunktion', 'komma']
      }
    };

    return keywords[category as keyof typeof keywords]?.[grade as keyof typeof keywords.math] || [];
  }

  private getExpectedComplexityForGrade(grade: number): number {
    const complexityLevels = { 1: 0.05, 2: 0.1, 3: 0.15, 4: 0.2 };
    return complexityLevels[grade as keyof typeof complexityLevels] || 0.2;
  }

  private evaluateVocabularyAppropriateness(text: string, grade: number): number {
    // Simple vocabulary check - could be enhanced with actual word lists
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['der', 'die', 'das', 'und', 'oder', 'ist', 'sind', 'haben', 'kann', 'soll']);
    
    const commonWordRatio = words.filter(word => commonWords.has(word)).length / words.length;
    return Math.min(commonWordRatio * 2, 1);
  }

  private getLearningObjectives(category: string, grade: number): string[] {
    const objectives = {
      math: {
        1: ['addition', 'subtraktion', 'zahlenraum', 'zählen'],
        2: ['multiplikation', 'division', 'einmaleins', 'textaufgaben'],
        3: ['brüche', 'dezimalzahlen', 'geometrie', 'messen'],
        4: ['prozentrechnung', 'flächen', 'volumen', 'statistik']
      },
      german: {
        1: ['buchstaben', 'silben', 'lesen', 'schreiben'],
        2: ['wortarten', 'satzzeichen', 'geschichten', 'rechtschreibung'],
        3: ['zeitformen', 'satzglieder', 'texte', 'sprache'],
        4: ['aufsatz', 'grammatik', 'literatur', 'kommunikation']
      }
    };

    return objectives[category as keyof typeof objectives]?.[grade as keyof typeof objectives.math] || [];
  }
}