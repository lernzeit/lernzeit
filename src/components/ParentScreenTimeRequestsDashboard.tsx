import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, MessageSquare, CheckCircle, XCircle, AlertCircle, Baby, ExternalLink } from 'lucide-react';
import { useScreenTimeRequests, ScreenTimeRequest } from '@/hooks/useScreenTimeRequests';
import { useToast } from '@/hooks/use-toast';
import { parentalControlsService } from '@/services/parentalControlsService';
import { vielleichtUmBewertungBitten } from '@/lib/reviewPrompt';
import { useChildPlatforms } from '@/hooks/useChildPlatforms';
import { ChildPlatformDialog } from '@/components/ChildPlatformDialog';
import { trackFireAndForget } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { ShieldAttemptsNotice } from '@/components/ShieldAttemptsNotice';
import { ShieldSetupNotice } from '@/components/screenTime/ShieldSetupNotice';
import { GeraetFreigabenKarte } from '@/components/screenTime/GeraetFreigabenKarte';

interface ParentScreenTimeRequestsDashboardProps {
  userId: string;
  refreshTrigger?: number;
  /** Zahl der offenen Anfragen hat sich geaendert (genehmigt, abgelehnt, neu) */
  onOffeneGeaendert?: () => void;
}

export function ParentScreenTimeRequestsDashboard({ userId, refreshTrigger, onOffeneGeaendert }: ParentScreenTimeRequestsDashboardProps) {
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<ScreenTimeRequest | null>(null);
  const [childNames, setChildNames] = useState<Record<string, string>>({});
  const [askPlatformOpen, setAskPlatformOpen] = useState(false);
  
  const { requests, loading, respondToRequest, refreshRequests } = useScreenTimeRequests('parent');
  const { toast } = useToast();

  // Zaehler in der Navigation und bei "Kinder" mitziehen: Bis 05.10.2026 stand
  // dort nach dem Genehmigen weiter "1", bis die App neu geladen wurde.
  const offen = requests.filter((r) => r.status === 'pending').length;
  const offenVorher = useRef<number | null>(null);
  useEffect(() => {
    if (loading) return;
    if (offenVorher.current !== null && offenVorher.current !== offen) onOffeneGeaendert?.();
    offenVorher.current = offen;
  }, [offen, loading, onOffeneGeaendert]);

  // Refresh requests when parent component signals (e.g. user clicked "Jetzt antworten")
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refreshRequests();
    }
  }, [refreshTrigger, refreshRequests]);

  const { platforms: childPlatforms, setChildPlatform } = useChildPlatforms();

  // Fetch child names for all unique child_ids in requests
  useEffect(() => {
    const childIds = [...new Set(requests.map(r => r.child_id))];
    if (childIds.length === 0) return;
    
    supabase
      .from('profiles')
      .select('id, name')
      .in('id', childIds)
      .then(({ data }) => {
        if (data) {
          const names: Record<string, string> = {};
          data.forEach(p => { names[p.id] = p.name || 'Kind'; });
          setChildNames(names);
        }
      });
  }, [requests]);

  const getChildName = (childId: string) => childNames[childId] || 'Kind';

  const pendingChildId = pendingApprovalRequest?.child_id ?? null;
  const pendingChildName = pendingChildId ? getChildName(pendingChildId) : 'Kind';
  const pendingChildPlatform = pendingChildId ? (childPlatforms[pendingChildId] ?? null) : null;
  // Ziel richtet sich nach der Plattform des KINDES (bestehende Logik im Service)
  const target = parentalControlsService.getTargetForChild(pendingChildPlatform, pendingChildName);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const recentRequests = requests.slice(0, 5);

  // Step 1: User clicks approve → show dialog with option to open parental app
  const handleApproveClick = (request: ScreenTimeRequest) => {
    setPendingApprovalRequest(request);
    setShowApprovalDialog(true);
  };

  // Step 2: Actually approve and optionally open parental control app
  const handleApproveAndOpen = async (openApp: boolean) => {
    if (!pendingApprovalRequest) return;
    const reqId = pendingApprovalRequest.id;
    const reqMinutes = pendingApprovalRequest.requested_minutes;
    const reqChildId = pendingApprovalRequest.child_id;

    setRespondingId(reqId);
    try {
      // First, approve in our system
      const result = await respondToRequest(reqId, 'approved');

      if (result.success) {
        trackFireAndForget('screen_time_approved', {
          minutes: reqMinutes,
          platform_combo: parentalControlsService.getPlatformCombo(pendingChildPlatform),
          jump_target: target.kind,
          jumped: openApp && target.canOpen,
        });

        // Then try to open the parental control app for THIS child's platform
        if (openApp && target.canOpen) {
          const openResult = await parentalControlsService.openForChild(pendingChildPlatform, reqMinutes);
          void vielleichtUmBewertungBitten(reqChildId, openResult.opened);

          toast({
            title: "Anfrage genehmigt! ✅",
            description: openResult.message,
          });
        } else {
          void vielleichtUmBewertungBitten(reqChildId, false);
          toast({
            title: "Anfrage genehmigt! ✅",
            description: `Bitte gib ${reqMinutes} Minuten Bildschirmzeit in ${target.appName} frei.`,
          });
        }

        setShowApprovalDialog(false);
        setPendingApprovalRequest(null);
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Anfrage konnte nicht genehmigt werden.",
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeny = async (requestId: string, response?: string) => {
    setRespondingId(requestId);
    try {
      const result = await respondToRequest(requestId, 'denied', response);
      
      if (result.success) {
        toast({
          title: "Anfrage abgelehnt",
          description: "Die Anfrage wurde abgelehnt.",
        });
        setResponseMessage('');
        setSelectedRequestId(null);
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Antwort konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Anfragen werden geladen">
        <div className="h-40 animate-pulse rounded-[24px] bg-card" />
      </div>
    );
  }

  const vorMinuten = (iso: string) => {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (min < 60) return `vor ${min} Min.`;
    const std = Math.round(min / 60);
    if (std < 24) return `vor ${std} Std.`;
    return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  };

  // App-Redesign: Jede offene Anfrage ist ein Blatt mit allem, was fuer die
  // Entscheidung noetig ist. Genehmigen ist der Normalfall, Ablehnen leiser.
  return (
    <div className="space-y-4">
      {/* Steht die Sperre auf dem Kindgeraet? Versuche am Sperrbildschirm?
          Beides beschreibt die Lage und steht deshalb ueber den Anfragen. */}
      <GeraetFreigabenKarte />
      <ShieldSetupNotice parentId={userId} />
      <ShieldAttemptsNotice parentId={userId} />

      {pendingRequests.length > 0 ? (
        <ul className="space-y-3">
          {pendingRequests.map((request) => {
            const name = getChildName(request.child_id);
            return (
              <li key={request.id} className="space-y-3 rounded-[24px] bg-card p-4 shadow-[0_18px_36px_-24px_hsl(var(--tinte)/0.55)] ring-1 ring-inset ring-karo">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary" aria-hidden="true">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold leading-tight text-tinte">
                      {name} möchte {request.requested_minutes} Min.
                    </p>
                    <p className="text-xs text-muted-foreground">{vorMinuten(request.created_at)}</p>
                  </div>
                </div>
                {request.request_message && (
                  <p className="frage-text rounded-xl bg-muted px-3 py-2 font-hand text-[1.05rem] text-tinte">„{request.request_message}“</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Durch Lernen verdient: <b className="tabular text-tinte">{Math.min(request.earned_minutes, request.requested_minutes)} Min.</b>
                </p>
                <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="lg">Ablehnen</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Anfrage ablehnen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Magst du {name} sagen, warum? Die Nachricht ist freiwillig.</p>
                        <div className="space-y-2">
                          <Label htmlFor="response">Nachricht an {name}</Label>
                          <Textarea
                            id="response"
                            placeholder="Zum Beispiel: Erst die Hausaufgaben"
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={3}
                            className="rounded-xl border-[1.5px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <DialogClose asChild>
                            <Button variant="ghost">Abbrechen</Button>
                          </DialogClose>
                          <Button
                            onClick={() => handleDeny(request.id, responseMessage || undefined)}
                            disabled={respondingId === request.id}
                            variant="destructive"
                            className="flex-1"
                          >
                            Ablehnen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" onClick={() => handleApproveClick(request)} disabled={respondingId === request.id}>
                    Genehmigen
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="heft-karo rounded-[24px] bg-card px-5 py-8 text-center ring-1 ring-inset ring-karo">
          <p className="text-lg font-extrabold text-tinte">Keine offenen Anfragen</p>
          <p className="mt-1 text-sm text-muted-foreground">Wenn dein Kind Bildschirmzeit anfragt, steht sie hier.</p>
        </div>
      )}

      {recentRequests.length > 0 && (
        <section aria-labelledby="letzte-anfragen">
          <h3 id="letzte-anfragen" className="mb-1 px-1 text-sm font-extrabold">Letzte Anfragen</h3>
          <ul className="divide-y divide-karo rounded-[20px] bg-card px-4 ring-1 ring-inset ring-karo">
            {recentRequests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">
                  <b className="text-tinte">{getChildName(request.child_id)}</b>, {request.requested_minutes} Min.,{' '}
                  <span className="text-muted-foreground">{new Date(request.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
                </span>
                <span
                  className={
                    request.status === 'approved'
                      ? 'shrink-0 font-bold text-gruen-text'
                      : request.status === 'denied'
                        ? 'shrink-0 font-bold text-rotstift'
                        : 'shrink-0 font-bold text-muted-foreground'
                  }
                >
                  {request.status === 'approved' ? 'Genehmigt' : request.status === 'denied' ? 'Abgelehnt' : 'Offen'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Approval Dialog with option to open parental control app */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gruen-text" />
              Bildschirmzeit genehmigen
            </DialogTitle>
          </DialogHeader>
          
          {pendingApprovalRequest && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gruen-hell/10 p-4">
                <p className="text-sm text-tinte">
                  Du genehmigst <strong>{pendingApprovalRequest.requested_minutes} Minuten</strong> Bildschirmzeit für {getChildName(pendingApprovalRequest.child_id)}.
                </p>
              </div>
              
              {target.kind === 'manual' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Wir wissen noch nicht, welches Gerät {pendingChildName} nutzt. Bitte einmalig angeben,
                    damit wir dich zur richtigen Stelle bringen.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setAskPlatformOpen(true)}>
                    Gerät von {pendingChildName} angeben
                  </Button>
                  <Button
                    onClick={() => handleApproveAndOpen(false)}
                    disabled={respondingId === pendingApprovalRequest?.id}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Nur genehmigen (später freigeben)
                  </Button>
                </div>
              ) : target.canOpen ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Möchtest du {target.appName} öffnen, um die Bildschirmzeit direkt freizugeben?
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleApproveAndOpen(true)}
                      disabled={respondingId === pendingApprovalRequest?.id}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Genehmigen & {target.appName} öffnen
                    </Button>
                    
                    <Button
                      onClick={() => handleApproveAndOpen(false)}
                      disabled={respondingId === pendingApprovalRequest?.id}
                      variant="outline"
                    >
                      Nur genehmigen (später freigeben)
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">{target.hint}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-muted p-3 text-sm text-tinte">
                    {target.hint}
                  </div>
                  
                  <Button
                    onClick={() => handleApproveAndOpen(false)}
                    disabled={respondingId === pendingApprovalRequest?.id}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Genehmigen
                  </Button>
                </div>
              )}
              
              <DialogClose asChild>
                <Button variant="ghost" className="w-full" disabled={respondingId === pendingApprovalRequest?.id}>
                  Abbrechen
                </Button>
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ChildPlatformDialog
        open={askPlatformOpen}
        onOpenChange={setAskPlatformOpen}
        childName={pendingChildName}
        onSelect={(p) => { if (pendingChildId) setChildPlatform(pendingChildId, p); }}
      />
    </div>
  );
}