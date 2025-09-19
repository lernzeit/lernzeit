import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Smartphone, MessageSquare, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { useScreenTimeRequests } from '@/hooks/useScreenTimeRequests';
import { useScreenTimeLimit } from '@/hooks/useScreenTimeLimit';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ScreenTimeRequestWidgetProps {
  userId: string;
  role: 'child' | 'parent';
}

export function ScreenTimeRequestWidget({ userId, role }: ScreenTimeRequestWidgetProps) {
  const { requests, loading, createRequest, respondToRequest } = useScreenTimeRequests(role);
  const { remainingMinutes, todayMinutesUsed, isAtLimit } = useScreenTimeLimit(userId);
  // Removed useFamilyLinking - we'll fetch parent relationships directly
  const [message, setMessage] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const handleRequestScreenTime = async () => {
    // Get parent-child relationships to find parent ID
    const { data: relationships } = await supabase
      .from('parent_child_relationships')
      .select('parent_id')
      .eq('child_id', userId)
      .limit(1);

    if (!relationships || relationships.length === 0) {
      toast.error('Keine Eltern verknüpft. Verbinde dich zuerst mit deinen Eltern.');
      return;
    }

    const parentId = relationships[0].parent_id;
    const earnedMinutes = Math.max(0, todayMinutesUsed); // Minutes earned through learning
    const requestedMinutes = Math.min(earnedMinutes, 60); // Cap at 60 minutes per request

    const result = await createRequest(
      parentId, 
      requestedMinutes, 
      earnedMinutes, 
      message || `Ich habe heute ${earnedMinutes} Minuten durch Lernen verdient!`
    );

    if (result.success) {
      toast.success('Bildschirmzeit-Anfrage gesendet!');
      setMessage('');
      setShowDialog(false);
      
      // Show platform-specific instructions
      if (result.deep_links) {
        showPlatformInstructions(result.deep_links, requestedMinutes);
      }
    } else {
      toast.error('Fehler beim Senden der Anfrage: ' + result.error);
    }
  };

  const handleResponse = async (requestId: string, status: 'approved' | 'denied', response?: string) => {
    const result = await respondToRequest(requestId, status, response);
    
    if (result.success) {
      toast.success(status === 'approved' ? 'Anfrage genehmigt!' : 'Anfrage abgelehnt!');
    } else {
      toast.error('Fehler beim Bearbeiten der Anfrage');
    }
  };

  const showPlatformInstructions = (deepLinks: any, minutes: number) => {
    const instructions = `
Deine Eltern müssen nun die Bildschirmzeit freigeben:

📱 **iPhone/iPad (Screen Time):**
- Einstellungen → Bildschirmzeit → ${minutes} Min freigeben

🤖 **Android (Family Link):**
- Family Link App → Gerätezeit → ${minutes} Min hinzufügen

Die Anfrage läuft in 24 Stunden ab.
    `;
    
    toast.info(instructions, { duration: 10000 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Hourglass className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'denied': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">Lade Bildschirmzeit-Anfragen...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Bildschirmzeit-Anfragen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {role === 'child' && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Heute verdient</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {todayMinutesUsed} Minuten
                </div>
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={todayMinutesUsed === 0}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Zeit anfragen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bildschirmzeit anfragen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Du hast heute <strong>{todayMinutesUsed} Minuten</strong> durch Lernen verdient.
                    </div>
                    <Textarea
                      placeholder="Nachricht an deine Eltern (optional)"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleRequestScreenTime} className="flex-1">
                        Anfrage senden
                      </Button>
                      <Button variant="outline" onClick={() => setShowDialog(false)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}

        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              {role === 'child' ? 'Noch keine Anfragen gesendet' : 'Keine Anfragen erhalten'}
            </div>
          ) : (
            requests.slice(0, 5).map((request) => (
              <div key={request.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="font-medium">{request.requested_minutes} Minuten</span>
                    <Badge variant={getStatusColor(request.status) as any}>
                      {request.status === 'pending' ? 'Wartend' : 
                       request.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>

                {request.request_message && (
                  <div className="text-sm bg-muted p-2 rounded">
                    {request.request_message}
                  </div>
                )}

                {role === 'parent' && request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleResponse(request.id, 'approved')}
                      className="flex-1"
                    >
                      Genehmigen
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleResponse(request.id, 'denied')}
                      className="flex-1"
                    >
                      Ablehnen
                    </Button>
                  </div>
                )}

                {request.parent_response && (
                  <div className="text-sm text-muted-foreground italic">
                    Antwort: {request.parent_response}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {role === 'child' && (
          <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            💡 Verdiene Zeit durch Lernen und frage deine Eltern um Bildschirmzeit-Freigabe
          </div>
        )}
      </CardContent>
    </Card>
  );
}