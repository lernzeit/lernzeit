import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Clock, Smartphone, MessageSquare, CheckCircle, XCircle, AlertCircle, Hourglass } from 'lucide-react';
import { useScreenTimeRequests } from '@/hooks/useScreenTimeRequests';
import { useEarnedMinutesTracker } from '@/hooks/useEarnedMinutesTracker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ScreenTimeRequestWidgetProps {
  userId: string;
  role: 'child' | 'parent';
}

export function ScreenTimeRequestWidget({ userId, role }: ScreenTimeRequestWidgetProps) {
  const { requests, loading, createRequest, respondToRequest } = useScreenTimeRequests(role);
  const { 
    getAvailableMinutes, 
    getTodayRequestedMinutes, 
    getAvailableMinutesBreakdown 
  } = useEarnedMinutesTracker();
  const { toast } = useToast();
  
  const [message, setMessage] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMinutes, setAvailableMinutes] = useState(0);
  const [todayRequestedMinutes, setTodayRequestedMinutes] = useState(0);
  const [minutesBreakdown, setMinutesBreakdown] = useState({
    todaySessionMinutes: 0,
    achievementMinutes: 0,
    totalAvailable: 0,
    totalRequestedMinutes: 0,
    availableMinutes: 0
  });
  
  // Get pending request and recent requests
  const pendingRequest = requests.find(r => r.status === 'pending');
  const recentRequests = requests.slice(0, 3);

  // Load available minutes when component mounts
  useEffect(() => {
    const loadMinutesData = async () => {
      const [available, requested] = await Promise.all([
        getAvailableMinutes(userId),
        getTodayRequestedMinutes(userId)
      ]);
      setAvailableMinutes(available);
      setTodayRequestedMinutes(requested);
    };
    
    loadMinutesData();
  }, [userId, getAvailableMinutes, getTodayRequestedMinutes, requests]); // Refresh when requests change

  const handleRequestScreenTime = async () => {
    if (availableMinutes < 5) {
      toast({
        title: "Nicht genügend verdiente Zeit",
        description: "Du musst mindestens 5 Minuten durch Lernen verdienen, um Bildschirmzeit zu beantragen.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get parent-child relationships to find parent ID
      const { data: relationship } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId)
        .single();

      if (!relationship) {
        toast({
          title: "Kein Eltern-Link",
          description: "Du musst zuerst mit deinen Eltern verknüpft sein, um Bildschirmzeit zu beantragen.",
          variant: "destructive",
        });
        return;
      }

      const result = await createRequest(
        relationship.parent_id,
        availableMinutes, // Request all available earned minutes
        availableMinutes,
        message.trim() || undefined
      );

      if (result.success) {
        toast({
          title: "Anfrage gesendet! 🎉",
          description: `Du hast ${availableMinutes} Minuten Bildschirmzeit beantragt. Deine Eltern wurden benachrichtigt.`,
        });
        
        if (result.validation) {
          console.log('Request validation:', result.validation);
        }
        
        setMessage('');
        setShowDialog(false);
        
        // Refresh minutes data
        const [available, requested] = await Promise.all([
          getAvailableMinutes(userId),
          getTodayRequestedMinutes(userId)
        ]);
        setAvailableMinutes(available);
        setTodayRequestedMinutes(requested);
        
      } else {
        // Handle specific validation errors
        let errorMessage = result.error || "Die Anfrage konnte nicht gesendet werden.";
        
        if (result.validation) {
          if (!result.validation.has_parent_link) {
            errorMessage = "Du musst zuerst mit deinen Eltern verknüpft sein.";
          } else if (!result.validation.within_daily_limit) {
            errorMessage = `Du kannst heute nur noch ${result.validation.remaining_daily_minutes || 0} Minuten anfragen.`;
          } else if (!result.validation.sufficient_earned_minutes) {
            errorMessage = `Du hast nur ${result.validation.available_minutes || 0} Minuten verfügbar.`;
          } else if (!result.validation.no_duplicate_request) {
            errorMessage = "Du hast bereits eine ausstehende Anfrage.";
          }
        }
        
        toast({
          title: "Fehler beim Senden",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponse = async (requestId: string, status: 'approved' | 'denied', response?: string) => {
    const result = await respondToRequest(requestId, status, response);
    
    if (result.success) {
      toast({
        title: status === 'approved' ? 'Anfrage genehmigt!' : 'Anfrage abgelehnt!',
        description: status === 'approved' 
          ? 'Die Bildschirmzeit wurde freigegeben.' 
          : 'Die Anfrage wurde abgelehnt.',
      });
    } else {
      toast({
        title: "Fehler beim Bearbeiten der Anfrage",
        description: result.error || "Die Anfrage konnte nicht bearbeitet werden.",
        variant: "destructive",
      });
    }
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
            {/* Current Status */}
            {pendingRequest ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Anfrage läuft</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Du hast {pendingRequest.requested_minutes} Minuten angefragt. 
                  Warte auf die Antwort deiner Eltern.
                </p>
                {pendingRequest.request_message && (
                  <p className="text-xs text-yellow-600 mt-2 italic">
                    "{pendingRequest.request_message}"
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {availableMinutes > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {availableMinutes} Minuten verfügbar! 🎉
                    </span>
                  </div>
                  
                  {/* Detailed breakdown */}
                  <div className="mb-3 p-3 bg-white/50 rounded border text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Heute erspielt:</span>
                      <span className="font-medium text-green-700">{minutesBreakdown.todaySessionMinutes} Min.</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Achievement-Belohnungen:</span>
                      <span className="font-medium text-green-700">{minutesBreakdown.achievementMinutes} Min.</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>Gesamt verfügbar:</span>
                      <span className="font-medium text-green-700">{minutesBreakdown.totalAvailable} Min.</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Bereits beantragt:</span>
                      <span className="font-medium">-{minutesBreakdown.totalRequestedMinutes} Min.</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Noch verfügbar:</span>
                      <span className="text-green-800">{availableMinutes} Min.</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-green-700 mb-3">
                    Du kannst jetzt Bildschirmzeit bei deinen Eltern anfragen.
                  </p>
                  {todayRequestedMinutes > 0 && (
                    <p className="text-xs text-green-600 mb-3">
                      Heute bereits {todayRequestedMinutes} Minuten angefragt.
                    </p>
                  )}
                    
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          disabled={availableMinutes < 5}
                        >
                          <Smartphone className="w-4 h-4 mr-2" />
                          Zeit anfragen
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Bildschirmzeit anfragen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Du möchtest {availableMinutes} Minuten anfragen.</strong>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Diese Zeit hast du durch fleißiges Lernen verdient! 🌟
                            </p>
                            {todayRequestedMinutes > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                Heute bereits {todayRequestedMinutes} Minuten angefragt.
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="message">Nachricht an deine Eltern (optional)</Label>
                            <Textarea
                              id="message"
                              placeholder="Z.B. Ich möchte mit Freunden spielen..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={handleRequestScreenTime}
                              disabled={isSubmitting}
                              className="flex-1"
                            >
                              {isSubmitting ? 'Wird gesendet...' : 'Anfrage senden'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowDialog(false)}
                              disabled={isSubmitting}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Keine Zeit verfügbar</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Löse Aufgaben, um Bildschirmzeit zu verdienen und anzufragen! 📚
                    </p>
                    {todayRequestedMinutes > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Heute bereits {todayRequestedMinutes} Minuten angefragt.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              {role === 'child' ? 'Deine Anfragen:' : 'Anfragen von Kindern:'}
            </h4>
            {recentRequests.map((request) => (
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
            ))}
          </div>
        )}

        {requests.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            {role === 'child' ? 'Noch keine Anfragen gesendet' : 'Keine Anfragen erhalten'}
          </div>
        )}

        {role === 'child' && (
          <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
            💡 Verdiene Zeit durch Lernen und frage deine Eltern um Bildschirmzeit-Freigabe
          </div>
        )}
      </CardContent>
    </Card>
  );
}