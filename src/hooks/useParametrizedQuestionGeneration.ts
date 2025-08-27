// Hook für parametrisierte Fragengeneration
import { useState, useCallback } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { ParametrizedTemplateService, ParametrizedQuestionResult } from '@/services/ParametrizedTemplateService';
import { Quarter } from '@/data/templateBank';

interface UseParametrizedQuestionGenerationResult {
  questions: SelectionQuestion[];
  isLoading: boolean;
  error: string | null;
  qualityMetrics: ParametrizedQuestionResult['qualityMetrics'] | null;
  source: string;
  generateQuestions: (
    category: string,
    grade: number,
    quarter: Quarter,
    totalQuestions?: number,
    userId?: string
  ) => Promise<void>;
  resetSession: () => void;
}

export const useParametrizedQuestionGeneration = (): UseParametrizedQuestionGenerationResult => {
  const [questions, setQuestions] = useState<SelectionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<ParametrizedQuestionResult['qualityMetrics'] | null>(null);
  const [source, setSource] = useState<string>('none');

  const service = ParametrizedTemplateService.getInstance();

  const generateQuestions = useCallback(async (
    category: string,
    grade: number,
    quarter: Quarter = "Q1",
    totalQuestions: number = 5,
    userId?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🎯 Hook: Generiere ${totalQuestions} parametrisierte Fragen für ${category} Klasse ${grade} ${quarter}`);
      
      const result = await service.generateParametrizedQuestions(
        category,
        grade,
        quarter,
        totalQuestions,
        userId
      );

      if (result.questions.length === 0) {
        throw new Error(`Keine parametrisierten Fragen für ${category} Klasse ${grade} ${quarter} generiert`);
      }

      setQuestions(result.questions);
      setQualityMetrics(result.qualityMetrics);
      setSource(result.source);
      
      console.log(`✅ Hook: ${result.questions.length} parametrisierte Fragen erfolgreich geladen`);
      console.log(`📊 Quality Metrics:`, result.qualityMetrics);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler bei parametrisierter Fragengeneration';
      console.error('❌ Hook: Fehler bei parametrisierter Fragengeneration:', err);
      setError(errorMessage);
      setQuestions([]);
      setQualityMetrics(null);
      setSource('error');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const resetSession = useCallback(() => {
    service.resetSession();
    setQuestions([]);
    setError(null);
    setQualityMetrics(null);
    setSource('none');
    console.log('🔄 Parametrisierte Session zurückgesetzt');
  }, [service]);

  return {
    questions,
    isLoading,
    error,
    qualityMetrics,
    source,
    generateQuestions,
    resetSession
  };
};