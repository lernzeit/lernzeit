import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AccountDeleteSectionProps {
  isPremium?: boolean;
  onDeleted: () => void;
}

export function AccountDeleteSection({ isPremium = false, onDeleted }: AccountDeleteSectionProps) {
  const [step, setStep] = useState<'initial' | 'confirm'>('initial');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFirstConfirm = () => {
    setStep('confirm');
  };

  const handleDelete = async () => {
    if (confirmText !== 'LÖSCHEN') return;

    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Keine Sitzung gefunden');

      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      if (data?.error === 'active_subscription') {
        toast({
          title: 'Aktives Abo',
          description: data.message,
          variant: 'destructive',
        });
        setDeleting(false);
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ title: 'Account gelöscht', description: 'Dein Account wurde endgültig gelöscht.' });
      await supabase.auth.signOut();
      onDeleted();
    } catch (err: any) {
      console.error('Delete account error:', err);
      toast({
        title: 'Fehler',
        description: err?.message || 'Account konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setStep('initial');
      setConfirmText('');
    }
  };

  return (
    <div className="mt-8 pt-4 border-t border-border/40">
      <AlertDialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <AlertDialogTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
            Account löschen
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {step === 'initial' ? 'Account wirklich löschen?' : 'Letzte Bestätigung'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {step === 'initial' ? (
                  <>
                    <p>
                      Bist du sicher, dass du deinen Account <strong>endgültig löschen</strong> möchtest?
                      Folgende Daten werden unwiderruflich gelöscht:
                    </p>
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      <li>Profil und Kontodaten</li>
                      <li>Alle Lernsitzungen und Fortschritte</li>
                      <li>Erfolge und verdiente Minuten</li>
                      <li>Eltern-Kind-Verknüpfungen</li>
                      <li>Bildschirmzeit-Einstellungen</li>
                    </ul>
                    {isPremium && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
                        <Crown className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-yellow-800">
                          <strong>Hinweis:</strong> Du hast ein aktives Premium-Abo. Bitte kündige dieses
                          zuerst über die Abo-Verwaltung, da es sonst weiterhin berechnet wird.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      Tippe <strong>LÖSCHEN</strong> ein, um die Löschung zu bestätigen.
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="LÖSCHEN"
                      className="mt-2"
                      autoFocus
                    />
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            {step === 'initial' ? (
              <Button variant="destructive" onClick={handleFirstConfirm}>
                Ja, Account löschen
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== 'LÖSCHEN' || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gelöscht...
                  </>
                ) : (
                  'Endgültig löschen'
                )}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
