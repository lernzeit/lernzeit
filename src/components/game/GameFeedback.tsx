import React, { useState } from 'react';
import { Check, X, ArrowRight, Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
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

interface GameFeedbackProps {
  feedback: 'correct' | 'incorrect' | null;
  explanation?: string;
  correctAnswer?: string;
  userAnswer?: string;
  questionText?: string;
  grade?: number;
  subject?: string;
  templateId?: string;
  onQuestionFeedback?: (feedbackType: 'thumbs_up' | 'thumbs_down' | 'too_hard' | 'too_easy') => void;
  onSkipFeedback?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'wrong_answer', label: 'Falsche Antwort', description: 'Die angegebene richtige Antwort ist falsch' },
  { value: 'calculation_error', label: 'Rechenfehler', description: 'Die Berechnung stimmt nicht' },
  { value: 'confusing_question', label: 'Verwirrende Frage', description: 'Die Frage ist unklar formuliert' },
  { value: 'too_hard', label: 'Zu schwer', description: 'Die Frage ist für diese Klassenstufe zu schwer' },
  { value: 'too_easy', label: 'Zu einfach', description: 'Die Frage ist für diese Klassenstufe zu einfach' },
  { value: 'other', label: 'Sonstiges', description: 'Anderes Problem mit der Frage' }
];

export function GameFeedback({ 
  feedback, 
  explanation,
  correctAnswer,
  userAnswer,
  questionText,
  grade,
  subject,
  templateId,
  onQuestionFeedback,
  onSkipFeedback
}: GameFeedbackProps) {
  const isMobile = useIsMobile();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const { isReporting, isValidating, reportAndValidate } = useQuestionReport();
  
  if (!feedback) return null;

  const handleSubmitReport = async () => {
    if (!reportReason || !questionText) return;

    await reportAndValidate({
      reason: reportReason,
      details: reportDetails || undefined,
      question: questionText,
      statedAnswer: correctAnswer || '',
      userAnswer: userAnswer,
      explanation: explanation,
      grade: grade || 1,
      subject: subject || 'math',
      templateId: templateId
    });

    setShowReportDialog(false);
    setReportReason('');
    setReportDetails('');
  };

  return (
    <>
      <div className={`p-6 rounded-lg border-2 ${
        feedback === 'correct' 
          ? 'bg-green-50 text-green-800 border-green-200' 
          : 'bg-red-50 text-red-800 border-red-200'
      }`}>
        <div className="flex items-center justify-center gap-3 mb-3">
          {feedback === 'correct' ? (
            <Check className="w-8 h-8 text-green-600" />
          ) : (
            <X className="w-8 h-8 text-red-600" />
          )}
          <span className="font-bold text-lg">
            {feedback === 'correct' ? '🎉 Richtig!' : '❌ Falsch!'}
          </span>
        </div>
        
        {/* Show correct answer for incorrect responses */}
        {feedback === 'incorrect' && correctAnswer && (
          <div className="mt-3 p-3 bg-white/50 rounded-md border-l-4 border-green-500">
            <p className="text-sm font-medium mb-1 text-green-700">Richtige Antwort:</p>
            <p className="text-sm font-semibold text-green-800">{correctAnswer}</p>
            {userAnswer && (
              <p className="text-xs text-red-600 mt-1">Deine Antwort: {userAnswer}</p>
            )}
          </div>
        )}
        
        {/* Show explanation only for incorrect answers */}
        {feedback === 'incorrect' && explanation && (
          <div className="mt-3 p-3 bg-white/50 rounded-md">
            <p className="text-sm font-medium mb-2">Erklärung:</p>
            <div className="text-sm space-y-1">
              {explanation.split('\n').map((line, index) => (
                <div key={index}>
                  {line.trim() ? (
                    <p>{line}</p>
                  ) : (
                    <div className="h-1"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Button - especially visible for incorrect answers */}
        {feedback === 'incorrect' && questionText && (
          <div className="mt-4 pt-3 border-t border-red-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReportDialog(true)}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              <Flag className="w-4 h-4 mr-2" />
              Frage melden (Antwort falsch?)
            </Button>
          </div>
        )}

        {/* Simple Emoji Feedback Buttons */}
        {onQuestionFeedback && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs text-center mb-2 text-muted-foreground">Wie fandest du die Frage?</p>
            <div className="flex gap-1.5 justify-center">
              <Button
                variant="outline"
                size={isMobile ? "sm" : "lg"}
                onClick={() => onQuestionFeedback('thumbs_up')}
                className={`${isMobile ? 'text-xl px-3' : 'text-2xl'} hover:bg-green-100 hover:border-green-300`}
                title="Gut"
              >
                👍
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "lg"}
                onClick={() => onQuestionFeedback('thumbs_down')}
                className={`${isMobile ? 'text-xl px-3' : 'text-2xl'} hover:bg-red-100 hover:border-red-300`}
                title="Schlecht"
              >
                👎
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "lg"}
                onClick={() => onQuestionFeedback('too_hard')}
                className={`${isMobile ? 'text-xl px-3' : 'text-2xl'} hover:bg-orange-100 hover:border-orange-300`}
                title="Zu schwer"
              >
                😰
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "lg"}
                onClick={() => onQuestionFeedback('too_easy')}
                className={`${isMobile ? 'text-xl px-3' : 'text-2xl'} hover:bg-blue-100 hover:border-blue-300`}
                title="Zu leicht"
              >
                😴
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4 justify-center">
          {onSkipFeedback && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSkipFeedback}
              className="flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              Weiter
            </Button>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
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
                    <RadioGroupItem value={reason.value} id={reason.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={reason.value} className="font-medium cursor-pointer">
                        {reason.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{reason.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="details" className="text-sm font-medium mb-2 block">
                Details (optional)
              </Label>
              <Textarea
                id="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Was genau ist falsch? Wie müsste die richtige Antwort lauten?"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReportDialog(false)}
                className="flex-1"
                disabled={isReporting || isValidating}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={!reportReason || isReporting || isValidating}
                className="flex-1"
              >
                {isReporting || isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isValidating ? 'KI prüft...' : 'Senden...'}
                  </>
                ) : (
                  'Melden'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
