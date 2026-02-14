
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { User, Settings, LogOut, Baby, Shield, Clock, Award, Trophy, Target, Star, Zap, BookOpen, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { ScreenTimeWidget } from '@/components/ScreenTimeWidget';
import { ParentDashboard } from '@/components/ParentDashboard';
import { ChildLinking } from '@/components/ChildLinking';
import { ChildSettingsMenu } from '@/components/ChildSettingsMenu';
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

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
  onStartGame: (grade: number) => void;
}

export function UserProfile({ user, onSignOut, onStartGame }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [totalTimeEarned, setTotalTimeEarned] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [hasParentLink, setHasParentLink] = useState(false);
  const [checkingParentLink, setCheckingParentLink] = useState(true);
  const { toast } = useToast();
  const { trialJustExpired, trialDaysLeft, isTrialing } = useSubscription();

  // Use the existing useChildSettings hook for children
  const { settings: childSettings, loading: childSettingsLoading } = useChildSettings(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Use screen time limit hook for children
  const { isAtLimit, remainingMinutes, getDailyLimit, todayMinutesUsed, todayAchievementMinutes, todayAchievementDetails, refreshUsage, loading: usageLoading } = useScreenTimeLimit(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Use the earned time from the useScreenTimeLimit hook (no duplicate logic needed)

  // Use streak hook for children
  const { streak, loading: streakLoading } = useStreak(
    profile?.role === 'child' ? user?.id : undefined
  );

  // Initialize push notifications for children
  // This handles local notifications when the app is in background
  usePushNotifications({
    userId: user?.id,
    role: profile?.role as 'child' | 'parent',
    enabled: profile?.role === 'child',
  });

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
        .maybeSingle();

      console.log('🔍 Parent link query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking parent link:', error);
        setHasParentLink(false);
      } else {
        const linked = !!data?.parent_id;
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
    try {
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

        if (createError) throw createError;
        setProfile(created);
      } else {
        setProfile(data);
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Profil konnte nicht geladen werden.",
        variant: "destructive",
      });
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
      </div>
    );
  }

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

  // Child Dashboard
  if (profile?.role === 'child') {
    return (
      <div className="min-h-screen bg-gradient-bg p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Trial Expired Banner */}
          {trialJustExpired && (
            <Card className="shadow-card border-warning bg-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <Crown className="w-6 h-6 text-warning shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Deine Testphase ist abgelaufen</p>
                  <p className="text-xs text-muted-foreground">Premium-Funktionen wie KI-Tutor und individuelle Einstellungen sind jetzt deaktiviert.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trial Active Badge */}
          {isTrialing && trialDaysLeft !== null && (
            <Card className="shadow-card border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm">
                  <span className="font-semibold">Premium-Test aktiv</span> — noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Header */}
          <Card className="shadow-card bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowProfileEdit(true)}
                    className="w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                    style={{ backgroundColor: profile?.avatar_color || '#3b82f6' }}
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-transparent text-white text-xl">
                        {(() => {
                          const avatarData = getAvatarById(profile?.avatar_id || 'cat');
                          return avatarData?.emoji || '👦';
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div>
                    <CardTitle className="text-xl">
                      Hallo, {profile?.name || 'Nutzer'}! 👋
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Klasse {profile?.grade}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSettingsMenu(true)}
                  className="hover:bg-white/20"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Screen Time Status */}
          {isAtLimit ? (
            <>
              {/* Limit Reached Info */}
              <Card className="shadow-card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">🎉</div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-800">Tagesziel geschafft!</h3>
                      <p className="text-amber-700 text-sm">
                        Du hast heute {getDailyLimit()} Minuten verdient.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => onStartGame(profile?.grade || 1)} 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    size="sm"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Weiter üben
                  </Button>
                </CardContent>
              </Card>

              {/* Show EarnedTimeWidget even when limit is reached - for breakdown and request */}
              <EarnedTimeWidget 
                userId={user.id}
                hasParentLink={hasParentLink}
              />
            </>
          ) : (
            <>
              {/* Game Start Card - Now First */}
              <Card className="shadow-card bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-3">🎮</div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">Bereit für neue Aufgaben?</h3>
                    <p className="text-green-700 text-sm">
                      Löse Übungen und verdiene wertvolle Handyzeit!
                    </p>
                  </div>
                  <Button 
                    onClick={() => onStartGame(profile?.grade || 1)} 
                    className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
                  >
                    <BookOpen className="w-6 h-6 mr-2" />
                    🚀 Lernen starten
                  </Button>
                </CardContent>
              </Card>

              {/* Combined Earned Time + Screen Time Request Widget */}
              <EarnedTimeWidget 
                userId={user.id}
                hasParentLink={hasParentLink}
              />
            </>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-orange-700">{totalTimeEarned}</div>
                <div className="text-xs text-orange-600">Min. verdient ⏰</div>
              </CardContent>
            </Card>
            <Card className="shadow-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-green-700">{gamesPlayed}</div>
                <div className="text-xs text-green-600">Spiele gespielt 🎯</div>
              </CardContent>
            </Card>
          </div>



          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <AchievementQuickView 
              userId={user.id} 
              onClick={() => {
                setSettingsInitialSection('achievements');
                setShowSettingsMenu(true);
              }} 
            />
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Streak</div>
                    <div className="text-sm text-muted-foreground">
                      {streakLoading ? 'Wird geladen...' : `${streak} Tage in Folge! 🔥`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parent Linking - only show if no parent link exists */}
          {!hasParentLink && !checkingParentLink && profile?.role === 'child' && (
            <ChildLinking 
              userId={user.id} 
              onLinked={() => {
                // Reload profile and check parent link status
                loadProfile();
                checkParentLink();
              }} 
            />
          )}

          {/* Fun Motivation */}
          <div className="text-center py-2">
            <div className="text-2xl mb-2">🌟</div>
            <p className="text-sm text-muted-foreground">
              Du schaffst das! Jeden Tag ein bisschen besser! 💪
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parent Dashboard
  if (profile?.role === 'parent') {
    return (
      <div className="min-h-screen bg-gradient-bg p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Trial Expired Banner */}
          {trialJustExpired && (
            <Card className="shadow-card border-warning bg-warning/10">
              <CardContent className="p-4 flex items-center gap-3">
                <Crown className="w-6 h-6 text-warning shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Die Testphase ist abgelaufen</p>
                  <p className="text-xs text-muted-foreground">Premium-Funktionen wie KI-Tutor und individuelle Einstellungen wurden deaktiviert. Einstellungen wurden auf Standard zurückgesetzt.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trial Active Badge */}
          {isTrialing && trialDaysLeft !== null && (
            <Card className="shadow-card border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm">
                  <span className="font-semibold">Premium-Test aktiv</span> — noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
                </p>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Willkommen, {profile?.name || 'Nutzer'}!
                    </CardTitle>
                    <Badge variant="secondary">Elternteil</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Screen Time Widget */}
        <ScreenTimeWidget />

        {/* Parent Dashboard */}
        <ParentDashboard userId={user.id} />
      </div>
    </div>
  );
  }

  // Admin Dashboard
  if (profile?.role === 'admin') {
    const AdminDashboard = React.lazy(() => import('@/components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
    
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
        <AdminDashboard />
      </React.Suspense>
    );
  }

  return null;
}
