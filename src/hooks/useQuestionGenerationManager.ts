import { useState, useEffect, useRef, useCallback } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { useBalancedQuestionGeneration } from './useBalancedQuestionGeneration';
import { useEnhancedCurriculumGeneration } from './useEnhancedCurriculumGeneration';
import { EnhancedTemplateBankService } from '@/services/templateBankService';
import type { Quarter } from '@/data/templateBank';

interface QuestionGenerationManagerProps {
  category: string;
  grade: number;
  userId: string;
  totalQuestions?: number;
  autoGenerate?: boolean;
  useEnhancedMode?: boolean;
  useTemplateBankMode?: boolean; // New template bank mode
  quarter?: Quarter;
}

export function useQuestionGenerationManager({
  category,
  grade,
  userId,
  totalQuestions = 5,
  autoGenerate = true,
  useEnhancedMode = false,
  useTemplateBankMode = true, // Default to new system
  quarter = "Q1"
}: QuestionGenerationManagerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  // Template Bank specific state
  const [templateBankProblems, setTemplateBankProblems] = useState<SelectionQuestion[]>([]);
  const [templateBankLoading, setTemplateBankLoading] = useState(false);
  const [templateBankError, setTemplateBankError] = useState<string | null>(null);
  const [templateBankSource, setTemplateBankSource] = useState<'template-bank' | 'knowledge-generated' | 'legacy-fallback' | null>(null);
  const [templateBankSessionId, setTemplateBankSessionId] = useState<string>('');
  
  // Track last generation parameters to prevent unnecessary regeneration
  const lastParamsRef = useRef<string>('');
  const initializationRef = useRef(false);
  
  // Template Bank Service instance
  const templateBankService = useRef(EnhancedTemplateBankService.getInstance());
  
  // Use Template Bank, enhanced, or balanced generation based on mode
  const balancedGeneration = useBalancedQuestionGeneration(category, grade, userId, totalQuestions);
  const enhancedGeneration = useEnhancedCurriculumGeneration(category, grade, userId, totalQuestions);
  
  // Template Bank generation function
  const generateFromTemplateBank = useCallback(async () => {
    if (templateBankLoading) return;
    
    setTemplateBankLoading(true);
    setTemplateBankError(null);
    
    try {
      console.log('🏦 Using Template-Bank generation');
      const result = await templateBankService.current.generateQuestions(
        category,
        grade,
        quarter,
        totalQuestions,
        {
          enableQualityControl: true,
          minQualityThreshold: 0.7,
          diversityWeight: 0.8,
          fallbackToLegacy: false // LEGACY DEAKTIVIERT
        }
      );
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setTemplateBankProblems(result.questions);
      setTemplateBankSource(result.source);
      setTemplateBankSessionId(result.sessionId);
      console.log(`✅ Template-Bank generated ${result.questions.length} questions`);
      
    } catch (error) {
      console.error('❌ Template-Bank generation failed:', error);
      setTemplateBankError(error instanceof Error ? error.message : 'Template-Bank generation failed');
    } finally {
      setTemplateBankLoading(false);
    }
  }, [category, grade, quarter, totalQuestions, templateBankLoading]);
  
  // Select the appropriate generation mode
  const {
    problems,
    isGenerating,
    error: legacyError,
    metadata
  } = useTemplateBankMode ? {
    problems: templateBankProblems,
    isGenerating: templateBankLoading,
    error: templateBankError,
    metadata: null
  } : useEnhancedMode ? enhancedGeneration : { 
    problems: balancedGeneration.problems, 
    isGenerating: balancedGeneration.isGenerating,
    error: null,
    metadata: null
  };
  
  const generationSource = useTemplateBankMode ? templateBankSource : 
    useEnhancedMode ? enhancedGeneration.metadata.source : balancedGeneration.generationSource;
  const sessionId = useTemplateBankMode ? templateBankSessionId :
    useEnhancedMode ? enhancedGeneration.metadata.sessionId : balancedGeneration.sessionId;
  const generateProblems = useTemplateBankMode ? generateFromTemplateBank :
    useEnhancedMode ? async () => {} : balancedGeneration.generateProblems;

  // Create stable parameter signature
  const currentParams = `${category}-${grade}-${userId}-${totalQuestions}-${useTemplateBankMode ? 'tb' : useEnhancedMode ? 'enh' : 'bal'}-${quarter}`;

  // Reset initialization when parameters change
  useEffect(() => {
    if (lastParamsRef.current !== currentParams) {
      console.log('📝 Parameters changed, resetting initialization');
      setIsInitialized(false);
      setGenerationError(null);
      setRetryCount(0);
      initializationRef.current = false;
      lastParamsRef.current = currentParams;
    }
  }, [currentParams]);

  // Auto-generate questions when needed
  useEffect(() => {
    if (!autoGenerate) return;
    
    // Don't initialize if already done for these parameters
    if (initializationRef.current) {
      console.log('📝 Already initialized for current parameters, skipping');
      return;
    }
    
    // Don't generate if already generating or if we have problems
    if (isGenerating || problems.length >= totalQuestions) {
      console.log('📝 Skipping generation - isGenerating:', isGenerating, 'problems:', problems.length);
      return;
    }
    
    // Don't generate if we've exceeded retries
    if (retryCount >= maxRetries) {
      console.log('📝 Max retries exceeded, stopping auto-generation');
      setGenerationError(`Failed to generate questions after ${maxRetries} attempts`);
      return;
    }

    console.log('🚀 Auto-generating questions for:', currentParams);
    initializationRef.current = true;
    
    const generateWithErrorHandling = async () => {
      try {
        setGenerationError(null);
        await generateProblems();
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Generation failed:', error);
        setGenerationError(error instanceof Error ? error.message : 'Unknown error');
        setRetryCount(prev => prev + 1);
        initializationRef.current = false; // Allow retry
      }
    };

    generateWithErrorHandling();
  }, [
    autoGenerate, 
    isGenerating, 
    problems.length, 
    totalQuestions, 
    retryCount, 
    maxRetries, 
    generateProblems,
    currentParams
  ]);

  // Update initialized state when we have enough problems
  useEffect(() => {
    if (problems.length >= totalQuestions && !isGenerating) {
      setIsInitialized(true);
      setGenerationError(null);
    }
  }, [problems.length, totalQuestions, isGenerating]);

  const manualRetry = useCallback(async () => {
    console.log('🔄 Manual retry requested');
    setRetryCount(0);
    setGenerationError(null);
    setIsInitialized(false);
    initializationRef.current = false;
    
    try {
      await generateProblems();
    } catch (error) {
      console.error('❌ Manual retry failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [generateProblems]);

  const refreshQuestions = useCallback(async () => {
    console.log('🔄 Refreshing questions');
    setIsInitialized(false);
    initializationRef.current = false;
    
    try {
      await generateProblems();
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [generateProblems]);

  return {
    problems,
    isGenerating,
    isInitialized,
    generationSource,
    sessionId,
    generationError: generationError || legacyError,
    retryCount,
    maxRetries,
    canRetry: retryCount < maxRetries,
    hasProblems: problems.length > 0,
    isComplete: problems.length >= totalQuestions,
    manualRetry,
    refreshQuestions,
    generateProblems,
    // Enhanced mode specific data
    metadata: useEnhancedMode ? metadata : undefined,
    qualityReport: useEnhancedMode ? enhancedGeneration.qualityReport : undefined,
    enhancedMode: useEnhancedMode,
    // Template Bank mode specific data
    templateBankMode: useTemplateBankMode,
    templateBankService: templateBankService.current
  };
}