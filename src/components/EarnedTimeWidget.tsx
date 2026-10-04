import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { useScreenTimeRequests } from '@/hooks/useScreenTimeRequests';
import { useEarnedMinutesTracker } from '@/hooks/useEarnedMinutesTracker';
import { useScreenTimeLimit, TodayAchievementDetail } from '@/hooks/useScreenTimeLimit';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EarnedTimeWidgetProps {
  userId: string;
  hasParentLink: boolean;
}

export function EarnedTimeWidget({ userId, hasParentLink }: EarnedTimeWidgetProps) {
  const [message, setMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { requests, loading: requestsLoading, createRequest, refreshRequests } = useScreenTimeRequests('child');
  const { getAvailableMinutes } = useEarnedMinutesTracker();
  const { 
    todayMinutesUsed, 
    todayAchievementMinutes, 
    todayAchievementDetails,
    remainingMinutes,
    loading: usageLoading 
  } = useScreenTimeLimit(userId);
  const { toast } = useToast();

  const [availableMinutes, setAvailableMinutes] = useState(0);

  const refreshAvailableMinutes = async () => {
    const mins = await getAvailableMinutes(userId);
    setAvailableMinutes(mins);
    return mins;
  };

  useEffect(() => {
    let isMounted = true;
    getAvailableMinutes(userId).then((mins) => {
      if (isMounted) {
        setAvailableMinutes(mins);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId, getAvailableMinutes, requests]);

  // Get pending requests - separate today's from older ones
  const today = new Date().toISOString().split('T')[0];
  const pendingRequests = requests.filter(r => r.status === 'pending');
  // Ruhiger Hinweis oben: die neueste offene Anfrage (Kind-Sicht, Daten sind
  // bereits geladen — kein zusätzlicher Serveraufruf).
  const latestPendingRequest = pendingRequests.length > 0
    ? pendingRequests.reduce((a, b) => (new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a))
    : null;
  const todayPendingRequests = requests.filter(r => 
    r.status === 'pending' && r.created_at.startsWith(today)
  );
  const olderPendingRequests = requests.filter(r => 
    r.status === 'pending' && !r.created_at.startsWith(today)
  );

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('de-DE', options);
  };

  const handleCreateRequest = async () => {
    if (!hasParentLink) {
      toast({
        title: "Kein Eltern-Link",
        description: "Du musst zuerst mit deinen Eltern verknüpft sein, um Bildschirmzeit zu beantragen.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const freshAvailableMinutes = await refreshAvailableMinutes();

      if (freshAvailableMinutes < 5) {
        toast({
          title: "Nicht genügend Minuten",
          description: "Aktuell sind weniger als 5 Minuten verfügbar. Bitte aktualisiere kurz und versuche es erneut.",
          variant: "destructive",
        });
        return;
      }

      const minutesToRequest = freshAvailableMinutes;

      const { data: relationships } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId);

      if (!relationships || relationships.length === 0) {
        toast({
          title: "Fehler",
          description: "Eltern-Kind Beziehung nicht gefunden.",
          variant: "destructive",
        });
        return;
      }

      // Send a request to EACH linked parent
      const results = await Promise.all(
        relationships.map(rel =>
          createRequest(
            rel.parent_id,
            minutesToRequest,
            minutesToRequest,
            message.trim() || undefined
          )
        )
      );

      const anySuccess = results.some(r => r.success);
      if (anySuccess) {
        const grantedMinutes = results.find(r => r.success)?.request?.requested_minutes ?? minutesToRequest;
        await Promise.all([refreshAvailableMinutes(), refreshRequests()]);
        toast({
          title: "Anfrage gesendet",
          description: `Du hast ${grantedMinutes} Minuten Bildschirmzeit beantragt. ${relationships.length > 1 ? 'Beide Elternteile' : 'Deine Eltern'} wurden benachrichtigt.`,
        });
        setMessage('');
        setIsDialogOpen(false);
      } else {
        await refreshAvailableMinutes();
        const firstError = results.find(r => r.error)?.error;
        toast({
          title: "Fehler beim Senden",
          description: firstError || "Die Anfrage konnte nicht gesendet werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating request:', error);
      await refreshAvailableMinutes();
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate session minutes (total minus achievement bonus)
  const sessionMinutes = todayMinutesUsed - todayAchievementMinutes;

  if (requestsLoading || usageLoading) {
    return <div className="h-12 animate-pulse rounded-full bg-muted" aria-label="Wird geladen" />;
  }

  // Seit dem App-Redesign zeigt die Zeit-Uhr die verdienten Minuten; hier
  // bleiben Anfrage, laufende Anfragen und der Bonus (Heft-Stil).
  return (
    <div className="space-y-3">
      {hasParentLink ? (
        availableMinutes >= 5 ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="w-full border-gruen-hell/40 bg-gruen-hell/10 text-gruen-text hover:bg-gruen-hell/15 hover:text-gruen-text">
                <Smartphone className="h-4 w-4" />
                {availableMinutes} Min. anfragen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bildschirmzeit anfragen</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="heft-karo rounded-2xl bg-card p-5 text-center ring-1 ring-inset ring-karo">
                  <div className="tabular text-5xl font-extrabold leading-none text-gruen-text">{availableMinutes}</div>
                  <p className="mt-1 text-sm font-bold text-tinte">Minuten</p>
                  <p className="mt-2 text-xs text-muted-foreground">Alle Minuten, die du heute verdient und noch nicht angefragt hast.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Nachricht an deine Eltern (freiwillig)</Label>
                  <Textarea
                    id="message"
                    placeholder="Zum Beispiel: Mathe ist fertig"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl border-[1.5px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateRequest} disabled={isSubmitting || availableMinutes < 5} className="flex-1" size="lg">
                    {isSubmitting ? 'Wird gesendet …' : `${availableMinutes} Min. anfragen`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {availableMinutes > 0
              ? `Ab 5 Minuten kannst du anfragen. Noch ${5 - availableMinutes} ${5 - availableMinutes === 1 ? 'Minute' : 'Minuten'} lernen.`
              : 'Lös Aufgaben, dann kannst du Bildschirmzeit anfragen.'}
          </p>
        )
      ) : (
        <p className="text-center text-sm text-muted-foreground">Verbinde dich zuerst mit deinen Eltern, dann kannst du Zeit anfragen.</p>
      )}

      {/* Laufende Anfragen, ruhig */}
      {latestPendingRequest && (
        <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-inset ring-karo">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-bold text-tinte">
              {todayPendingRequests.length > 1
                ? `${todayPendingRequests.length} Anfragen warten auf deine Eltern.`
                : `Deine Anfrage über ${latestPendingRequest.requested_minutes} Min. wartet auf deine Eltern.`}
            </p>
            <p className="text-muted-foreground">Du kannst in der Zwischenzeit weiterlernen.</p>
            {olderPendingRequests.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Ältere: {olderPendingRequests.map((r) => `${formatDate(r.created_at)} (${r.requested_minutes} Min.)`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bonus aus Erfolgen */}
      {todayAchievementMinutes > 0 && (
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 font-semibold text-gruen-text"
          >
            <Trophy className="h-3.5 w-3.5" />
            Davon {todayAchievementMinutes} Min. Bonus für Erfolge
            {todayAchievementDetails && todayAchievementDetails.length > 0 && (showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
          </button>
          {showDetails && todayAchievementDetails && todayAchievementDetails.length > 0 && (
            <ul className="mx-auto mt-2 max-w-xs space-y-1 text-left text-xs text-muted-foreground">
              {todayAchievementDetails.map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{a.icon} {a.name}</span>
                  <span className="tabular font-bold text-gruen-text">+{a.reward_minutes} Min.</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
