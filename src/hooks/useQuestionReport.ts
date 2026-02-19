import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  reportQuestion: (report: QuestionReport) => Promise<boolean>;
}

export function useQuestionReport(): UseQuestionReportReturn {
  const [isReporting, setIsReporting] = useState(false);
  const { user } = useAuth();

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
        question_type: 'ai-generated',
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

  return {
    isReporting,
    reportQuestion
  };
}
