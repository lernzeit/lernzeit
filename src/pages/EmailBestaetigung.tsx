import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function EmailBestaetigung() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const handleResend = async () => {
    if (!email) {
      toast({ title: 'Fehler', description: 'E-Mail-Adresse nicht gefunden.', variant: 'destructive' });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setResent(true);
      toast({ title: 'E-Mail gesendet!', description: 'Bitte prüfe dein Postfach erneut.' });
    } catch (err: any) {
      toast({ title: 'Fehler', description: err.message || 'E-Mail konnte nicht erneut gesendet werden.', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4 pt-safe-top pb-safe-bottom">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 text-center p-8 rounded-t-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-4">
              <Mail className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Fast geschafft! 🎉</h1>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-semibold text-foreground">Bestätigungs-E-Mail prüfen</p>
                  <p className="text-sm text-muted-foreground">
                    Wir haben eine E-Mail an{' '}
                    {email ? <span className="font-medium text-foreground">{email}</span> : 'deine Adresse'}{' '}
                    geschickt. Klicke auf den Link in der E-Mail.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-semibold text-foreground">Anmelden</p>
                  <p className="text-sm text-muted-foreground">
                    Nach der Bestätigung kannst du dich mit deinen Zugangsdaten anmelden und loslegen.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>💡 <strong>Tipp:</strong> Schau auch im Spam-Ordner nach, falls du die E-Mail nicht findest.</p>
            </div>

            {/* Resend */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending || resent}
              >
                {resent ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    E-Mail erneut gesendet
                  </>
                ) : (
                  <>
                    <RefreshCw className={`w-4 h-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Wird gesendet…' : 'Bestätigungs-E-Mail erneut senden'}
                  </>
                )}
              </Button>

              <Button
                className="w-full"
                onClick={() => navigate('/?auth=true')}
              >
                Zur Anmeldung
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
