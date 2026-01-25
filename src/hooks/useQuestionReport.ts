import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuestionValidation } from './useQuestionValidation';

export type ReportReason = 
  | 'wrong_answer' 
  | 'confusing_question' 
  | 'calculation_error' 
  | 'too_hard' 
  | 'too_easy' 
  | 'duplicate'
  | 'other';

export interface QuestionReport {
  reason: ReportReason;
  details?: string;
  question: string;
  statedAnswer: string;
  userAnswer?: string;
  explanation?: string;
  grade: number;
  subject: string;
  templateId?: string;
}

export interface UseQuestionReportReturn {
  isReporting: boolean;
  isValidating: boolean;
  reportQuestion: (report: QuestionReport) => Promise<boolean>;
  reportAndValidate: (report: QuestionReport) => Promise<{
    reported: boolean;
    validation: any | null;
  }>;
}

export function useQuestionReport(): UseQuestionReportReturn {
  const [isReporting, setIsReporting] = useState(false);
  const { user } = useAuth();
  const { isValidating, validateQuestion } = useQuestionValidation();

  const reportQuestion = useCallback(async (report: QuestionReport): Promise<boolean> => {
    if (!user) {
      toast.error('Bitte melde dich an, um Fragen zu melden');
      return false;
    }

    setIsReporting(true);

    try {
      console.log('📝 Submitting question report...', report.reason);

      const { error } = await supabase.from('question_feedback').insert({
        user_id: user.id,
        question_content: report.question,
        question_type: 'template',
        feedback_type: report.reason,
        feedback_details: JSON.stringify({
          statedAnswer: report.statedAnswer,
          userAnswer: report.userAnswer,
          explanation: report.explanation,
          details: report.details
        }),
        category: report.subject,
        grade: report.grade,
        template_id: report.templateId
      });

      if (error) {
        console.error('Report insert error:', error);
        throw error;
      }

      console.log('✅ Question reported successfully');
      toast.success('Danke für deine Meldung! Wir prüfen die Frage.');
      return true;
    } catch (err) {
      console.error('❌ Failed to report question:', err);
      toast.error('Meldung fehlgeschlagen. Bitte versuche es erneut.');
      return false;
    } finally {
      setIsReporting(false);
    }
  }, [user]);

  const reportAndValidate = useCallback(async (report: QuestionReport): Promise<{
    reported: boolean;
    validation: any | null;
  }> => {
    // First, submit the report
    const reported = await reportQuestion(report);

    if (!reported) {
      return { reported: false, validation: null };
    }

    // If the reason is wrong_answer or calculation_error, also run AI validation
    if (report.reason === 'wrong_answer' || report.reason === 'calculation_error') {
      console.log('🔍 Running AI validation for reported question...');
      
      const validation = await validateQuestion({
        question: report.question,
        correctAnswer: report.statedAnswer,
        userAnswer: report.userAnswer,
        explanation: report.explanation,
        grade: report.grade,
        subject: report.subject,
        templateId: report.templateId
      });

      if (validation && !validation.isValid) {
        console.log('⚠️ AI confirms the answer may be incorrect!');
        console.log(`Calculated answer: ${validation.calculatedAnswer}`);
        
        // Update the feedback with validation result
        if (report.templateId) {
          try {
            await supabase.from('question_feedback').update({
              feedback_details: JSON.stringify({
                statedAnswer: report.statedAnswer,
                userAnswer: report.userAnswer,
                explanation: report.explanation,
                details: report.details,
                aiValidation: {
                  isValid: validation.isValid,
                  calculatedAnswer: validation.calculatedAnswer,
                  discrepancies: validation.discrepancies,
                  confidence: validation.confidence
                }
              })
            }).eq('template_id', report.templateId)
              .eq('user_id', user?.id);
          } catch (err) {
            console.error('Failed to update feedback with validation:', err);
          }
        }

        toast.info(`KI-Prüfung: Die korrekte Antwort ist vermutlich ${validation.calculatedAnswer}`);
      }

      return { reported: true, validation };
    }

    return { reported: true, validation: null };
  }, [reportQuestion, validateQuestion, user]);

  return {
    isReporting,
    isValidating,
    reportQuestion,
    reportAndValidate
  };
}
