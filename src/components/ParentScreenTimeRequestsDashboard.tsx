import React, { useState } from 'react';
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

interface ParentScreenTimeRequestsDashboardProps {
  userId: string;
}

export function ParentScreenTimeRequestsDashboard({ userId }: ParentScreenTimeRequestsDashboardProps) {
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<ScreenTimeRequest | null>(null);
  
  const { requests, loading, respondToRequest } = useScreenTimeRequests('parent');
  const { toast } = useToast();

  const platform = parentalControlsService.getPlatform();
  const isNative = parentalControlsService.isNativePlatform();
  const appName = parentalControlsService.getParentalControlAppName();

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
    
    setIsResponding(true);
    try {
      // First, approve in our system
      const result = await respondToRequest(pendingApprovalRequest.id, 'approved');
      
      if (result.success) {
        // Then try to open the parental control app
        if (openApp && isNative) {
          const openResult = await parentalControlsService.openParentalControlApp(
            pendingApprovalRequest.requested_minutes
          );
          
          toast({
            title: "Anfrage genehmigt! ✅",
            description: openResult.message,
          });
        } else {
          toast({
            title: "Anfrage genehmigt! ✅",
            description: `Bitte vergeben Sie ${pendingApprovalRequest.requested_minutes} Minuten Bildschirmzeit in ${appName}.`,
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
      setIsResponding(false);
    }
  };

  const handleDeny = async (requestId: string, response?: string) => {
    setIsResponding(true);
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
      setIsResponding(false);
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Bildschirmzeit-Anfragen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Bildschirmzeit-Anfragen
          </div>
          {pendingRequests.length > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              {pendingRequests.length} neu
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Requests - Prominent Display */}
        {pendingRequests.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              Neue Anfragen ({pendingRequests.length})
            </h4>
            {pendingRequests.map((request) => (
              <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Baby className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Bildschirmzeit-Anfrage
                      </p>
                      <p className="text-sm text-gray-600">
                        Vor {Math.round((Date.now() - new Date(request.created_at).getTime()) / (1000 * 60))} Min.
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {request.requested_minutes} Min.
                  </Badge>
                </div>
                
                {request.request_message && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Nachricht:</span>
                    </div>
                    <p className="text-sm text-gray-900 italic">
                      "{request.request_message}"
                    </p>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Verdiente Zeit</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Ihr Kind hat durch Lernen <strong>{request.earned_minutes} Minuten</strong> verdient 
                    und möchte diese als Bildschirmzeit nutzen.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproveClick(request)}
                    disabled={isResponding}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Anfrage ablehnen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Möchten Sie Ihrem Kind eine Erklärung für die Ablehnung mitgeben?
                        </p>
                        
                        <div>
                          <Label htmlFor="response">Nachricht (optional)</Label>
                          <Textarea
                            id="response"
                            placeholder="Z.B. Erst Hausaufgaben machen..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleDeny(request.id, responseMessage || undefined)}
                            disabled={isResponding}
                            variant="destructive"
                            className="flex-1"
                          >
                            Ablehnen
                          </Button>
                          <DialogTrigger asChild>
                            <Button variant="outline">Abbrechen</Button>
                          </DialogTrigger>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">Keine neuen Anfragen</h4>
            <p className="text-sm text-gray-600">
              Ihre Kinder haben derzeit keine Bildschirmzeit-Anfragen gestellt.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📱 So geben Sie Bildschirmzeit frei:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div><strong>iPhone/iPad:</strong> Einstellungen → Bildschirmzeit → [Kind] → App-Limits</div>
            <div><strong>Android:</strong> Family Link App → [Kind] → Gerätezeit → Heute mehr Zeit</div>
          </div>
        </div>

        {/* Recent Requests History */}
        {recentRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Letzte Anfragen:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="text-sm">{request.requested_minutes} Min.</span>
                    <span className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status === 'approved' ? 'Genehmigt' : 
                     request.status === 'denied' ? 'Abgelehnt' : 'Ausstehend'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Approval Dialog with option to open parental control app */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Bildschirmzeit genehmigen
            </DialogTitle>
          </DialogHeader>
          
          {pendingApprovalRequest && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Sie genehmigen <strong>{pendingApprovalRequest.requested_minutes} Minuten</strong> Bildschirmzeit für Ihr Kind.
                </p>
              </div>
              
              {isNative ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Möchten Sie {appName} öffnen, um die Bildschirmzeit direkt freizugeben?
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleApproveAndOpen(true)}
                      disabled={isResponding}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Genehmigen & {appName} öffnen
                    </Button>
                    
                    <Button
                      onClick={() => handleApproveAndOpen(false)}
                      disabled={isResponding}
                      variant="outline"
                    >
                      Nur genehmigen (später freigeben)
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    {platform === 'android' 
                      ? 'In Family Link: [Kind] → Gerätezeit → Heute mehr Zeit'
                      : 'In Bildschirmzeit: [Kind] → App-Limits → Zeit gewähren'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Nach der Genehmigung müssen Sie die Bildschirmzeit manuell in Ihrer Kindersicherungs-App freigeben.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <div className="font-medium mb-1">So geben Sie Zeit frei:</div>
                    <div>• <strong>Android:</strong> Family Link → [Kind] → Gerätezeit → Heute mehr Zeit</div>
                    <div>• <strong>iPhone:</strong> Einstellungen → Bildschirmzeit → [Kind] → App-Limits</div>
                  </div>
                  
                  <Button
                    onClick={() => handleApproveAndOpen(false)}
                    disabled={isResponding}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                </div>
              )}
              
              <DialogClose asChild>
                <Button variant="ghost" className="w-full" disabled={isResponding}>
                  Abbrechen
                </Button>
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}