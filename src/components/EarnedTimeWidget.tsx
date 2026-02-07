import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, AlertCircle, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
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
  
  const { requests, loading: requestsLoading, createRequest } = useScreenTimeRequests('child');
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
        availableMinutes,
        availableMinutes,
        message.trim() || undefined
      );

      if (result.success) {
        toast({
          title: "Anfrage gesendet! 🎉",
          description: `Du hast ${availableMinutes} Minuten Bildschirmzeit beantragt. Deine Eltern wurden benachrichtigt.`,
        });
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

  // Calculate session minutes (total minus achievement bonus)
  const sessionMinutes = todayMinutesUsed - todayAchievementMinutes;

  if (requestsLoading || usageLoading) {
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
    <Card className="shadow-card bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Heute verdient
          </div>
          <span className="text-2xl font-bold text-blue-800">{todayMinutesUsed} Min.</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact breakdown */}
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">📚 Lernzeit:</span>
            <span className="font-medium">{sessionMinutes} Min.</span>
          </div>
          {todayAchievementMinutes > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-purple-600">🏆 Bonus:</span>
              <span className="font-medium text-purple-700">+{todayAchievementMinutes} Min.</span>
            </div>
          )}
        </div>

        {/* Expandable achievement details */}
        {todayAchievementDetails && todayAchievementDetails.length > 0 && (
          <div>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Details verbergen' : `${todayAchievementDetails.length} Achievement${todayAchievementDetails.length > 1 ? 's' : ''} anzeigen`}
            </button>
            
            {showDetails && (
              <div className="mt-2 p-3 bg-purple-50 rounded-lg space-y-1 text-xs">
                <div className="text-purple-700 font-medium mb-2 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Heute freigeschaltete Achievements:
                </div>
                {todayAchievementDetails.map((achievement, index) => (
                  <div key={index} className="flex justify-between text-purple-600 py-0.5">
                    <span className="truncate max-w-[200px]">
                      {achievement.icon} {achievement.name}
                    </span>
                    <span className="font-medium text-purple-700">+{achievement.reward_minutes} Min.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remaining time info */}
        <div className="flex justify-between items-center text-sm border-t pt-3">
          <span className="text-muted-foreground">Noch verfügbar (Tageslimit):</span>
          <span className="font-medium">{remainingMinutes} Min.</span>
        </div>

        {/* Screen Time Request Section */}
        <div className="border-t pt-4">
          {pendingRequest ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800 text-sm">Anfrage läuft</span>
              </div>
              <p className="text-xs text-yellow-700">
                Du hast {pendingRequest.requested_minutes} Minuten angefragt. 
                Warte auf die Antwort deiner Eltern.
              </p>
              {pendingRequest.request_message && (
                <p className="text-xs text-yellow-600 mt-1 italic">
                  "{pendingRequest.request_message}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {hasParentLink ? (
                availableMinutes > 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800 text-sm">
                          {availableMinutes} Minuten anforderbar! 🎉
                        </span>
                      </div>
                    </div>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Smartphone className="w-4 h-4 mr-2" />
                          Bildschirmzeit anfragen
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
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-700">
                      📚 Löse mehr Aufgaben, um Bildschirmzeit anfragen zu können!
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">
                    Verknüpfe zuerst deine Eltern, um Bildschirmzeit anfragen zu können.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
