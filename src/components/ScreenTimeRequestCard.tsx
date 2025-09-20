import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Badge import removed (not used on dashboard)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, AlertCircle } from 'lucide-react';
import { useScreenTimeRequests } from '@/hooks/useScreenTimeRequests';
import { useEarnedMinutesTracker } from '@/hooks/useEarnedMinutesTracker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ScreenTimeRequestCardProps {
  userId: string;
  earnedMinutes: number;
  hasParentLink: boolean;
}

export function ScreenTimeRequestCard({ userId, earnedMinutes, hasParentLink }: ScreenTimeRequestCardProps) {
  const [message, setMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { requests, loading, createRequest } = useScreenTimeRequests('child');
  const { toast } = useToast();

  // Minutes available today (reuse shared tracker)
  const { getAvailableMinutes } = useEarnedMinutesTracker();
  const [availableMinutes, setAvailableMinutes] = useState(0);

  // Load available minutes on mount and when requests change
  useEffect(() => {
    let isMounted = true;
    getAvailableMinutes(userId).then((mins) => {
      if (isMounted) setAvailableMinutes(mins);
    });
    return () => { isMounted = false; };
  }, [userId, getAvailableMinutes, requests]);

  // Get the most recent pending request
  const pendingRequest = requests.find(r => r.status === 'pending');
  // Recent requests overview hidden on dashboard per spec

  const handleCreateRequest = async () => {
    if (!hasParentLink) {
      toast({
        title: "Kein Eltern-Link",
        description: "Du musst zuerst mit deinen Eltern verknüpft sein, um Bildschirmzeit zu beantragen.",
        variant: "destructive",
      });
      return;
    }

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
      // Get parent ID from relationship
      const { data: relationship } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId)
        .single();

      if (!relationship) {
        toast({
          title: "Fehler",
          description: "Eltern-Kind Beziehung nicht gefunden.",
          variant: "destructive",
        });
        return;
      }

      const result = await createRequest(
        relationship.parent_id,
        availableMinutes, // Request all available earned minutes (today-based)
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
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Fehler beim Senden",
          description: result.error || "Die Anfrage konnte nicht gesendet werden.",
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

// Removed request status helpers (not used on dashboard)
  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-purple-600" />
          Bildschirmzeit-Anfragen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {hasParentLink ? (
              availableMinutes > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {availableMinutes} Minuten verdient! 🎉
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Du kannst jetzt Bildschirmzeit bei deinen Eltern anfragen.
                  </p>
                  
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
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
                            onClick={handleCreateRequest}
                            disabled={isSubmitting}
                            className="flex-1"
                          >
                            {isSubmitting ? 'Wird gesendet...' : 'Anfrage senden'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
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
                    <span className="font-medium text-blue-800">Keine Zeit verdient</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Löse Aufgaben, um Bildschirmzeit zu verdienen und anzufragen! 📚
                  </p>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-800">Eltern verknüpfen</span>
                </div>
                <p className="text-sm text-gray-700">
                  Verknüpfe zuerst deine Eltern, um Bildschirmzeit anfragen zu können.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recent Requests hidden on dashboard (shown in Settings) */}
      </CardContent>
    </Card>
  );
}