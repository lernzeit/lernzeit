import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuestionReport, type ReportReason } from '@/hooks/useQuestionReport';

interface QuestionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionText: string;
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
  grade: number;
  subject: string;
  templateId?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'wrong_answer', label: 'Falsche Antwort', description: 'Die angegebene richtige Antwort ist falsch' },
  { value: 'calculation_error', label: 'Rechenfehler', description: 'Die Berechnung stimmt nicht' },
  { value: 'confusing_question', label: 'Verwirrende Frage', description: 'Die Frage ist unklar formuliert' },
  { value: 'too_hard', label: 'Zu schwer', description: 'Die Frage ist für diese Klassenstufe zu schwer' },
  { value: 'too_easy', label: 'Zu einfach', description: 'Die Frage ist für diese Klassenstufe zu einfach' },
  { value: 'other', label: 'Sonstiges', description: 'Anderes Problem mit der Frage' }
];

export function QuestionReportDialog({
  open,
  onOpenChange,
  questionText,
  correctAnswer,
  userAnswer,
  explanation,
  grade,
  subject,
  templateId
}: QuestionReportDialogProps) {
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const { isReporting, reportQuestion } = useQuestionReport();

  const handleSubmitReport = async () => {
    if (!reportReason) return;

    await reportQuestion({
      reason: reportReason,
      details: reportDetails || undefined,
      question: questionText,
      statedAnswer: correctAnswer,
      userAnswer: userAnswer,
      explanation: explanation,
      grade: grade,
      subject: subject,
      templateId: templateId
    });

    onOpenChange(false);
    setReportReason('');
    setReportDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Frage melden
          </DialogTitle>
          <DialogDescription>
            Hilf uns, die Qualität der Fragen zu verbessern. Wir prüfen deine Meldung mit KI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Was ist das Problem?</Label>
            <RadioGroup 
              value={reportReason} 
              onValueChange={(val) => setReportReason(val as ReportReason)}
              className="space-y-2"
            >
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                  <RadioGroupItem value={reason.value} id={`report-${reason.value}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`report-${reason.value}`} className="font-medium cursor-pointer">
                      {reason.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{reason.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="report-details" className="text-sm font-medium mb-2 block">
              Details (optional)
            </Label>
            <Textarea
              id="report-details"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Was genau ist falsch? Wie müsste die richtige Antwort lauten?"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isReporting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={!reportReason || isReporting}
              className="flex-1"
            >
              {isReporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Senden...
                </>
              ) : (
                'Melden'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
