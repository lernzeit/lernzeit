// Hook for Template-Bank based question generation
import { useState, useCallback, useRef, useEffect } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { EnhancedTemplateBankService, TemplateBankResult } from '@/services/templateBankService';
import type { Quarter } from '@/data/templateBank';

interface TemplateBankGenerationOptions {
  enableQualityControl?: boolean;
  minQualityThreshold?: number;
  preferredDifficulty?: "AFB I" | "AFB II" | "AFB III";
  diversityWeight?: number;
  fallbackToLegacy?: boolean;
}

export function useTemplateBankGeneration(
  category: string,
  grade: number,
  userId: string,
  totalQuestions: number = 5,
  quarter: Quarter = "Q1",
  options: TemplateBankGenerationOptions = {}
) {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [generationSource, setGenerationSource] = useState<'template-bank' | 'knowledge-generated' | 'legacy-fallback' | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState({
    averageQuality: 0,
    templateCoverage: 0,
    domainDiversity: 0
  });

  const templateBankService = useRef(EnhancedTemplateBankService.getInstance());
  const lastParamsRef = useRef<string>('');
  const initializationRef = useRef(false);

  // Generate questions using Template-Bank
  const generateProblems = useCallback(async () => {
    if (isGenerating) {
      console.log('🚫 Template-Bank generation already in progress');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log(`🏦 Starting Template-Bank generation: ${category} Grade ${grade} Quarter ${quarter}`);
      
      const result: TemplateBankResult = await templateBankService.current.generateQuestions(
        category,
        grade,
        quarter,
        totalQuestions,
        {
          enableQualityControl: true,
          minQualityThreshold: 0.7,
          diversityWeight: 0.8,
          fallbackToLegacy: false, // LEGACY FALLBACKS DEAKTIVIERT
          ...options
        },
        userId // Pass userId for feedback analysis
      );

      if (result.error) {
        throw new Error(result.error);
      }

      setProblems(result.questions);
      setSessionId(result.sessionId);
      setGenerationSource(result.source);
      setQualityMetrics(result.qualityMetrics);

      console.log(`✅ Template-Bank generation complete: ${result.questions.length} questions from ${result.source}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Template-Bank generation failed';
      console.error('❌ Template-Bank generation error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [category, grade, quarter, totalQuestions, options, isGenerating, userId]);

  // Auto-generate on parameter change
  useEffect(() => {
    const currentParams = `${category}-${grade}-${quarter}-${totalQuestions}-${userId}`;
    
    if (lastParamsRef.current !== currentParams) {
      console.log('📝 Template-Bank parameters changed, resetting');
      setProblems([]);
      setError(null);
      setSessionId('');
      setGenerationSource(null);
      setQualityMetrics({ averageQuality: 0, templateCoverage: 0, domainDiversity: 0 });
      initializationRef.current = false;
      lastParamsRef.current = currentParams;
    }
  }, [category, grade, quarter, totalQuestions, userId]);

  // Auto-generate when parameters are stable
  useEffect(() => {
    if (!initializationRef.current && !isGenerating && problems.length === 0) {
      console.log('🚀 Auto-starting Template-Bank generation');
      initializationRef.current = true;
      generateProblems();
    }
  }, [generateProblems, isGenerating, problems.length]);

  // Manual refresh
  const refreshQuestions = useCallback(async () => {
    console.log('🔄 Manual Template-Bank refresh');
    setProblems([]);
    setError(null);
    initializationRef.current = false;
    await generateProblems();
  }, [generateProblems]);

  // Clear cache
  const clearCache = useCallback(() => {
    templateBankService.current.clearCache();
    console.log('🧹 Template-Bank cache cleared');
  }, []);

  return {
    problems,
    isGenerating,
    error,
    sessionId,
    generationSource,
    qualityMetrics,
    generateProblems,
    refreshQuestions,
    clearCache,
    // Status helpers
    isInitialized: problems.length > 0,
    hasProblems: problems.length > 0,
    isComplete: problems.length >= totalQuestions,
    // Template Bank specific metrics
    templateBankMetrics: {
      source: generationSource,
      quality: qualityMetrics.averageQuality,
      coverage: qualityMetrics.templateCoverage,
      diversity: qualityMetrics.domainDiversity
    }
  };
}