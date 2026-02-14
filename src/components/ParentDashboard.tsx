import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFamilyLinking } from '@/hooks/useFamilyLinking';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  RefreshCw, 
  Users, 
  Smartphone, 
  Plus, 
  Copy, 
  Trash2, 
  Key, 
  User,
  GraduationCap,
  Baby,
  Settings,
  BarChart3,
  Loader2,
  Crown,
  Check,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { ChildLearningAnalysis } from '@/components/ChildLearningAnalysis';
import { ParentScreenTimeRequestsDashboard } from '@/components/ParentScreenTimeRequestsDashboard';
import { ChildSettingsEditor } from '@/components/ChildSettingsEditor';

interface ParentDashboardProps {
  userId: string;
}

interface LinkedChild {
  id: string;
  name: string | null;
  grade: number;
}

export function ParentDashboard({ userId }: ParentDashboardProps) {
  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [newCodeLoading, setNewCodeLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { isPremium, isTrialing, trialJustExpired, trialDaysLeft, plan, status, currentPeriodEnd, loading: subLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast({
        title: 'Fehler',
        description: 'Checkout konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast({
        title: 'Fehler',
        description: 'Portal konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };
  const {
    loading,
    linkedChildren,
    invitationCodes,
    loadFamilyData,
    generateInvitationCode,
    removeChildLink,
  } = useFamilyLinking();

  useEffect(() => {
    if (userId) {
      loadFamilyData(userId);
      loadProfileName();
    }
  }, [userId]);

  // Setze erstes Kind als Standard wenn Kinder geladen werden
  useEffect(() => {
    if (linkedChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(linkedChildren[0].id);
    }
  }, [linkedChildren, selectedChildId]);

  const loadProfileName = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (data?.name) {
        setProfileName(data.name);
      }
    } catch (error) {
      console.error('Error loading profile name:', error);
    }
  };

  const handleRefresh = () => {
    loadFamilyData(userId);
  };

  const handleGenerateCode = async () => {
    setNewCodeLoading(true);
    await generateInvitationCode(userId);
    setNewCodeLoading(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code kopiert!",
      description: "Der Einladungscode wurde in die Zwischenablage kopiert.",
    });
  };

  const handleRemoveChild = async (childId: string) => {
    const success = await removeChildLink(userId, childId);
    if (success) {
      loadFamilyData(userId);
    }
  };

  const saveProfileName = async () => {
    if (!profileName.trim()) return;

    try {
      setProfileSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ name: profileName.trim() })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profil aktualisiert",
        description: "Ihr Name wurde erfolgreich gespeichert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Name konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPasswordChanging(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Passwort geändert",
        description: "Ihr Passwort wurde erfolgreich aktualisiert.",
      });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Passwort konnte nicht geändert werden.",
        variant: "destructive",
      });
    } finally {
      setPasswordChanging(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Abgelaufen';
    
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 60) return `${diffMin} Min`;
    
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ${diffMin % 60}min`;
  };

  const activeCodes = invitationCodes.filter(code => 
    !code.is_used && new Date(code.expires_at) > new Date()
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eltern-Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Verwalten Sie Ihre Familie und Bildschirmzeit-Anfragen
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Trial Banner - top of dashboard */}
      {trialDaysLeft !== null && trialDaysLeft > 0 && !isPremium && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  🎁 Testphase: noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'} kostenlos
                </p>
                <p className="text-xs text-muted-foreground">
                  Sichern Sie sich jetzt Premium – monatlich kündbar.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleUpgrade} disabled={checkoutLoading} className="shrink-0">
              {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
              Premium aktivieren
            </Button>
          </CardContent>
        </Card>
      )}

      {trialJustExpired && !isPremium && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Testphase abgelaufen – Einstellungen zurückgesetzt</p>
                  <p className="text-xs text-muted-foreground">
                    Ihre kostenlose Testphase ist beendet. Individuelle Einstellungen wurden auf Standardwerte zurückgesetzt.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleUpgrade} disabled={checkoutLoading} className="shrink-0">
                {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                Jetzt upgraden
              </Button>
            </div>
            <div className="ml-13 pl-[52px] text-xs text-muted-foreground space-y-1">
              <p>Folgende Änderungen wurden vorgenommen:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Zeitlimits: 30 Min (werktags) / 60 Min (Wochenende)</li>
                <li>Belohnungszeit pro Aufgabe: 30 Sekunden (alle Fächer)</li>
                <li>Fächersichtbarkeit: Alle Fächer wieder sichtbar</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Anfragen</span>
          </TabsTrigger>
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Kinder</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analyse</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Abo</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Konto</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Bildschirmzeit-Anfragen */}
        <TabsContent value="requests" className="space-y-4">
          <ParentScreenTimeRequestsDashboard userId={userId} />
        </TabsContent>

        {/* Tab: Kinder verwalten */}
        <TabsContent value="children" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardContent className="flex items-center p-4">
                <Users className="h-8 w-8 text-primary mr-3" />
                <div>
                  <div className="text-2xl font-bold">{linkedChildren.length}</div>
                  <div className="text-xs text-muted-foreground">Verknüpfte Kinder</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-4">
                <Key className="h-8 w-8 text-primary mr-3" />
                <div>
                  <div className="text-2xl font-bold">{activeCodes.length}</div>
                  <div className="text-xs text-muted-foreground">Aktive Codes</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linked Children */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5" />
                Verknüpfte Kinder
              </CardTitle>
              <CardDescription>
                Kinder, die mit Ihrem Konto verbunden sind
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkedChildren.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Noch keine Kinder verknüpft
                  </p>
                  <Button onClick={handleGenerateCode} disabled={newCodeLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Einladungscode erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedChildren.map((child) => (
                    <Card key={child.id} className="overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{child.name || 'Unbenannt'}</div>
                            <div className="text-sm text-muted-foreground">
                              Klasse {child.grade}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Verknüpft</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveChild(child.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="pt-4">
                        <ChildSettingsEditor 
                          childId={child.id}
                          childName={child.name || 'Kind'}
                          parentId={userId}
                          currentGrade={child.grade}
                          onSettingsChanged={() => loadFamilyData(userId)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitation Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Einladungscodes
              </CardTitle>
              <CardDescription>
                Erstellen Sie Codes, damit sich Kinder mit Ihnen verknüpfen können
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateCode} 
                disabled={newCodeLoading}
                className="w-full"
              >
                {newCodeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Code wird erstellt...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Neuen Code erstellen
                  </>
                )}
              </Button>

              {activeCodes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Aktive Codes:</Label>
                  {activeCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-mono text-lg font-bold tracking-widest">
                          {code.code}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gültig noch: {formatTimeRemaining(code.expires_at)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-accent/50 border border-border rounded-lg p-4">
                <h4 className="font-medium mb-2">So funktioniert's:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Erstellen Sie einen 6-stelligen Code</li>
                  <li>Geben Sie diesen Code Ihrem Kind</li>
                  <li>Ihr Kind gibt den Code in seiner App ein</li>
                  <li>Die Konten werden verknüpft</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Abonnement */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Plan Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Ihr Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Current Plan Card */}
                <Card className={`border-2 ${isPremium ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {isPremium ? 'LernZeit Premium' : 'LernZeit Kostenlos'}
                      </CardTitle>
                      {isPremium && <Crown className="h-5 w-5 text-primary" />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <Badge variant={isPremium ? 'default' : 'secondary'}>
                        {status === 'active' ? 'Aktiv' : status === 'trialing' ? 'Testversion' : 'Inaktiv'}
                      </Badge>
                    </div>
                    
                    {currentPeriodEnd && isPremium && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Gültig bis</p>
                        <p className="font-medium">
                          {new Date(currentPeriodEnd).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                    {!isPremium ? (
                        <Button className="w-full" size="sm" onClick={handleUpgrade} disabled={checkoutLoading}>
                          {checkoutLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Premium aktivieren
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                          {portalLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Abo verwalten
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Features Card - matching landing page style */}
                <Card className="border-0 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                          <Crown className="w-5 h-5 text-warning" />
                        </div>
                        <h3 className="text-lg font-bold">Premium Features</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          'KI-Tutor für Erklärungen',
                          'Individuelle Zeitlimits pro Fach',
                          'Fächersichtbarkeit konfigurierbar',
                          'Themen-Schwerpunkte setzen',
                          'Erweiterte Lernanalyse',
                          'Bonus je Aufgabe anpassen',
                        ].map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Trial Info in Abo Tab */}
          {trialDaysLeft !== null && trialDaysLeft > 0 && !isPremium && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      🎁 Noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'} kostenlos testen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Nach Ablauf werden Premium-Features deaktiviert und Einstellungen zurückgesetzt.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleUpgrade} disabled={checkoutLoading} className="shrink-0">
                  {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                  Premium aktivieren
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-muted bg-card">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground">Kostenlos testen</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Premium-Features stehen Ihnen während einer 4-wöchigen kostenlosen Testphase zur Verfügung. 
                    Danach benötigen Sie ein aktives Abonnement.
                  </p>
                  <p className="text-xs text-muted-foreground/80 font-medium">
                    ✓ Monatlich kündbar · Keine Mindestlaufzeit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Lernanalyse */}
        <TabsContent value="analytics" className="space-y-4">
          {linkedChildren.length > 0 ? (
            <div className="space-y-4">
              {/* Kinderauswahl */}
              {linkedChildren.length > 1 && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Kind auswählen:</span>
                      <div className="flex flex-wrap gap-2">
                        {linkedChildren.map((child) => (
                          <Button
                            key={child.id}
                            variant={selectedChildId === child.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedChildId(child.id)}
                            className="flex items-center gap-2"
                          >
                            <GraduationCap className="h-4 w-4" />
                            {child.name || 'Unbenannt'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analyse für ausgewähltes Kind */}
              {selectedChildId && (() => {
                const selectedChild = linkedChildren.find(c => c.id === selectedChildId);
                if (!selectedChild) return null;
                return (
                  <ChildLearningAnalysis 
                    childId={selectedChild.id} 
                    childName={selectedChild.name || 'Unbenannt'}
                    childGrade={selectedChild.grade}
                  />
                );
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Keine Daten verfügbar</h3>
                <p className="text-sm text-muted-foreground">
                  Verknüpfen Sie zuerst Kinder, um deren Lernfortschritt zu sehen.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Konto-Einstellungen */}
        <TabsContent value="account" className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Ihr Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="profile-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ihr Name"
                    className="flex-1"
                  />
                  <Button
                    onClick={saveProfileName}
                    disabled={profileSaving || !profileName.trim()}
                    size="sm"
                  >
                    {profileSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Speichern"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Passwort ändern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                />
              </div>
              
              <Button 
                onClick={changePassword} 
                disabled={passwordChanging || !newPassword || !confirmPassword}
                className="w-full"
              >
                {passwordChanging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ändern...
                  </>
                ) : (
                  "Passwort ändern"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
