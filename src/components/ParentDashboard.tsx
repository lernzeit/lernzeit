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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AboKuendigen } from '@/components/parent/AboKuendigen';
import { useFamilyLinking } from '@/hooks/useFamilyLinking';
import { useChildDaySummary } from '@/hooks/useChildDaySummary';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { usePremium } from '@/hooks/usePremium';
import { getActivePlatform } from '@/services/revenueCat';
import { Capacitor } from '@capacitor/core';
import {
  STRIPE_MONTHLY_PRICE_ID,
  STRIPE_YEARLY_PRICE_ID,
  STRIPE_MONTHLY_PRICE_LABEL,
  STRIPE_YEARLY_PRICE_LABEL,
} from '@/config/pricing';
import { track, trackFireAndForget } from '@/lib/analytics';
import { 
  RefreshCw, Users, Smartphone, Plus, Copy, Trash2, Key, User,
  GraduationCap, Settings, BarChart3, Loader2, Crown, Check,
  AlertTriangle, Clock, Sparkles, BookOpen, CheckCircle, Sprout, ChevronDown, ChevronLeft, ChevronRight, LogOut, Download, Apple, Gift, Share2
} from 'lucide-react';
import { ChildLearningAnalysis } from '@/components/ChildLearningAnalysis';
import { ParentScreenTimeRequestsDashboard } from '@/components/ParentScreenTimeRequestsDashboard';
import { ChildSettingsEditor } from '@/components/ChildSettingsEditor';
import { LearningPlanGenerator } from '@/components/LearningPlanGenerator';
import { AccountDeleteSection } from '@/components/AccountDeleteSection';
import { ChildPasswordReset } from '@/components/ChildPasswordReset';
import { NotificationSettings } from '@/components/NotificationSettings';
import { parentalControlsService } from '@/services/parentalControlsService';
import { useChildPlatforms } from '@/hooks/useChildPlatforms';
import { ChildParentalControlButton } from '@/components/ChildParentalControlButton';
import { ParentFeedbackDialog } from '@/components/parent/ParentFeedbackDialog';
import { RatingPromptDialog } from '@/components/parent/RatingPromptDialog';
import { ReferralCard } from '@/components/parent/ReferralCard';
import { RevenueCatPaywall } from '@/components/RevenueCatPaywall';
import { useRatingPrompt } from '@/hooks/useRatingPrompt';
import { MessageSquareHeart } from 'lucide-react';
import { useOfferings } from '@/hooks/useOfferings';
import { openStripeUrl } from '@/utils/checkoutRedirect';
import { OnboardingNextStepCard } from '@/components/parent/OnboardingNextStepCard';
import { AbwanderungNachfrage } from '@/components/parent/AbwanderungUmfrage';
import { shareInviteLink, buildInviteLink } from '@/lib/inviteLink';

// Farbiger Drachen (Kite) im Stil des Google Family Link Logos.
// Vier Quadranten in den Google-Markenfarben + dunkle Schnur.
const KiteIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="none"
    aria-hidden="true"
  >
    {/* oben: rot */}
    <path d="M12 2 L20 10 L12 10 Z" fill="#EA4335" />
    {/* rechts: gelb */}
    <path d="M20 10 L12 18 L12 10 Z" fill="#FBBC04" />
    {/* unten: grün */}
    <path d="M12 18 L4 10 L12 10 Z" fill="#34A853" />
    {/* links: blau */}
    <path d="M4 10 L12 2 L12 10 Z" fill="#4285F4" />
    {/* Schnur */}
    <path
      d="M12 18 L10 22 M12 18 L14 22"
      stroke="#1F1F1F"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

interface ParentDashboardProps {
  userId: string;
  onSignOut?: () => void;
}

interface LinkedChild {
  id: string;
  name: string | null;
  grade: number;
  username?: string | null;
}

export function ParentDashboard({ userId, onSignOut }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>('requests');
  const [accountOpen, setAccountOpen] = useState(false);
  const [familyLoadedFor, setFamilyLoadedFor] = useState<string | null>(null);
  const [entryDeferred, setEntryDeferred] = useState({ userId: '', until: 0 });
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const inviteRef = React.useRef<HTMLDivElement>(null);
  const [profileName, setProfileName] = useState('');
  // Fuer die Kopfzeile: der gespeicherte Name, nicht das Eingabefeld.
  const [anzeigeName, setAnzeigeName] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [referralBannerDismissed, setReferralBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('referralBannerDismissed') === '1';
  });

  // Deep-link from push notification: ?tab=referral focuses the Verschenken tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'referral') {
      setActiveTab('referral');
      setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);
  const [isFoundingFamily, setIsFoundingFamily] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [newCodeLoading, setNewCodeLoading] = useState(false);
  const [openChildren, setOpenChildren] = useState<Set<string>>(new Set());
  const [kindDetail, setKindDetail] = useState<string | null>(null);
  const [kindBereich, setKindBereich] = useState<'uebersicht' | 'regeln' | 'lernplan' | 'konto'>('uebersicht');
  const [requestsRefreshTrigger, setRequestsRefreshTrigger] = useState(0);
  const [familyLinkInstallOpen, setFamilyLinkInstallOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const { shouldShow: ratingShouldShow, dismiss: ratingDismiss } = useRatingPrompt(userId, 'parent');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserEmail(data.user?.email ?? undefined);
    });
    return () => {
      active = false;
    };
  }, []);
  
  const { toast } = useToast();
  const { platforms: childPlatforms, setChildPlatform } = useChildPlatforms();

  const handleInstallFamilyLink = async () => {
    try {
      await parentalControlsService.openInstallParentalControlApp();
      setFamilyLinkInstallOpen(false);
    } catch {
      toast({
        title: 'Fehler',
        description: 'Play Store konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    }
  };

  const sub = useSubscription();
  const { source: premiumSource, isPremium: rcIsPremium } = usePremium();
  // Auf iOS/Android ist RevenueCat die Wahrheit über den Premium-Status.
  // Stripe-Daten (Trial, Period-End) gelten dort nicht.
  const rcActive = premiumSource === 'revenuecat' && rcIsPremium;
  const isPremium = rcActive || sub.isPremium;
  const isTrialing = rcActive ? false : sub.isTrialing;
  const trialJustExpired = rcActive ? false : sub.trialJustExpired;
  const trialDaysLeft = rcActive ? null : sub.trialDaysLeft;
  const status = rcActive ? 'active' as const : sub.status;
  const currentPeriodEnd = rcActive ? null : sub.currentPeriodEnd;
  const cancelAt = rcActive ? null : sub.cancelAt;
  const { monthly: rcMonthly, annual: rcAnnual, loading: offeringsLoading, error: offeringsError } = useOfferings();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Echtes (bezahltes) Premium – Trial zählt nicht.
  const isPaidPremium = isPremium && !isTrialing;

  const [referralInfoOpen, setReferralInfoOpen] = useState(false);
  const [referralIntroOpen, setReferralIntroOpen] = useState(false);
  const introStorageKey = React.useMemo(
    () => `premiumReferralIntroShown:${userId}`,
    [userId]
  );

  // Einmalig nach Abschluss der Premium-Mitgliedschaft das Intro-Pop-up zeigen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPaidPremium) return;
    try {
      if (window.localStorage.getItem(introStorageKey) === '1') return;
      setReferralIntroOpen(true);
    } catch {
      setReferralIntroOpen(true);
    }
  }, [isPaidPremium, introStorageKey]);

  const dismissReferralIntro = () => {
    setReferralIntroOpen(false);
    try { window.localStorage.setItem(introStorageKey, '1'); } catch {}
  };

  // Falls Tab 'referral' aktiv ist, aber kein Paid-Premium besteht → zurück auf Abo.
  useEffect(() => {
    if (activeTab === 'referral' && !isPaidPremium) {
      setActiveTab('subscription');
    }
  }, [activeTab, isPaidPremium]);

  const {
    loading,
    linkedChildren,
    invitationCodes,
    loadFamilyData,
    generateInvitationCode,
    removeChildLink,
    revokeInvitationCode,
  } = useFamilyLinking();

  const { summaries, loading: summariesLoading } = useChildDaySummary(userId, linkedChildren);
  const isIOSNativeApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    setFamilyLoadedFor(null);
    // Die Pause gilt nur für dieses Elternkonto; gesperrter Speicher ist unkritisch.
    let until = 0;
    try {
      const saved = Number(window.localStorage.getItem(`parentEntryDeferred:${userId}`));
      if (Number.isFinite(saved) && saved > Date.now()) until = saved;
    } catch {}
    setEntryDeferred({ userId, until });
    if (userId) {
      loadFamilyData(userId).then(() => {
        if (!cancelled) setFamilyLoadedFor(userId);
      });
      loadProfileName();
    }
    return () => { cancelled = true; };
  }, [userId, loadFamilyData]);

  useEffect(() => {
    if (entryDeferred.userId !== userId || entryDeferred.until <= Date.now()) return;
    // Auch bei geöffnetem Dashboard läuft die Pause nach 24 Stunden ab.
    const timer = window.setTimeout(() => {
      setEntryDeferred({ userId, until: 0 });
    }, entryDeferred.until - Date.now());
    return () => window.clearTimeout(timer);
  }, [entryDeferred, userId]);

  const deferParentEntry = () => {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    setEntryDeferred({ userId, until });
    try {
      window.localStorage.setItem(`parentEntryDeferred:${userId}`, String(until));
    } catch {}
  };

  const toggleChild = (childId: string) => {
    setOpenChildren(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly' = 'monthly') => {
    // Abgewartet: Am Ende dieses Weges verlaesst der Browser die Seite in
    // Richtung Stripe. Dieses eine Ereignis ist der einzige Hinweis darauf,
    // dass jemand ueberhaupt bezahlen WOLLTE — es darf nicht unterwegs
    // verloren gehen.
    await track('checkout_started', { plan, channel: isNativeApp ? 'revenuecat' : 'stripe' });
    // Never route native app users to Stripe checkout – always use the
    // in-app RevenueCat paywall (Apple + Google policy).
    if (isNativeApp) {
      setPaywallOpen(true);
      return;
    }

    try {
      setCheckoutLoading(true);
      const priceId = plan === 'yearly' ? STRIPE_YEARLY_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
      if (!priceId || !priceId.startsWith('price_')) {
        throw new Error('Jährliche Price-ID noch nicht konfiguriert.');
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) openStripeUrl(data.url);
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Checkout konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (isIOSNativeApp) {
      const url = 'itms-apps://apps.apple.com/account/subscriptions';
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher');
        await AppLauncher.openUrl({ url });
      } catch {
        window.location.href = url;
      }
      return;
    }

    // If premium was purchased through RevenueCat / an app store (iOS or
    // Android), Apple/Google require that we deep-link to the OS subscription
    // settings instead of opening a web billing portal.
    const rcPlatform = getActivePlatform();
    const isAppStoreSub =
      premiumSource === 'revenuecat' &&
      (rcPlatform === 'ios' || rcPlatform === 'android');

    if (isAppStoreSub) {
      const url =
        rcPlatform === 'ios'
          ? 'itms-apps://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
      try {
        if (Capacitor.isNativePlatform()) {
          const { Browser } = await import('@capacitor/browser').catch(() => ({ Browser: null } as any));
          if (Browser?.open) {
            await Browser.open({ url });
          } else {
            window.location.href = url;
          }
        } else {
          window.open(url, '_blank');
        }
      } catch {
        window.location.href = url;
      }
      return;
    }

    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) openStripeUrl(data.url);
    } catch {
      toast({ title: 'Fehler', description: 'Portal konnte nicht geöffnet werden.', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  const loadProfileName = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, is_founding_family')
        .eq('id', userId)
        .single();
      if (data?.name) { setProfileName(data.name); setAnzeigeName(data.name); }
      setIsFoundingFamily(!!data?.is_founding_family);
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
      toast({ title: "E-Mail nicht bestätigt", description: "Bitte bestätige zuerst deine E-Mail-Adresse.", variant: "destructive" });
      return;
    }
    if (!consentChecked) {
      toast({ title: "Einwilligung erforderlich", description: "Bitte bestätige die Einwilligung zur Datenverarbeitung.", variant: "destructive" });
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

  const handleShareInvite = async (code: string) => {
    const { method } = await shareInviteLink(code);
    if (method === 'clipboard') {
      toast({ title: "Link kopiert!", description: buildInviteLink(code) });
    } else if (method === 'failed') {
      toast({ title: "Teilen nicht möglich", description: "Bitte den Code manuell weitergeben.", variant: "destructive" });
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    await revokeInvitationCode(userId, codeId);
  };

  const goToInviteSection = () => {
    setActiveTab('children');
    setTimeout(() => inviteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
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
      setAnzeigeName(profileName.trim());
      toast({ title: "Profil aktualisiert", description: "Dein Name wurde gespeichert." });
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
      toast({ title: "Passwort geändert", description: "Dein Passwort wurde erfolgreich aktualisiert." });
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
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 48) return `${diffH}h ${diffMin % 60}min`;
    return `noch ${Math.floor(diffH / 24)} Tage`;
  };

  const activeCodes = invitationCodes.filter(code => !code.is_used && new Date(code.expires_at) > new Date());
  const pendingChildren = linkedChildren.filter((child) => (summaries.get(child.id)?.pendingRequests || 0) > 0);
  const totalPendingRequests = pendingChildren.reduce(
    (sum, child) => sum + (summaries.get(child.id)?.pendingRequests || 0),
    0,
  );
  useEffect(() => {
    if (totalPendingRequests > 0) {
      setActiveTab('requests');
    }
  }, [totalPendingRequests]);

  // Derselbe Einladungsablauf wird im Einstieg und im Kinder-Reiter verwendet.
  const invitationSection = (
          <Card ref={inviteRef}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                {linkedChildren.length === 0 ? 'Kind einladen' : 'Weiteres Kind einladen'}
              </CardTitle>
              <CardDescription className="text-xs">
                Erstelle einen Einladungslink, den dein Kind auf dem eigenen Handy öffnet. Der Link ist 7 Tage gültig – der Code funktioniert auch manuell.
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
                  <p className="text-xs font-medium text-muted-foreground">Aktive Einladungen:</p>
                  {activeCodes.map((code) => (
                    <div key={code.id} className="bg-muted/50 rounded-md px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <code className="font-mono font-bold text-sm text-primary">{code.code}</code>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({formatTimeRemaining(code.expires_at)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Code kopieren" onClick={() => copyToClipboard(code.code)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Code zurückziehen" onClick={() => handleRevokeCode(code.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground break-all">{buildInviteLink(code.code)}</p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleShareInvite(code.code)}>
                        <Share2 className="h-3.5 w-3.5 mr-2" />
                        Link teilen
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
  );
  const familyReady = familyLoadedFor === userId && !loading;
  const showFocusedEntry = familyReady && linkedChildren.length === 0
    && !(entryDeferred.userId === userId && entryDeferred.until > Date.now());

  const reiterTitel: Record<string, string> = { requests: 'Heute', children: 'Kinder', subscription: 'Abo', konto: 'Konto', referral: 'Verschenken' };
  const heuteText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const kindImDetail = activeTab === 'children' ? linkedChildren.find((c) => c.id === kindDetail) : undefined;
  const reiterWechseln = (wert: string) => {
    setActiveTab(wert);
    setKindDetail(null);
    window.scrollTo({ top: 0 });
  };
  const navKlasse =
    'flex h-auto flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-bold text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

  // App-Redesign (Etappe 4): Navigation unten, "Heute" zuerst, Kind-Details in
  // vier Bereichen. Begruessung, Rollen-Abzeichen und Banner oben entfallen;
  // Ideen-Forum, Empfehlung und Konto stehen unter "Konto".
  const stunde = new Date().getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 17 ? 'Hallo' : 'Guten Abend';
  const vorname = anzeigeName.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-28">
      {/* Kopfzeile mit Logo und Konto (Wunsch 04.10.2026: in der Eltern-App
          fehlte jeder Hinweis, wo man ist und wer angemeldet ist). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary" aria-hidden="true">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2.25} />
          </span>
          <span className="text-[1.1875rem] font-extrabold tracking-[-0.02em] text-tinte">LernZeit</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Eltern</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('konto')}
          aria-label="Konto"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary ring-1 ring-inset ring-primary/15 transition-colors hover:bg-primary/15"
        >
          {vorname ? vorname[0].toUpperCase() : <User className="h-5 w-5" />}
        </button>
      </div>

      {!familyReady ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Familiendaten werden geladen …</span>
        </div>
      ) : showFocusedEntry ? (
        <section aria-labelledby="parent-entry-title" className="mx-auto w-full max-w-xl min-w-0 space-y-6 pt-2">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => { deferParentEntry(); setActiveTab('konto'); }}>
              <Settings className="h-4 w-4" />
              Konto
            </Button>
          </div>
          <div className="space-y-4">
            <h2 id="parent-entry-title" className="text-2xl font-bold break-words">
              Lege jetzt das Profil deines Kindes an
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Dein Kind meldet sich auf seinem eigenen Gerät an.</li>
              <li>Es löst Aufgaben und sammelt Bildschirmzeit.</li>
              <li>Es fragt Bildschirmzeit an, du gibst sie frei.</li>
            </ul>
          </div>
          {invitationSection}
          <div className="text-center">
            <Button variant="link" className="text-muted-foreground" onClick={deferParentEntry}>
              Später
            </Button>
          </div>
        </section>
      ) : (
      <Tabs ref={tabsRef} value={activeTab} onValueChange={reiterWechseln} className="space-y-6">
        {/* Navigation unten am Daumen */}
        <TabsList className="fixed inset-x-0 bottom-0 z-40 grid h-auto w-full grid-cols-4 rounded-none border-t border-karo bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <TabsTrigger value="requests" className={navKlasse}>
            <span className="relative">
              <Smartphone className="h-5 w-5" />
              {totalPendingRequests > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rotstift px-1 text-[10px] font-bold text-white">
                  {totalPendingRequests}
                </span>
              )}
            </span>
            Heute
          </TabsTrigger>
          <TabsTrigger value="children" className={navKlasse}>
            <Users className="h-5 w-5" />
            Kinder
          </TabsTrigger>
          <TabsTrigger value="subscription" className={navKlasse}>
            <Crown className="h-5 w-5" />
            Abo
          </TabsTrigger>
          <TabsTrigger value="konto" className={`${navKlasse} ${activeTab === 'referral' ? 'text-primary' : ''}`}>
            <User className="h-5 w-5" />
            Konto
          </TabsTrigger>
        </TabsList>

        {!kindImDetail && (
          <header className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {activeTab === 'requests' && (
                <p className="font-hand text-lg text-gruen-text">{gruss}{vorname ? `, ${vorname}` : ''}!</p>
              )}
              <h1 className="text-[1.75rem] font-extrabold leading-tight">{reiterTitel[activeTab] ?? 'Heute'}</h1>
              {activeTab === 'requests' && <p className="text-sm text-muted-foreground">{heuteText}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} aria-label="Aktualisieren">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </header>
        )}

        {/* Reiter: Heute */}
        <TabsContent value="requests" className="space-y-6">
          <OnboardingNextStepCard
            parentId={userId}
            linkedChildren={linkedChildren}
            activeCodes={activeCodes}
            onCreateCode={goToInviteSection}
            onShowCode={goToInviteSection}
          />

          {/* Warum stockt es? Nur wenn etwas stockt (siehe AbwanderungUmfrage.tsx) */}
          <AbwanderungNachfrage
            parentId={userId}
            kindIds={linkedChildren.map((c) => c.id)}
            bereit={!sub.loading && !loading}
            testphaseVorbei={!isPremium && !isTrialing && !!sub.trialEnd && new Date(sub.trialEnd) < new Date()}
          />


          {trialDaysLeft !== null && trialDaysLeft > 0 && !isPremium && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/5 px-4 py-3">
              <p className="text-sm text-tinte">
                <b>Testphase:</b> noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'} alle Funktionen
              </p>
              <Button size="sm" onClick={() => handleUpgrade('monthly')} disabled={checkoutLoading} className="shrink-0">
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Premium
              </Button>
            </div>
          )}

          <section aria-labelledby="anfragen-titel" className="space-y-3">
            <h2 id="anfragen-titel" className="flex items-center gap-2 text-base font-extrabold">
              Anfragen
              {totalPendingRequests > 0 && (
                <span className="tabular rounded-full bg-primary px-2 text-xs font-bold text-white">{totalPendingRequests}</span>
              )}
            </h2>
            <ParentScreenTimeRequestsDashboard userId={userId} refreshTrigger={requestsRefreshTrigger} />
          </section>

          {linkedChildren.length > 0 && (
            <section aria-labelledby="kinder-heute" className="space-y-3">
              <h2 id="kinder-heute" className="text-base font-extrabold">Heute gelernt</h2>
              <ul className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">
                {linkedChildren.map((child) => {
                  const z = summaries.get(child.id);
                  return (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => { reiterWechseln('children'); setKindDetail(child.id); setKindBereich('uebersicht'); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary" aria-hidden="true">
                          {(child.name || 'K').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-tinte">{child.name || 'Kind'}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {summariesLoading || !z
                              ? 'Wird geladen …'
                              : z.questionsToday > 0
                                ? `${z.questionsToday} Aufgaben, ${z.correctToday} richtig`
                                : 'Heute noch nicht gelernt'}
                          </span>
                        </span>
                        {z && z.minutesEarned > 0 && (
                          <span className="tabular shrink-0 text-sm font-extrabold text-gruen-text">{z.minutesEarned} Min.</span>
                        )}
                        {z && z.streak > 0 && (
                          <span className="tabular inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-gruen-text" aria-label={`${z.streak} Tage in Folge`}>
                            <Sprout className="h-3.5 w-3.5" />{z.streak}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </TabsContent>

        {/* Reiter: Kinder (Liste oder Details eines Kindes) */}
        <TabsContent value="children" className="space-y-6">
          {kindImDetail ? (() => {
            const child = kindImDetail;
            const z = summaries.get(child.id);
            const bereiche: { id: typeof kindBereich; text: string }[] = [
              { id: 'uebersicht', text: 'Übersicht' },
              { id: 'regeln', text: 'Regeln' },
              { id: 'lernplan', text: 'Lernplan' },
              { id: 'konto', text: 'Konto' },
            ];
            return (
              <div className="space-y-5 pt-1">
                <button type="button" onClick={() => setKindDetail(null)} className="-ml-1 inline-flex h-9 items-center gap-0.5 text-sm font-bold text-primary">
                  <ChevronLeft className="h-4 w-4" />
                  Kinder
                </button>
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-extrabold text-primary" aria-hidden="true">
                    {(child.name || 'K').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-extrabold">{child.name || 'Kind'}</h1>
                    <p className="text-sm text-muted-foreground">Klasse {child.grade}</p>
                  </div>
                </div>
                <div role="tablist" aria-label="Bereiche" className="grid grid-cols-4 rounded-full bg-muted p-1">
                  {bereiche.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="tab"
                      aria-selected={kindBereich === b.id}
                      onClick={() => setKindBereich(b.id)}
                      className={`rounded-full py-2 text-xs font-bold transition-colors sm:text-sm ${
                        kindBereich === b.id ? 'bg-card text-tinte shadow-[0_1px_3px_hsl(var(--tinte)/0.15)]' : 'text-muted-foreground'
                      }`}
                    >
                      {b.text}
                    </button>
                  ))}
                </div>

                {kindBereich === 'uebersicht' && (
                  <div className="space-y-5">
                    <ul className="divide-y divide-karo rounded-[20px] bg-card px-4 ring-1 ring-inset ring-karo text-sm">
                      <li className="flex justify-between py-3"><span>Heute verdient</span><b className="tabular text-tinte">{z?.minutesEarned ?? 0} Min.</b></li>
                      <li className="flex justify-between py-3"><span>Aufgaben heute</span><b className="tabular text-tinte">{z?.questionsToday ?? 0}, davon {z?.correctToday ?? 0} richtig</b></li>
                      <li className="flex justify-between py-3"><span>Lernpflanze</span><b className="tabular text-tinte">{z?.streak ?? 0} {(z?.streak ?? 0) === 1 ? 'Tag' : 'Tage'} in Folge</b></li>
                    </ul>
                    <ChildLearningAnalysis childId={child.id} childName={child.name || 'Kind'} childGrade={child.grade} />
                  </div>
                )}

                {kindBereich === 'regeln' && (
                  <div className="space-y-6">
                    <section>
                      <h3 className="mb-2 px-1 text-sm font-extrabold">Bildschirmzeit freigeben</h3>
                      <ChildParentalControlButton
                        childName={child.name || 'Kind'}
                        platform={childPlatforms[child.id] ?? null}
                        onPlatformSelected={(pl) => setChildPlatform(child.id, pl)}
                      />
                    </section>
                    <ChildSettingsEditor
                      childId={child.id}
                      childName={child.name || 'Kind'}
                      parentId={userId}
                      currentGrade={child.grade}
                      onSettingsChanged={() => loadFamilyData(userId)}
                    />
                  </div>
                )}

                {kindBereich === 'lernplan' && (
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 px-1 text-sm font-extrabold">
                      KI-Lernplan für eine Klassenarbeit
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-tinte">
                        <Crown className="h-2.5 w-2.5 text-warning" />
                        Premium
                      </span>
                    </h3>
                    <LearningPlanGenerator userId={userId} linkedChildren={[child]} fixedChildId={child.id} />
                  </section>
                )}

                {kindBereich === 'konto' && (
                  <div className="space-y-5">
                    {child.username && <ChildPasswordReset childId={child.id} childName={child.name || 'Kind'} />}
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveChild(child.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {child.name || 'Kind'} entfernen
                    </Button>
                  </div>
                )}
              </div>
            );
          })() : (
            <>
              {linkedChildren.length === 0 ? (
                <div className="heft-karo rounded-[24px] bg-card px-5 py-8 text-center ring-1 ring-inset ring-karo">
                  <p className="text-lg font-extrabold text-tinte">Noch kein Kind verbunden</p>
                  <p className="mt-1 text-sm text-muted-foreground">Erstelle unten einen Einladungscode und schick ihn deinem Kind.</p>
                </div>
              ) : (
                <ul className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">
                  {linkedChildren.map((child) => {
                    const z = summaries.get(child.id);
                    const offen = z?.pendingRequests ?? 0;
                    return (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => { setKindDetail(child.id); setKindBereich('uebersicht'); window.scrollTo({ top: 0 }); }}
                          className="flex w-full items-center gap-3 px-4 py-4 text-left"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-extrabold text-primary" aria-hidden="true">
                            {(child.name || 'K').slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-tinte">{child.name || 'Kind'}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              Klasse {child.grade}
                              {z ? `, heute ${z.minutesEarned} Min. verdient` : ''}
                            </span>
                          </span>
                          {offen > 0 && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                              {offen} {offen === 1 ? 'Anfrage' : 'Anfragen'}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {invitationSection}
            </>
          )}
        </TabsContent>

        {/* Tab: Abo */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Dein Plan
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
                      {/* Ohne Premium grau statt `secondary`: Das ist in diesem
                          Projekt ein kraeftiges Gruen, und „Inaktiv" in Gruen
                          liest sich wie „alles in Ordnung". */}
                      <Badge
                        variant={isPremium ? 'default' : 'outline'}
                        className={isPremium ? undefined : 'bg-muted text-muted-foreground'}
                      >
                        {/* Eine Kuendigung zum Laufzeitende laesst den
                            Stripe-Status auf 'active' — erkennbar nur an cancelAt. */}
                        {isPremium && cancelAt ? 'Gekündigt' : status === 'active' ? 'Aktiv' : status === 'trialing' ? 'Testversion' : 'Inaktiv'}
                      </Badge>
                    </div>
                    {isPremium && (cancelAt || (currentPeriodEnd && !isTrialing)) && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {cancelAt ? 'Premium endet am' : 'Verlängert sich am'}
                        </p>
                        <p className="font-medium">
                          {new Date((cancelAt ?? currentPeriodEnd)!).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    <div className="pt-2 space-y-3">
                      {!isPremium || isTrialing ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                            <button
                              type="button"
                              onClick={() => setSelectedBillingCycle('monthly')}
                              className={`text-xs font-medium py-1.5 rounded-md transition-colors ${
                                selectedBillingCycle === 'monthly'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Monatlich
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedBillingCycle('yearly')}
                              className={`text-xs font-medium py-1.5 rounded-md transition-colors ${
                                selectedBillingCycle === 'yearly'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Jährlich
                            </button>
                          </div>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => handleUpgrade(selectedBillingCycle)}
                            disabled={checkoutLoading}
                          >
                            {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            {!isPremium ? 'Premium aktivieren' : 'Jetzt Abo abschließen'}
                          </Button>
                          <p className="text-xs text-center text-muted-foreground min-h-[1rem]">
                            {/* Der Preis muss aus derselben Quelle stammen wie
                                die Belastung: nativ RevenueCat (Store-Preis,
                                inkl. Landeswaehrung), im Web Stripe. */}
                            {!isNativeApp ? (
                              selectedBillingCycle === 'monthly'
                                ? `${STRIPE_MONTHLY_PRICE_LABEL} / Monat`
                                : `${STRIPE_YEARLY_PRICE_LABEL} / Jahr`
                            ) : offeringsLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Preis wird geladen …
                              </span>
                            ) : selectedBillingCycle === 'monthly' ? (
                              rcMonthly?.priceString
                                ? `${rcMonthly.priceString} / Monat`
                                : (offeringsError ?? 'Preis derzeit nicht verfügbar')
                            ) : (
                              rcAnnual?.priceString
                                ? `${rcAnnual.priceString} / Jahr`
                                : (offeringsError ?? 'Preis derzeit nicht verfügbar')
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" className="w-full" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                            {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {!isNativeApp && premiumSource !== 'revenuecat' ? 'Zahlungsdaten und Rechnungen' : 'Abo verwalten'}
                          </Button>
                          {/* Web-Abo: Kuendigen ueber unsere Funktion statt im Stripe-
                              Portal (Jahresabo ab dem 2. Jahr: ein Monat Frist). */}
                          {!isNativeApp && premiumSource !== 'revenuecat' && !cancelAt && <AboKuendigen />}
                        </>
                      )}
                      {!isNativeApp && (
                        <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <Link to="/nutzungsbedingungen" className="underline underline-offset-2 hover:text-foreground">Nutzungsbedingungen</Link>
                          <Link to="/widerruf" className="underline underline-offset-2 hover:text-foreground">Widerrufsbelehrung</Link>
                          <Link to="/widerruf#widerrufen" className="underline underline-offset-2 hover:text-foreground">Vertrag widerrufen</Link>
                          <Link to="/kuendigen" className="underline underline-offset-2 hover:text-foreground">Verträge hier kündigen</Link>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-muted p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                          <Crown className="w-5 h-5 text-warning" />
                        </div>
                        <h3 className="text-lg font-extrabold">Das ist in Premium enthalten</h3>
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

          {!isPremium && (
            <Card className="border-muted bg-card">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">Kostenlos testen</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Premium-Funktionen stehen dir während einer 4-wöchigen kostenlosen Testphase zur Verfügung.
                    </p>
                    <p className="text-xs text-muted-foreground/80 font-medium">
                      Monatlich kündbar, keine Mindestlaufzeit
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reiter: Verschenken – nur fuer zahlende Premium-Mitglieder, erreichbar ueber Konto */}
        {isPaidPremium && (
          <TabsContent value="referral" className="space-y-4">
            <button type="button" onClick={() => reiterWechseln('konto')} className="-ml-1 inline-flex h-9 items-center gap-0.5 text-sm font-bold text-primary">
              <ChevronLeft className="h-4 w-4" />
              Konto
            </button>
            <ReferralCard userId={userId} />
          </TabsContent>
        )}

        {/* Reiter: Konto (frueher Dialog in der Kopfzeile) */}
        <TabsContent value="konto" className="space-y-6">
          {isFoundingFamily && (
            <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">LernZeit-Familie der ersten Stunde</p>
          )}
          <ul className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">
            <li>
              <button
                type="button"
                onClick={() => (isPaidPremium ? reiterWechseln('referral') : setReferralInfoOpen(true))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <Gift className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-tinte">Premium verschenken</span>
                  <span className="block text-xs text-muted-foreground">
                    {isPaidPremium ? 'Freunde einladen, pro aktivem Kind 1 Monat Premium geschenkt' : 'Für Premium-Mitglieder'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
            <li>
              <Link to="/ideen" className="flex w-full items-center gap-3 px-4 py-3">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-tinte">Ideen-Forum</span>
                  <span className="block text-xs text-muted-foreground">Ideen teilen, abstimmen, LernZeit mitgestalten</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          </ul>
          <div className="space-y-6 pt-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Dein Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile-name"
                      type="text"
                      autoComplete="name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Dein Name"
                      className="flex-1 min-w-0 text-base"
                    />
                    <Button onClick={saveProfileName} disabled={profileSaving || !profileName.trim()} size="sm">
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <NotificationSettings userId={userId} role="parent" />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareHeart className="h-5 w-5" />
                  Feedback
                </CardTitle>
                <CardDescription>
                  Schreib uns, was gut läuft oder besser werden kann. Fehler gefunden oder eine Idee?
                  Über das Formular oder per E-Mail an{' '}
                  <a href="mailto:info@lernzeit.app?subject=LernZeit%20Feedback" className="underline">
                    info@lernzeit.app
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
                  <MessageSquareHeart className="mr-2 h-4 w-4" />
                  Feedback senden
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/ideen">
                    💡 Ideen-Forum
                  </Link>
                </Button>
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
                  <Input className="text-base" id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <Input className="text-base" id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Passwort wiederholen" />
                </div>
                <Button onClick={changePassword} disabled={passwordChanging || !newPassword || !confirmPassword} className="w-full">
                  {passwordChanging ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ändern...</>) : "Passwort ändern"}
                </Button>
              </CardContent>
            </Card>

            <AccountDeleteSection
              isPremium={isPremium}
              umfrageUserId={userId}
              onDeleted={() => window.location.href = '/'}
            />
          </div>

          {onSignOut && (
            <Button variant="outline" className="w-full" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          )}
        </TabsContent>

      </Tabs>
      )}


      {/* Family Link not installed dialog */}
      <Dialog open={familyLinkInstallOpen} onOpenChange={setFamilyLinkInstallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KiteIcon className="h-5 w-5 text-primary" />
              Google Family Link installieren
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    Google Family Link wird benötigt
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Für die Steuerung der Bildschirmzeit deines Kindes auf dem Smartphone benötigst du die kostenlose Google Family Link App. Damit kannst du Tageslimits setzen, Apps freigeben und die in Lernzeit verdienten Bonusminuten aktivieren.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setFamilyLinkInstallOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleInstallFamilyLink}>
                <Download className="mr-2 h-4 w-4" />
                Im Play Store installieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ParentFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        defaultEmail={userEmail}
        isFoundingFamily={isFoundingFamily}
      />

      <RatingPromptDialog open={familyReady && !showFocusedEntry && ratingShouldShow} onResponse={ratingDismiss} />

      {/* Info-Kachel: erklärt das Empfehlungsprogramm für Nicht-Premium-Eltern */}
      <Dialog open={referralInfoOpen} onOpenChange={setReferralInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Empfehlungsprogramm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Mit dem LernZeit-Empfehlungsprogramm verschenkst du <strong>2 Monate Premium</strong> an
              Freunde und sicherst dir pro aktivem Kind <strong>1 Monat Premium gratis</strong> – bis zu
              insgesamt <strong>6 Bonus-Monate</strong>.
            </p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-foreground/90 leading-relaxed">
                <Crown className="inline h-3.5 w-3.5 text-primary mr-1 -mt-0.5" />
                Das Programm steht <strong>ausschließlich Premium-Mitgliedern</strong> zur Verfügung –
                nicht während der kostenlosen Testphase. Schließ deine Premium-Mitgliedschaft ab,
                um den Verschenken-Reiter freizuschalten.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="outline" onClick={() => setReferralInfoOpen(false)}>
                Schließen
              </Button>
              <Button
                onClick={() => {
                  setReferralInfoOpen(false);
                  setActiveTab('subscription');
                  setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
              >
                <Crown className="mr-2 h-4 w-4" />
                Zu Premium upgraden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Einmaliges Intro-Pop-up nach Abschluss der Premium-Mitgliedschaft */}
      <Dialog open={familyReady && !showFocusedEntry && referralIntroOpen} onOpenChange={(o) => { if (!o) dismissReferralIntro(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Willkommen bei LernZeit Premium!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Vielen Dank für dein Vertrauen. Als Premium-Mitglied hast du ab sofort alle Vorteile:
            </p>
            <ul className="space-y-2">
              {[
                'Alle Fächer & Klassenstufen freigeschaltet',
                'KI-Tutor mit persönlichen Erklärungen',
                'Individuelle Lernpläne für Klassenarbeiten',
                'Premium-Belohnungen anpassen',
                'Detaillierte Lernanalyse pro Kind',
                'Prioritätssupport',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 p-3 space-y-1.5">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                Neu freigeschaltet: Empfehlungsprogramm
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Verschenke 2 Monate Premium an Freunde und sichere dir bis zu
                6 Bonus-Monate gratis.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="outline" onClick={dismissReferralIntro}>
                Später
              </Button>
              <Button
                onClick={() => {
                  dismissReferralIntro();
                  setActiveTab('referral');
                  setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
              >
                <Gift className="mr-2 h-4 w-4" />
                Zum Empfehlungsprogramm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RevenueCatPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
      />
    </div>
  );
}
