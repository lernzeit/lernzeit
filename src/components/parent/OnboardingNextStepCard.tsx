import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { trackFireAndForget } from '@/lib/analytics';
import { shareInviteLink, buildInviteLink } from '@/lib/inviteLink';
import { Share2, KeyRound, UserPlus, Sparkles, Loader2 } from 'lucide-react';

interface LinkedChild {
  id: string;
  name?: string | null;
}

interface ActiveCode {
  id: string;
  code: string;
}

interface OnboardingNextStepCardProps {
  parentId: string;
  linkedChildren: LinkedChild[];
  activeCodes: ActiveCode[];
  /** Erstellt einen neuen Einladungscode (öffnet den Bereich „Kind einladen“). */
  onCreateCode: () => void;
  /** Springt zum Bereich mit dem sichtbaren Code. */
  onShowCode: () => void;
}

/**
 * Nächster-Schritt-Karte im Eltern-Dashboard. Bleibt sichtbar, bis der jeweilige
 * Schritt erledigt ist. Bei mehreren Kindern gewinnt der am weitesten
 * zurückliegende offene Schritt.
 */
export function OnboardingNextStepCard({
  parentId,
  linkedChildren,
  activeCodes,
  onCreateCode,
  onShowCode,
}: OnboardingNextStepCardProps) {
  const { toast } = useToast();
  const [hasRequest, setHasRequest] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState(false);
  const lastTrackedStep = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!parentId) return;
      const { count, error } = await supabase
        .from('screen_time_requests')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', parentId);
      if (!cancelled) setHasRequest(!error && (count ?? 0) > 0);
    };
    check();
    return () => { cancelled = true; };
  }, [parentId, linkedChildren.length]);

  // Zustand bestimmen
  let step: 1 | 2 | 3 | null = null;
  if (hasRequest === null) {
    step = null;
  } else if (hasRequest) {
    step = null; // Zustand D – Karte verschwindet dauerhaft
  } else if (linkedChildren.length === 0) {
    step = activeCodes.length > 0 ? 2 : 1;
  } else {
    step = 3;
  }

  useEffect(() => {
    if (step && lastTrackedStep.current !== step) {
      lastTrackedStep.current = step;
      trackFireAndForget('onboarding_step_viewed', { step });
    }
  }, [step]);

  if (!step) return null;

  const childName = linkedChildren[0]?.name?.trim() || 'Dein Kind';
  const code = activeCodes[0]?.code;

  const handleShare = async () => {
    if (!code) return;
    setSharing(true);
    const { method } = await shareInviteLink(code);
    setSharing(false);
    if (method === 'clipboard') {
      toast({ title: 'Link kopiert', description: buildInviteLink(code) });
    } else if (method === 'failed') {
      toast({ title: 'Teilen nicht möglich', description: 'Bitte den Code manuell weitergeben.', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-primary/40 bg-gradient-to-r from-primary/10 to-accent/5">
      <CardContent className="py-5 px-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            {step === 1 ? <UserPlus className="h-5 w-5 text-primary" />
              : step === 2 ? <Share2 className="h-5 w-5 text-primary" />
              : <Sparkles className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            {step === 1 && (
              <>
                <p className="font-bold text-base">Schritt 1 von 3: Kinderprofil anlegen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Lege für jedes Kind ein Profil mit Name und Klassenstufe an. Danach bekommst du einen Einladungslink.
                </p>
                <Button size="sm" className="mt-3" onClick={onCreateCode}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Kinderprofil anlegen
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="font-bold text-base">Schritt 2 von 3: {childName} verbinden</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Schicke {childName} diesen Link. Er oder sie öffnet ihn auf dem eigenen Handy und meldet sich damit an.
                  Der Link ist 7 Tage gültig.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={handleShare} disabled={sharing || !code}>
                    {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                    Link teilen
                  </Button>
                  <Button size="sm" variant="outline" onClick={onShowCode}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Code anzeigen
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="font-bold text-base">Schritt 3 von 3: {childName} löst die erste Aufgabe</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sobald {childName} Aufgaben löst, verdient er oder sie Bildschirmzeit und stellt hier einen Antrag.
                  Standard sind 30 Sekunden pro richtiger Aufgabe, höchstens 30 Minuten am Tag.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
