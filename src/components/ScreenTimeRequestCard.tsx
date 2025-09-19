import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Smartphone, Clock, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useScreenTimeRequests } from '@/hooks/useScreenTimeRequests';
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

  // Get the most recent pending request
  const pendingRequest = requests.find(r => r.status === 'pending');
  const recentRequests = requests.slice(0, 3);

  const handleCreateRequest = async () => {
    if (!hasParentLink) {
      toast({
        title: "Kein Elternteil verknüpft",
        description: "Du musst zuerst einen Elternteil verknüpfen, um Bildschirmzeit anfragen zu können.",
        variant: "destructive",
      });
      return;
    }

    if (earnedMinutes <= 0) {
      toast({
        title: "Keine Zeit verdient",
        description: "Du musst erst durch Lernen Zeit verdienen, bevor du sie anfragen kannst.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, we'll use a placeholder parent ID - this should be fetched from the parent_child_relationships table
      const { data: relationshipData } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId)
        .single();

      if (!relationshipData?.parent_id) {
        throw new Error('Kein Elternteil gefunden');
      }

      const result = await createRequest(
        relationshipData.parent_id,
        earnedMinutes,
        earnedMinutes,
        message || undefined
      );

      if (result.success) {
        toast({
          title: "Anfrage gesendet! 📱",
          description: "Deine Eltern können deine Anfrage jetzt genehmigen.",
        });
        setMessage('');
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Anfrage konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              earnedMinutes > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {earnedMinutes} Minuten verdient! 🎉
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
                            <strong>Du möchtest {earnedMinutes} Minuten anfragen.</strong>
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

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Letzte Anfragen:</h4>
            {recentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span className="text-sm">{request.requested_minutes} Min.</span>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  {request.status === 'approved' ? 'Genehmigt' : 
                   request.status === 'denied' ? 'Abgelehnt' : 'Ausstehend'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}