import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  calculatedAnswer: string | null;
  discrepancies: string[];
  suggestedCorrection: string | null;
  explanation: string;
}

export interface UseQuestionValidationReturn {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  validateQuestion: (params: {
    question: string;
    correctAnswer: string;
    userAnswer?: string;
    explanation?: string;
    grade: number;
    subject: string;
    templateId?: string;
  }) => Promise<ValidationResult | null>;
  clearValidation: () => void;
}

export function useQuestionValidation(): UseQuestionValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateQuestion = useCallback(async (params: {
    question: string;
    correctAnswer: string;
    userAnswer?: string;
    explanation?: string;
    grade: number;
    subject: string;
    templateId?: string;
  }): Promise<ValidationResult | null> => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      console.log('🔍 Starting question validation...');
      
      const { data, error } = await supabase.functions.invoke('validate-question', {
        body: params
      });

      if (error) {
        console.error('Validation invoke error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Validation failed');
      }

      const result = data.validation as ValidationResult;
      setValidationResult(result);
      
      console.log(`✅ Validation complete: ${result.isValid ? 'VALID' : 'INVALID'}`);
      
      return result;
    } catch (err) {
      console.error('❌ Question validation error:', err);
      toast.error('Validierung fehlgeschlagen');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    validationResult,
    validateQuestion,
    clearValidation
  };
}
