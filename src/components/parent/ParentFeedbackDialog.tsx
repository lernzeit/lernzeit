import React, { useState } from 'react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'wish', 'praise', 'other']),
  message: z.string().trim().min(1, 'Bitte gib eine Nachricht ein.').max(1000, 'Maximal 1000 Zeichen.'),
  contact_email: z
    .string()
    .trim()
    .email('Ungültige E-Mail-Adresse.')
    .max(255)
    .optional()
    .or(z.literal('')),
});

const CATEGORIES: { value: 'bug' | 'wish' | 'praise' | 'other'; label: string; hint: string }[] = [
  { value: 'bug', label: 'Fehler melden', hint: 'Etwas funktioniert nicht richtig' },
  { value: 'wish', label: 'Wunsch / Idee', hint: 'Vorschlag für eine neue Funktion' },
  { value: 'praise', label: 'Lob', hint: 'Was gefällt dir besonders gut?' },
  { value: 'other', label: 'Sonstiges', hint: 'Allgemeines Feedback' },
];

interface ParentFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  /**
   * When true, the feedback is flagged as a founding-family submission.
   * After successful submission, the grant-tester-reward edge function is called
   * to credit 3 months Premium (idempotent server-side).
   */
  isFoundingFamily?: boolean;
}

export function ParentFeedbackDialog({ open, onOpenChange, defaultEmail, isFoundingFamily }: ParentFeedbackDialogProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState<'bug' | 'wish' | 'praise' | 'other'>('wish');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open && defaultEmail && !email) setEmail(defaultEmail);
  }, [open, defaultEmail]);

  const reset = () => {
    setMessage('');
    setCategory('wish');
  };

  const handleSubmit = async () => {
    const parsed = feedbackSchema.safeParse({
      category,
      message,
      contact_email: email,
    });
    if (!parsed.success) {
      toast({
        title: 'Bitte prüfe deine Eingaben',
        description: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error('Nicht angemeldet');

      const platform = (() => {
        try {
          return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
        } catch {
          return 'web';
        }
      })();

      const appVersion =
        (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'unknown';

      const { error } = await supabase.from('parent_feedback').insert({
        user_id: userId,
        category: parsed.data.category,
        message: parsed.data.message,
        contact_email: parsed.data.contact_email ? parsed.data.contact_email : null,
        platform,
        app_version: appVersion,
        is_tester_feedback: !!isFoundingFamily,
      });
      if (error) throw error;

      // For founding families: trigger the 3-month Premium reward (idempotent).
      if (isFoundingFamily) {
        try {
          const { data: grantData } = await supabase.functions.invoke('grant-tester-reward');
          if (grantData?.ok && !grantData.already_granted) {
            toast({
              title: 'Danke, dass du LernZeit von Anfang an mitgestaltest! 🚀',
              description:
                'Du hast 3 Monate Premium und dein LernZeit-Familie-Abzeichen erhalten.',
            });
          } else {
            toast({
              title: 'Danke für dein Feedback!',
              description: 'Wir lesen jede Rückmeldung sorgfältig.',
            });
          }
        } catch {
          toast({
            title: 'Danke für dein Feedback!',
            description: 'Wir lesen jede Rückmeldung sorgfältig.',
          });
        }
      } else {
        toast({
          title: 'Danke für dein Feedback!',
          description: 'Wir lesen jede Rückmeldung sorgfältig.',
        });
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Fehler beim Senden',
        description: err?.message ?? 'Bitte versuche es später erneut.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback senden</DialogTitle>
          <DialogDescription>
            Deine Meinung hilft uns, LernZeit besser zu machen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Kategorie</Label>
            <RadioGroup
              value={category}
              onValueChange={(v) => setCategory(v as typeof category)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  htmlFor={`feedback-cat-${c.value}`}
                  className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                >
                  <RadioGroupItem id={`feedback-cat-${c.value}`} value={c.value} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.hint}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="feedback-message">Deine Nachricht</Label>
              <span className="text-xs text-muted-foreground">{message.length}/1000</span>
            </div>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              placeholder="Beschreibe dein Feedback so genau wie möglich…"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-email">E-Mail (optional)</Label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Für Rückfragen, falls nötig"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || message.trim().length === 0}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gesendet…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Feedback senden
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}