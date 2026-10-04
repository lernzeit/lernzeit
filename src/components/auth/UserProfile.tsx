
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { isSessionRejected } from '@/hooks/useAuth';
import { User, Settings, LogOut, Baby, Shield, Clock, Award, Trophy, Target, Star, Zap, BookOpen, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { STRIPE_MONTHLY_PRICE_ID } from '@/config/pricing';
import { ParentDashboard } from '@/components/ParentDashboard';
import { ChildLinking } from '@/components/ChildLinking';
import { ChildLinkPromptCard } from '@/components/child/ChildLinkPromptCard';
import { ChildSettingsMenu } from '@/components/ChildSettingsMenu';
import { RevenueCatPaywall } from '@/components/RevenueCatPaywall';
import { Capacitor } from '@capacitor/core';

// Lazy-load admin dashboard at module scope so it isn't recreated on every render
// (recreating React.lazy inside the component caused AdminDashboard to fully
// unmount/remount on any parent re-render — losing tab + benchmark results).
const LazyAdminDashboard = React.lazy(() =>
  import('@/components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
// ParentSettingsMenu removed - functionality now integrated into ParentDashboard
import { AchievementDisplay } from '@/components/AchievementDisplay';
import { AchievementQuickView } from '@/components/AchievementQuickView';
import { EarnedTimeWidget } from '@/components/EarnedTimeWidget';

import { ProfileEdit } from '@/components/ProfileEdit';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarById } from '@/data/avatars';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useScreenTimeLimit } from '@/hooks/useScreenTimeLimit';
import { useStreak } from '@/hooks/useStreak';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOneSignal, unregisterPushDevice } from '@/hooks/useOneSignal';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { DailyChallenge } from '@/components/DailyChallenge';
import { GoogleRoleSelection } from '@/components/auth/GoogleRoleSelection';
import { LernPflanze } from '@/components/child/LernPflanze';
import { ZeitUhr } from '@/components/child/ZeitUhr';
import { HeftRegal, HefteGestalten } from '@/components/child/Hefte';
import { useHefte } from '@/hooks/useHefte';
import type { FachId } from '@/lib/hefte';
import { openStripeUrl } from '@/utils/checkoutRedirect';
import { useSyncShieldAttempts } from '@/hooks/useShieldAttempts';
import { useScreenTimeRelease } from '@/hooks/useScreenTimeRelease';
import { BaseTimeCard } from '@/components/screenTime/BaseTimeCard';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
  onStartGame: (grade: number) => void;
  onStartStreakRecovery?: (grade: number) => void;
  /** Heft antippen: Fach direkt starten */
  onStartSubject?: (grade: number, subject: FachId) => void;
}

export function UserProfile({ user, onSignOut, onStartGame, onStartStreakRecovery, onStartSubject }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [totalTimeEarned, setTotalTimeEarned] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [hasParentLink, setHasParentLink] = useState(false);
  const [checkingParentLink, setCheckingParentLink] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [streakReactivationTrigger, setStreakReactivationTrigger] = useState(0);
  const childLinkingRef = useRef<HTMLDivElement | null>(null);
  const [parentPaywallOpen, setParentPaywallOpen] = useState(false);
  const [hefteGestalten, setHefteGestalten] = useState(false);
  const { toast } = useToast();
  const { trialJustExpired, trialDaysLeft, isTrialing } = useSubscription();

  const handleParentUpgrade = async () => {
    // Never route native app users to Stripe – open the in-app RevenueCat paywall.
    if (Capacitor.isNativePlatform()) {
      setParentPaywallOpen(true);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: STRIPE_MONTHLY_PRICE_ID },
      });
      if (error) throw error;
      if (data?.url) openStripeUrl(data.url);
    } catch {
      toast({ title: 'Fehler', description: 'Checkout konnte nicht geöffnet werden.', variant: 'destructive' });
    }
  };

  // Use the existing useChildSettings hook for children
  const { settings: childSettings, loading: childSettingsLoading } = useChildSettings(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Use screen time limit hook for children
  const { isAtLimit, remainingMinutes, getDailyLimit, todayMinutesUsed, todayAchievementMinutes, todayAchievementDetails, refreshUsage, loading: usageLoading } = useScreenTimeLimit(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Use the earned time from the useScreenTimeLimit hook (no duplicate logic needed)

  // Hefte des Kindes (Farbe, Sticker, sichtbare Faecher)
  const hefte = useHefte(profile?.role === 'child' ? user?.id : undefined, profile?.grade || 1);

  // Use streak hook for children
  const { streak, status: streakStatus, inactiveDays, loading: streakLoading } = useStreak(
    profile?.role === 'child' ? user?.id : undefined
  );

  // Initialize push notifications for children AND parents
  // Children: notified when screen time is approved/denied
  // Parents: notified when a child creates a new request
  usePushNotifications({
    userId: user?.id,
    role: profile?.role as 'child' | 'parent',
    enabled: profile?.role === 'child' || profile?.role === 'parent',
  });

  // Native push via OneSignal (Android/iOS) — works when app is closed
  useOneSignal({
    userId: user?.id,
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
    enabled: profile?.role === 'child' || profile?.role === 'parent',
    // Eltern werden erst beim Teilen des Einladungslinks gefragt (besserer Kontext).
    autoPrompt: profile?.role !== 'parent',
  });

  // Drücke auf „Eltern fragen“ am Sperrbildschirm einsammeln. Läuft nur auf
  // dem Gerät des Kindes — dort liegen sie in der App Group, und nur LernZeit
  // selbst kann sie weitergeben.
  useSyncShieldAttempts(user?.id, profile?.role === 'child');

  // Genehmigte Zeit auf dem Gerät einlösen. Ebenfalls nur auf dem Kindgerät:
  // Die Sperre liegt dort, und nur dort lässt sie sich öffnen.
  useScreenTimeRelease(user?.id, profile?.role === 'child');

  // Check for parent-child relationship
  const checkParentLink = async () => {
    if (!user?.id || profile?.role !== 'child') {
      setHasParentLink(false);
      setCheckingParentLink(false);
      return;
    }

    try {
      setCheckingParentLink(true);
      console.log('🔍 Checking parent link for child:', user.id);
      
      const { data, error } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', user.id)
        .limit(1);

      console.log('🔍 Parent link query result:', { data, error });

      if (error) {
        console.error('❌ Error checking parent link:', error);
        setHasParentLink(false);
      } else {
        const linked = !!(data && data.length > 0 && data[0].parent_id);
        console.log('✅ Parent link status:', linked ? 'LINKED' : 'NOT LINKED');
        setHasParentLink(linked);
      }
    } catch (error) {
      console.error('❌ Error in checkParentLink:', error);
      setHasParentLink(false);
    } finally {
      setCheckingParentLink(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  // Show onboarding only once for truly new users
  useEffect(() => {
    if (profile && user?.id) {
      const key = `lernzeit_onboarding_${user.id}`;
      // Already seen? Skip.
      if (localStorage.getItem(key)) return;

      // Extra guard: only show if the profile was created less than 5 minutes ago
      // This prevents re-showing after localStorage is cleared (e.g. browser/app restart)
      const profileAge = Date.now() - new Date(profile.created_at).getTime();
      const isNewUser = profileAge < 5 * 60 * 1000; // 5 minutes

      if (isNewUser) {
        localStorage.setItem(key, 'true');
        setShowOnboarding(true);
      } else {
        // Profile is old → mark as seen so we never check again
        localStorage.setItem(key, 'true');
      }
    }
  }, [profile, user?.id]);

  // Detect Google OAuth users who haven't confirmed their role yet
  useEffect(() => {
    if (!profile || !user?.id) return;

    const roleConfirmed = localStorage.getItem(`lernzeit_role_confirmed_${user.id}`);
    if (roleConfirmed) return;

    // Check if user signed in via Google
    const providers = user.app_metadata?.providers || [];
    const isOAuthUser =
      providers.includes('google') ||
      providers.includes('apple') ||
      user.app_metadata?.provider === 'google' ||
      user.app_metadata?.provider === 'apple';
    const hasExplicitRole = user.user_metadata?.role;

    if (!isOAuthUser || hasExplicitRole) {
      localStorage.setItem(`lernzeit_role_confirmed_${user.id}`, 'true');
      return;
    }

    // Always show role selection dialog for OAuth users without a confirmed role.
    // Clean up any legacy pre-OAuth hints so they don't interfere.
    localStorage.removeItem('lernzeit_pending_google_role');
    localStorage.removeItem('lernzeit_pending_google_grade');
    setNeedsRoleSelection(true);
  }, [profile, user?.id]);

  // Check parent link when profile is loaded
  useEffect(() => {
    if (profile?.role === 'child') {
      checkParentLink();
    }
  }, [profile?.role]);

  // Reload stats when user navigates back to dashboard or when hash changes
  useEffect(() => {
    if (user && profile?.role === 'child') {
      loadStats();
    }
  }, [user, profile?.role]);

  useEffect(() => {
    if (profile?.role !== 'child' || streakStatus !== 'active') return;

    const reactivated = sessionStorage.getItem('lernzeit_streak_reactivated');
    if (reactivated !== user?.id) return;

    sessionStorage.removeItem('lernzeit_streak_reactivated');
    setStreakReactivationTrigger((value) => value + 1);
  }, [profile?.role, streakStatus, user?.id]);

  // Listen for hash changes to reload stats after completing a game
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#reload-stats' && user && profile?.role === 'child') {
        loadStats();
        // Clear the hash
        window.location.hash = '';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Also check on mount
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, profile?.role]);

  const loadProfile = async () => {
    setLoadError(null);
    setLoading(true);
    try {
      // Guard: verify the account still exists before touching profile data.
      // Only an explicit server rejection (401/403) signs the user out — a
      // network hiccup must not destroy the session.
      const timeoutMarker = Symbol('timeout');
      const authResult = await Promise.race([
        supabase.auth.getUser(),
        new Promise<typeof timeoutMarker>((resolve) => setTimeout(() => resolve(timeoutMarker), 5000)),
      ]);

      if (authResult === timeoutMarker) {
        setLoadError('Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
        return;
      }

      const { data: authUser, error: authError } = authResult;
      if (authError && isSessionRejected(authError)) {
        await supabase.auth.signOut({ scope: 'local' });
        onSignOut();
        return;
      }
      if (authError || !authUser?.user) {
        setLoadError('Profil konnte nicht geladen werden. Bitte erneut versuchen.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || '',
          role: user.user_metadata?.role || 'child',
          grade: user.user_metadata?.grade || 1,
          created_at: new Date().toISOString(),
        };

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          // Foreign-key violation → the auth account no longer exists.
          const isForeignKeyViolation =
            createError.code === '23503' || /foreign key/i.test(createError.message || '');

          if (isForeignKeyViolation) {
            console.warn('Profile could not be created, signing out:', createError.message);
            await supabase.auth.signOut({ scope: 'local' });
            onSignOut();
            return;
          }

          console.error('Profile creation failed:', createError.message);
          setLoadError('Profil konnte nicht angelegt werden. Bitte erneut versuchen.');
          return;
        }
        setProfile(created);
      } else {
        setProfile(data);
      }
    } catch (error: any) {
      console.error('loadProfile failed:', error);
      if (isSessionRejected(error)) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch { /* ignore */ }
        onSignOut();
        return;
      }
      // Never leave a blank screen: show a retryable error state instead.
      setLoadError('Profil konnte nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;
    
    try {
      // ✅ FIXED: Load total time earned from both sessions with robust conversion
      const [gameSessionsRes, learningSessionsRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('time_earned')
          .eq('user_id', user.id),
        supabase
          .from('learning_sessions')
          .select('time_earned')
          .eq('user_id', user.id)
      ]);

      // Calculate total time earned with smart seconds/minutes detection
      const gameValues = (gameSessionsRes.data ?? []).map(s => Number(s.time_earned) || 0);
      const learningValues = (learningSessionsRes.data ?? []).map(s => Number(s.time_earned) || 0);
      const allValues = [...gameValues, ...learningValues];
      
      const totalSeconds = allValues.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
      
      // Convert to minutes - assume values are in seconds
      const totalMinutes = Math.ceil(totalSeconds / 60);
      setTotalTimeEarned(totalMinutes);

      // Count total games played
      const [gameCountRes, learningCountRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('learning_sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
      ]);

      const totalGames = (gameCountRes.count || 0) + (learningCountRes.count || 0);
      setGamesPlayed(totalGames);

      console.log('📊 Stats loaded:', { 
        allTimeValues: allValues, 
        totalSeconds, 
        totalMinutes, 
        totalGames 
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };



  const handleSignOut = async () => {
    await unregisterPushDevice(user?.id);
    await supabase.auth.signOut();
    onSignOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Profil wird geladen...</p>
          </CardContent>
        </Card>
        {/* Onboarding won't show while loading */}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <p className="font-semibold">Profil nicht verfügbar</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => loadProfile()}>Erneut versuchen</Button>
              <Button variant="ghost" onClick={handleSignOut}>Abmelden</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show role selection for Google OAuth users who haven't chosen a role
  if (needsRoleSelection) {
    return (
      <GoogleRoleSelection
        userId={user.id}
        onComplete={(selectedRole, selectedGrade) => {
          setNeedsRoleSelection(false);
          // Reload profile with new role
          loadProfile();
          loadStats();
        }}
      />
    );
  }

  const handleOnboardingComplete = () => {
    if (user?.id) {
      localStorage.setItem(`lernzeit_onboarding_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  // Show settings menu for children
  if (profile?.role === 'child' && showSettingsMenu) {
    return (
      <ChildSettingsMenu 
        user={user} 
        profile={profile} 
        onSignOut={onSignOut} 
        onBack={() => {
          setShowSettingsMenu(false);
          setSettingsInitialSection(undefined);
        }}
        initialSection={settingsInitialSection}
      />
    );
  }

  // Parent settings now handled by the ParentDashboard tabs
  // No separate ParentSettingsMenu needed

  // Show profile edit for children
  if (profile?.role === 'child' && showProfileEdit) {
    return (
      <ProfileEdit 
        user={user} 
        profile={profile} 
        onBack={() => setShowProfileEdit(false)}
        onUpdate={(updatedProfile) => {
          setProfile(updatedProfile);
          setShowProfileEdit(false);
        }}
      />
    );
  }

  // Child Dashboard (App-Redesign "Heft", 04.10.2026): Zeit-Uhr, zwei Knoepfe,
  // Lernpflanze statt Feuer, Faecher als selbst gestaltete Hefte.
  if (profile?.role === 'child') {
    const klasse = profile?.grade || 1;
    const avatar = getAvatarById(profile?.avatar_id || 'cat');
    return (
      <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom">
        {showOnboarding && (
          <OnboardingTutorial role="child" grade={klasse} onComplete={handleOnboardingComplete} />
        )}
        <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-10 pt-4">
          {/* Kopf: Avatar, Name, Lernpflanze, Einstellungen */}
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowProfileEdit(true)}
              aria-label="Profil bearbeiten"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl transition-transform active:scale-95"
              style={{ backgroundColor: profile?.avatar_color || '#2563eb' }}
            >
              <span aria-hidden="true">{avatar?.emoji || '🙂'}</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-extrabold">Hallo, {profile?.name || 'du'}</h1>
              <p className="truncate text-sm text-muted-foreground">
                Klasse {profile?.grade}
                {profile?.username ? `, @${profile.username}` : ''}
              </p>
            </div>
            <LernPflanze
              streak={streak}
              status={streakStatus}
              inactiveDays={inactiveDays}
              loading={streakLoading}
              reactivationTrigger={streakReactivationTrigger}
              onStartRecovery={() => onStartStreakRecovery?.(klasse)}
            />
            <Button variant="ghost" size="icon" onClick={() => setShowSettingsMenu(true)} aria-label="Einstellungen">
              <Settings className="h-5 w-5" />
            </Button>
          </header>

          {/* Testphase der Eltern: nur eine ruhige Zeile */}
          {trialJustExpired && (
            <p className="flex items-start gap-2 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-tinte">
              <Crown className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Die Testphase ist vorbei. KI-Tutor und eigene Einstellungen gibt es jetzt nur mit Premium.
            </p>
          )}

          {/* Die Zeit: Uhr, Lernen starten, Zeit anfragen */}
          <section aria-label="Deine Bildschirmzeit heute" className="heft-karo rounded-[28px] bg-card px-5 pb-5 pt-3 ring-1 ring-inset ring-karo">
            <ZeitUhr verdient={todayMinutesUsed} limit={getDailyLimit()} />
            <p className="text-center text-sm text-muted-foreground">
              {isAtLimit ? (
                <>Tageslimit erreicht. Du kannst trotzdem weiter üben.</>
              ) : (
                <>Noch <b className="tabular text-tinte">{remainingMinutes} Min.</b> bis zum Tageslimit</>
              )}
            </p>
            <div className="mt-4 space-y-3">
              <Button size="lg" className="w-full text-base" onClick={() => onStartGame(klasse)}>
                {isAtLimit ? 'Weiter üben' : 'Lernen starten'}
              </Button>
              <EarnedTimeWidget userId={user.id} hasParentLink={hasParentLink} />
            </div>
          </section>

          {/* Freiminuten stehen ueber dem Rest: Wer heute noch welche hat, muss nicht fragen. */}
          <BaseTimeCard childId={user.id} />

          <DailyChallenge userId={user.id} />

          {/* Faecher als Hefte, antippen startet das Fach */}
          <HeftRegal
            hefte={hefte.hefte}
            onWaehlen={(fach) => (onStartSubject ? onStartSubject(klasse, fach) : onStartGame(klasse))}
            onGestalten={() => setHefteGestalten(true)}
          />

          {!hasParentLink && !checkingParentLink && (
            <ChildLinkPromptCard
              totalMinutes={totalTimeEarned}
              onConnect={() =>
                childLinkingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            />
          )}

          {/* Ab Klasse 5: Erfolge als eine Zeile */}
          {klasse > 4 && (
            <AchievementQuickView
              userId={user.id}
              onClick={() => {
                setSettingsInitialSection('achievements');
                setShowSettingsMenu(true);
              }}
            />
          )}

          {!hasParentLink && !checkingParentLink && (
            <div ref={childLinkingRef}>
              <ChildLinking
                userId={user.id}
                onLinked={() => {
                  loadProfile();
                  checkParentLink();
                }}
              />
            </div>
          )}
        </div>

        <HefteGestalten
          offen={hefteGestalten}
          onOffen={setHefteGestalten}
          hefte={hefte.hefte}
          sammlung={hefte.sammlung}
          frei={hefte.frei}
          speichern={hefte.speichern}
        />
      </div>
    );
  }

  // Parent Dashboard
  if (profile?.role === 'parent') {
    return (
      <div className="min-h-screen bg-gradient-bg py-4 pt-safe-top pb-safe-bottom">
        {showOnboarding && (
          <OnboardingTutorial role="parent" onComplete={handleOnboardingComplete} />
        )}
        <div className="page-container space-y-6">
          {/* Trial Expired Banner */}
          {trialJustExpired && (
            <Card className="shadow-card border-warning bg-warning/10">
              <CardContent className="p-4 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-warning shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Die Testphase ist abgelaufen</p>
                    <p className="text-xs text-muted-foreground">Premium-Funktionen wurden deaktiviert.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0"
                  onClick={() => void handleParentUpgrade()}
                >
                  Jetzt upgraden
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Trial Active Badge */}
          {isTrialing && trialDaysLeft !== null && (
            <Card className="shadow-card border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm">
                    <span className="font-semibold">Premium-Test aktiv</span> — noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0"
                  onClick={() => void handleParentUpgrade()}
                >
                  Jetzt Abo abschließen
                </Button>
              </CardContent>
            </Card>
          )}
          {/* Parent Dashboard */}
        <ParentDashboard userId={user.id} onSignOut={handleSignOut} />
        <RevenueCatPaywall open={parentPaywallOpen} onOpenChange={setParentPaywallOpen} />
      </div>
    </div>
  );
  }

  // Admin Dashboard
  if (profile?.role === 'admin') {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-card">
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Admin Panel wird geladen...</p>
            </CardContent>
          </Card>
        </div>
      }>
        <LazyAdminDashboard />
      </React.Suspense>
    );
  }

  return null;
}
