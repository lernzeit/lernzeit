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
        .from('templates')
        .select('id, student_prompt, question_type, domain, explanation, grade, distractors, solution')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('❗️Fehler beim Laden der Templates:', error);
        return;
      }

      const mapped: SelectionQuestion[] = (data || []).map((t: any, idx: number) => {
        const questionType = t.question_type || 'multiple-choice';
        const options = t.distractors ? Object.values(t.distractors) as string[] : [];
        const correctAnswer = t.solution?.value || t.solution;
        const questionText = t.student_prompt || '';
        return {
          id: idx + 1, // Dashboard erwartet numerische IDs
          question: questionText,
          questionType,
          type: (t.domain || 'general').toLowerCase(),
          explanation: t.explanation || '',
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
