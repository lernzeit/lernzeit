import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFamilyLinking } from '@/hooks/useFamilyLinking';
import { useChildDaySummary } from '@/hooks/useChildDaySummary';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  RefreshCw, Users, Smartphone, Plus, Copy, Trash2, Key, User,
  GraduationCap, Settings, BarChart3, Loader2, Crown, Check,
  AlertTriangle, Clock, Sparkles, BookOpen, CheckCircle, Flame, ChevronDown
} from 'lucide-react';
import { ChildLearningAnalysis } from '@/components/ChildLearningAnalysis';
import { ParentScreenTimeRequestsDashboard } from '@/components/ParentScreenTimeRequestsDashboard';
import { ChildSettingsEditor } from '@/components/ChildSettingsEditor';
import { LearningPlanGenerator } from '@/components/LearningPlanGenerator';
import { AccountDeleteSection } from '@/components/AccountDeleteSection';

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
  const [openChildren, setOpenChildren] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const { isPremium, isTrialing, trialJustExpired, trialDaysLeft, status, currentPeriodEnd } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const {
    loading,
    linkedChildren,
    invitationCodes,
    loadFamilyData,
    generateInvitationCode,
    removeChildLink,
  } = useFamilyLinking();

  const { summaries, loading: summariesLoading } = useChildDaySummary(userId, linkedChildren);

  useEffect(() => {
    if (userId) {
      loadFamilyData(userId);
      loadProfileName();
    }
  }, [userId]);

  const toggleChild = (childId: string) => {
    setOpenChildren(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const handleUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast({ title: 'Fehler', description: 'Checkout konnte nicht gestartet werden.', variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast({ title: 'Fehler', description: 'Portal konnte nicht geöffnet werden.', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  const loadProfileName = async () => {
    try {
      const { data } = await supabase.from('profiles').select('name').eq('id', userId).single();
      if (data?.name) setProfileName(data.name);
    } catch {}
  };

  const handleRefresh = () => loadFamilyData(userId);

  const [consentChecked, setConsentChecked] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const checkEmailVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmailVerified(!!user?.email_confirmed_at);
  };

  useEffect(() => {
    checkEmailVerification();
  }, []);

  const handleGenerateCode = async () => {
    if (!emailVerified) {
      toast({ title: "E-Mail nicht bestätigt", description: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.", variant: "destructive" });
      return;
    }
    if (!consentChecked) {
      toast({ title: "Einwilligung erforderlich", description: "Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.", variant: "destructive" });
      return;
    }
    setNewCodeLoading(true);
    const consentTimestamp = new Date().toISOString();
    await generateInvitationCode(userId, consentTimestamp);
    setNewCodeLoading(false);
    setConsentChecked(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code kopiert!", description: "Der Einladungscode wurde in die Zwischenablage kopiert." });
  };

  const handleRemoveChild = async (childId: string) => {
    const success = await removeChildLink(userId, childId);
    if (success) loadFamilyData(userId);
  };

  const saveProfileName = async () => {
    if (!profileName.trim()) return;
    try {
      setProfileSaving(true);
      const { error } = await supabase.from('profiles').update({ name: profileName.trim() }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Profil aktualisiert", description: "Ihr Name wurde erfolgreich gespeichert." });
    } catch {
      toast({ title: "Fehler", description: "Name konnte nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Die Passwörter stimmen nicht überein.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Fehler", description: "Das Passwort muss mindestens 6 Zeichen lang sein.", variant: "destructive" });
      return;
    }
    try {
      setPasswordChanging(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Passwort geändert", description: "Ihr Passwort wurde erfolgreich aktualisiert." });
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast({ title: "Fehler", description: "Passwort konnte nicht geändert werden.", variant: "destructive" });
    } finally {
      setPasswordChanging(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Abgelaufen';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} Min`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
  };

  const activeCodes = invitationCodes.filter(code => !code.is_used && new Date(code.expires_at) > new Date());
  const pendingChildren = linkedChildren.filter((child) => (summaries.get(child.id)?.pendingRequests || 0) > 0);
  const totalPendingRequests = pendingChildren.reduce(
    (sum, child) => sum + (summaries.get(child.id)?.pendingRequests || 0),
    0,
  );
  const defaultTab = totalPendingRequests > 0 ? 'requests' : 'children';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eltern-Dashboard</h1>
          <p className="text-muted-foreground text-sm">Familie und Lernzeit verwalten</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {totalPendingRequests > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-card">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Neue Bildschirmzeit-Anfragen verfügbar</p>
              <p className="text-xs text-muted-foreground">
                {pendingChildren.map((child) => child.name || 'Kind').join(', ')} {pendingChildren.length === 1 ? 'hat' : 'haben'} {totalPendingRequests} offene {totalPendingRequests === 1 ? 'Anfrage' : 'Anfragen'} gestellt.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {totalPendingRequests} neu
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Trial Banner */}
      {trialDaysLeft !== null && trialDaysLeft > 0 && !isPremium && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">🎁 Testphase: noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'} kostenlos</p>
                <p className="text-xs text-muted-foreground">Sichern Sie sich jetzt Premium – monatlich kündbar.</p>
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
                  <p className="text-xs text-muted-foreground">Ihre kostenlose Testphase ist beendet.</p>
                </div>
              </div>
              <Button size="sm" onClick={handleUpgrade} disabled={checkoutLoading} className="shrink-0">
                {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                Jetzt upgraden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs - reduced to 4 */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Anfragen</span>
            {totalPendingRequests > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {totalPendingRequests}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="children" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Kinder</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-1.5">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Abo</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Konto</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Anfragen */}
        <TabsContent value="requests" className="space-y-4">
          <ParentScreenTimeRequestsDashboard userId={userId} />
        </TabsContent>

        {/* Tab: Kinder - kind-zentrisch mit Collapsibles */}
        <TabsContent value="children" className="space-y-4">
          {linkedChildren.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Noch keine Kinder verknüpft</p>
                <p className="text-xs text-muted-foreground mt-1">Erstelle unten einen Einladungscode und teile ihn mit deinem Kind.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedChildren.map((child) => {
                const summary = summaries.get(child.id);
                const isOpen = openChildren.has(child.id);
                const hasLearned = (summary?.questionsToday ?? 0) > 0;
                const hasPending = (summary?.pendingRequests ?? 0) > 0;
                const accuracy = summary && summary.questionsToday > 0
                  ? Math.round((summary.correctToday / summary.questionsToday) * 100) : 0;

                return (
                  <Collapsible key={child.id} open={isOpen} onOpenChange={() => toggleChild(child.id)}>
                    <Card className={`transition-colors ${
                      hasPending ? 'border-orange-400/50 bg-orange-50/30 dark:bg-orange-950/10'
                      : hasLearned ? 'border-green-400/50 bg-green-50/30 dark:bg-green-950/10'
                      : 'border-muted'
                    }`}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-4 hover:bg-muted/30 transition-colors rounded-t-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <span className="font-semibold text-sm">{child.name || 'Kind'}</span>
                                <span className="text-xs text-muted-foreground ml-2">Klasse {child.grade}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {summary?.streak && summary.streak > 0 && (
                                <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                  <Flame className="h-3 w-3" />
                                  {summary.streak}
                                </span>
                              )}
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          {summariesLoading ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Laden...
                            </div>
                          ) : summary ? (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {summary.questionsToday} Fragen
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {accuracy}% richtig
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {summary.minutesEarned} Min verdient
                              </span>
                              {hasPending && (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  {summary.pendingRequests} offene {summary.pendingRequests === 1 ? 'Anfrage' : 'Anfragen'}
                                </span>
                              )}
                              {!hasLearned && (
                                <span className="italic">Heute noch nicht gelernt</span>
                              )}
                            </div>
                          ) : null}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-6 border-t pt-4">
                          <ChildSettingsEditor 
                            childId={child.id}
                            childName={child.name || 'Kind'}
                            parentId={userId}
                            currentGrade={child.grade}
                            onSettingsChanged={() => loadFamilyData(userId)}
                          />
                          <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                              <Sparkles className="h-4 w-4 text-primary" />
                              KI-Lernplan
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary gap-1 font-normal">
                                <Crown className="h-2.5 w-2.5" />
                                Premium
                              </Badge>
                            </h3>
                            <LearningPlanGenerator 
                              userId={userId} 
                              linkedChildren={[child]}
                              fixedChildId={child.id}
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                              <BarChart3 className="h-4 w-4 text-primary" />
                              Lernanalyse
                            </h3>
                            <ChildLearningAnalysis 
                              childId={child.id} 
                              childName={child.name || 'Kind'}
                              childGrade={child.grade}
                            />
                          </div>
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveChild(child.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Kind entfernen
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}

          {/* Kind einladen – unter den verknüpften Kindern */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Weiteres Kind einladen
              </CardTitle>
              <CardDescription className="text-xs">
                Erstelle einen Einladungscode, den dein Kind in der App eingeben kann.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {emailVerified === false && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Bitte bestätige zuerst deine E-Mail-Adresse.
                </p>
              )}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent-children-tab"
                  checked={consentChecked}
                  onCheckedChange={(v) => setConsentChecked(!!v)}
                  disabled={emailVerified === false}
                />
                <label htmlFor="consent-children-tab" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Ich stimme den{' '}
                  <Link to="/nutzungsbedingungen" className="text-primary underline hover:text-primary/80">Nutzungsbedingungen</Link>
                  {' '}zu und erteile als Erziehungsberechtigte/r die Einwilligung zur Datenverarbeitung für mein Kind gemäß Art. 8 DSGVO (
                  <Link to="/datenschutz" className="text-primary underline hover:text-primary/80">Datenschutzerklärung</Link>).
                </label>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateCode}
                disabled={newCodeLoading || !consentChecked || emailVerified === false}
              >
                {newCodeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Code erstellen
              </Button>
              {activeCodes.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground">Aktive Codes:</p>
                  {activeCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                      <div>
                        <code className="font-mono font-bold text-sm text-primary">{code.code}</code>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatTimeRemaining(code.expires_at)})
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(code.code)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Abo */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Ihr Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className={`border-2 ${isPremium ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{isPremium ? 'LernZeit Premium' : 'LernZeit Kostenlos'}</CardTitle>
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
                          {new Date(currentPeriodEnd).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    <div className="pt-2">
                      {!isPremium ? (
                        <Button className="w-full" size="sm" onClick={handleUpgrade} disabled={checkoutLoading}>
                          {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                          Premium aktivieren
                        </Button>
                      ) : isTrialing ? (
                        <Button className="w-full" size="sm" onClick={handleUpgrade} disabled={checkoutLoading}>
                          {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Jetzt Abo abschließen
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                          {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Abo verwalten
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

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
                  </p>
                  <p className="text-xs text-muted-foreground/80 font-medium">
                    ✓ Monatlich kündbar · Keine Mindestlaufzeit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Konto (Profile + Password + Codes) */}
        <TabsContent value="account" className="space-y-6">
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
                  <Button onClick={saveProfileName} disabled={profileSaving || !profileName.trim()} size="sm">
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Passwort wiederholen" />
              </div>
              <Button onClick={changePassword} disabled={passwordChanging || !newPassword || !confirmPassword} className="w-full">
                {passwordChanging ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ändern...</>) : "Passwort ändern"}
              </Button>
            </CardContent>
          </Card>

          <AccountDeleteSection
            isPremium={isPremium}
            onDeleted={() => window.location.href = '/'}
          />

        </TabsContent>
      </Tabs>
    </div>
  );
}
