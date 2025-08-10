import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import IntelligentQualityDashboard from "@/components/IntelligentQualityDashboard";
import { supabase } from "@/integrations/supabase/client";
import { SelectionQuestion } from "@/types/questionTypes";
interface QualityDashboardModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function QualityDashboardModal({ isOpen, onOpenChange, userId }: QualityDashboardModalProps) {
  const [questions, setQuestions] = useState<SelectionQuestion[]>([]);
  const defaultCategory = "math";
  const defaultGrade = 4;

  useEffect(() => {
    const loadQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, body, variant, data, explanation, grade, subject, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('❗️Fehler beim Laden der Fragen:', error);
        return;
      }

      const mapped: SelectionQuestion[] = (data || []).map((q: any, idx: number) => {
        const variant = (q.variant || 'MULTIPLE_CHOICE').toString();
        const questionType = variant === 'MULTIPLE_CHOICE' ? 'multiple-choice' : 'text-input';
        const options = q?.data?.options?.map((o: any) => String(o));
        const correctAnswer = q?.data?.correctIndex;
        const questionText = q.body || q?.data?.prompt || '';
        return {
          id: idx + 1, // Dashboard erwartet numerische IDs
          question: questionText,
          questionType,
          type: (q.subject || 'general').toLowerCase(),
          explanation: q.explanation || '',
          options,
          correctAnswer,
        } as SelectionQuestion;
      });

      setQuestions(mapped);
    };

    if (isOpen) loadQuestions();
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Intelligentes Qualitäts-Dashboard</DialogTitle>
          <DialogDescription>
            Analysiert und optimiert Fragenqualität. (Vorab-Integration)
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <IntelligentQualityDashboard
            questions={questions as any}
            category={defaultCategory}
            grade={defaultGrade}
            userId={userId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
