import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, AlertCircle, ChevronDown, ChevronUp, Trophy, Calendar } from 'lucide-react';
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

    if (availableMinutes < 5) {
      toast({
        title: "Nicht genügend Minuten",
        description: "Du musst mindestens 5 Minuten verdient haben, um Bildschirmzeit zu beantragen.",
        variant: "destructive",
      });
      return;
    }

    const minutesToRequest = availableMinutes;

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
        minutesToRequest,
        availableMinutes,
        message.trim() || undefined
      );

      if (result.success) {
        toast({
          title: "Anfrage gesendet! 🎉",
          description: `Du hast ${minutesToRequest} Minuten Bildschirmzeit beantragt. Deine Eltern wurden benachrichtigt.`,
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
        <div className="border-t pt-4 space-y-3">
          {/* Show older pending requests (from previous days) */}
          {olderPendingRequests.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">Offene Anfragen (ältere Tage)</span>
              </div>
              {olderPendingRequests.map((req) => (
                <div key={req.id} className="bg-white rounded border border-gray-100 p-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{formatDate(req.created_at)}</span>
                    <span className="font-medium text-gray-700">{req.requested_minutes} Min.</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show today's pending requests */}
          {todayPendingRequests.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-yellow-800 text-sm">
                  {todayPendingRequests.length === 1 ? 'Anfrage läuft' : `${todayPendingRequests.length} Anfragen laufen`}
                </span>
              </div>
              {todayPendingRequests.map((req) => (
                <div key={req.id} className="text-xs text-yellow-700 py-1 border-t border-yellow-100 first:border-t-0 first:pt-0">
                  <div className="flex justify-between">
                    <span>{req.requested_minutes} Minuten angefragt</span>
                    <span className="text-yellow-600">
                      {new Date(req.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {req.request_message && (
                    <p className="text-yellow-600 mt-1 italic">"{req.request_message}"</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Request button - now always shows if there are available minutes */}
          {hasParentLink ? (
            availableMinutes >= 5 ? (
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
                          <strong>Wähle, wie viele Minuten du beantragen möchtest:</strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Du hast heute {availableMinutes} Minuten zum Beantragen verfügbar.
                        </p>
                      </div>
                      
                      {/* Requested minutes (simple) */}
                      <div className="space-y-2">
                        <Label>Minuten</Label>
                        <div className="bg-muted rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-foreground">
                            {availableMinutes}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            (alle heute noch nicht beantragten Minuten)
                          </div>
                        </div>
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
                          disabled={isSubmitting || availableMinutes < 5}
                          className="flex-1"
                        >
                          {isSubmitting ? 'Wird gesendet...' : `${availableMinutes} Min. anfragen`}
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
            ) : availableMinutes > 0 ? (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-700">
                  📚 Du hast noch {availableMinutes} Minuten - verdiene noch {5 - availableMinutes} mehr, um Bildschirmzeit zu beantragen!
                </p>
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
      </CardContent>
    </Card>
  );
}
