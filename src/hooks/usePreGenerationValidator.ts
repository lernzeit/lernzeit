/**
 * Pre-Generation Validator Hook - Phase 2
 * Validates templates before they are generated and stored
 */
import { useState, useCallback } from 'react';
import { templateQualityPipeline, GenerationContext } from '@/services/TemplateQualityPipeline';
import { contentValidator } from '@/services/ContentValidator';

export interface PreValidationResult {
  approved: boolean;
  recommendations: string[];
  adjustedParams?: Partial<GenerationContext>;
  estimatedQuality: number;
}

export function usePreGenerationValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<PreValidationResult | null>(null);

  /**
   * Validate generation context before creating templates
   */
  const validateBeforeGeneration = useCallback(async (
    context: GenerationContext
  ): Promise<PreValidationResult> => {
    setIsValidating(true);
    
    try {
      // Phase 2: Pre-generation pipeline validation
      const pipelineResult = await templateQualityPipeline.preGenerationValidation(context);
      
      // Additional context-specific validation
      const contextValidation = validateGenerationContext(context);
      
      // Combine results
      const result: PreValidationResult = {
        approved: pipelineResult.approved && contextValidation.valid,
        recommendations: [
          ...pipelineResult.recommendations,
          ...contextValidation.warnings
        ],
        adjustedParams: pipelineResult.adjustedDifficulty ? {
          difficulty: pipelineResult.adjustedDifficulty
        } : undefined,
        estimatedQuality: calculateEstimatedQuality(context, contextValidation)
      };

      setLastValidation(result);
      return result;
      
    } catch (error) {
      console.error('Pre-generation validation error:', error);
      return {
        approved: false,
        recommendations: ['Validierung fehlgeschlagen - bitte erneut versuchen'],
        estimatedQuality: 0.3
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Quick validation for template content before saving
   */
  const validateTemplateContent = useCallback(async (templateData: any): Promise<{
    valid: boolean;
    issues: string[];
    qualityScore: number;
  }> => {
    try {
      // Use content validator for immediate validation
      const validation = await contentValidator.validateTemplate(templateData);
      
      return {
        valid: validation.isValid && !validation.shouldExclude,
        issues: validation.issues,
        qualityScore: validation.qualityScore
      };
    } catch (error) {
      console.error('Template content validation error:', error);
      return {
        valid: false,
        issues: ['Content-Validierung fehlgeschlagen'],
        qualityScore: 0.2
      };
    }
  }, []);

  return {
    validateBeforeGeneration,
    validateTemplateContent,
    isValidating,
    lastValidation
  };
}

/**
 * Validate generation context for logical consistency
 */
function validateGenerationContext(context: GenerationContext): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = true;

  // Grade-specific validations
  if (context.grade <= 0 || context.grade > 12) {
    warnings.push('Ungültige Klassenstufe');
    valid = false;
  }

  // Domain-difficulty combinations
  if (context.domain === 'Zahlen & Operationen' && context.grade === 1 && context.difficulty === 'schwer') {
    warnings.push('Schwere Mathematik in Klasse 1 nicht empfohlen');
  }

  // Question type appropriateness
  const visualQuestionTypes = ['drag_drop', 'matching', 'drawing'];
  if (visualQuestionTypes.includes(context.questionType)) {
    warnings.push('Visuelle Fragetypen können problematisch sein - sorgfältige Prüfung erforderlich');
  }

  // Frequency checks would be done by the pipeline
  
  return { valid, warnings };
}

/**
 * Calculate estimated quality based on context parameters
 */
function calculateEstimatedQuality(
  context: GenerationContext, 
  contextValidation: { valid: boolean; warnings: string[] }
): number {
  let score = 0.7; // Base score

  // Grade appropriateness
  if (context.grade >= 1 && context.grade <= 12) {
    score += 0.1;
  }

  // Domain stability (some domains are more reliable)
  const stableDomains = ['Zahlen & Operationen', 'Größen & Messen'];
  if (stableDomains.includes(context.domain)) {
    score += 0.1;
  }

  // Difficulty appropriateness
  if (context.difficulty === 'mittel') {
    score += 0.05; // Medium difficulty tends to be more stable
  }

  // Question type reliability
  const reliableTypes = ['multiple_choice', 'number_input', 'true_false'];
  if (reliableTypes.includes(context.questionType)) {
    score += 0.1;
  }

  // Penalize context warnings
  score -= contextValidation.warnings.length * 0.05;

  return Math.max(0.1, Math.min(1.0, score));
}