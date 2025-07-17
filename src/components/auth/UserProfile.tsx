
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { User, Settings, LogOut, Baby, Shield, Clock, Award, Trophy, Target, Star, Zap, BookOpen } from 'lucide-react';
import { ScreenTimeWidget } from '@/components/ScreenTimeWidget';
import { ParentDashboard } from '@/components/ParentDashboard';
import { ChildLinking } from '@/components/ChildLinking';
import { ChildSettingsMenu } from '@/components/ChildSettingsMenu';
import { ParentSettingsMenu } from '@/components/ParentSettingsMenu';
import { AchievementsBadge } from '@/components/AchievementsBadge';
import { ProfileEdit } from '@/components/ProfileEdit';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useScreenTimeLimit } from '@/hooks/useScreenTimeLimit';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
  onStartGame: (grade: number) => void;
}

export function UserProfile({ user, onSignOut, onStartGame }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [totalTimeEarned, setTotalTimeEarned] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const { toast } = useToast();

  // Use the existing useChildSettings hook for children
  const { settings: childSettings, loading: childSettingsLoading } = useChildSettings(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Use screen time limit hook for children
  const { isAtLimit, remainingMinutes, getDailyLimit, todayMinutesUsed } = useScreenTimeLimit(
    profile?.role === 'child' ? user?.id || '' : ''
  );
  
  // Determine if child has parent link based on child settings
  const hasParentLink = profile?.role === 'child' ? 
    (!childSettingsLoading && childSettings !== null) : false;

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

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
      // Load from both game_sessions and learning_sessions for complete stats
      const [gameSessionsResponse, learningSessionsResponse] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('learning_sessions')
          .select('*')
          .eq('user_id', user.id)
      ]);

      let totalTime = 0;
      let totalGames = 0;

      // Add time from game_sessions
      if (gameSessionsResponse.data) {
        totalTime += gameSessionsResponse.data.reduce((sum, session) => sum + session.time_earned, 0);
        totalGames += gameSessionsResponse.data.length;
      }

      // Add time from learning_sessions  
      if (learningSessionsResponse.data) {
        totalTime += learningSessionsResponse.data.reduce((sum, session) => sum + session.time_earned, 0);
        totalGames += learningSessionsResponse.data.length;
      }

      setTotalTimeEarned(totalTime);
      setGamesPlayed(totalGames);
    } catch (error: any) {
      console.error('Fehler beim Laden der Statistiken:', error);
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
        onBack={() => setShowSettingsMenu(false)} 
      />
    );
  }

  // Show settings menu for parents
  if (profile?.role === 'parent' && showSettingsMenu) {
    return (
      <ParentSettingsMenu 
        userId={user.id}
        onBack={() => setShowSettingsMenu(false)}
      />
    );
  }

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
          {/* Header */}
          <Card className="shadow-card bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowProfileEdit(true)}
                    className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-transparent text-white text-xl">
                        {profile?.name ? profile.name.charAt(0).toUpperCase() : '👦'}
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
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Unabhängig
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
            <Card className="shadow-card bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">⏰</div>
                  <h3 className="text-xl font-bold text-red-800 mb-2">Tageslimit erreicht!</h3>
                  <p className="text-red-700 text-sm">
                    Du hast bereits {getDailyLimit()} Minuten verdient. Du kannst weiter üben, aber keine weitere Zeit verdienen.
                  </p>
                </div>
                <Button 
                  onClick={() => onStartGame(profile?.grade || 1)} 
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
                >
                  <BookOpen className="w-6 h-6 mr-2" />
                  📚 Trotzdem üben (ohne Belohnung)
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-card bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-blue-700">Heute verdient:</span>
                      <span className="font-bold text-blue-800">{todayMinutesUsed} Min.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Noch verfügbar:</span>
                      <span className="font-bold text-blue-800">{remainingMinutes} Min.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                    🚀 Lernen starten (Klasse {profile?.grade || 1})
                  </Button>
                </CardContent>
              </Card>
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

          {/* Achievements Badge */}
          <AchievementsBadge userId={user.id} />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-purple-700">Level 1</div>
                <div className="text-xs text-purple-600">Lern-Einsteiger</div>
              </CardContent>
            </Card>
            <Card className="shadow-card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-blue-700">Streak: 1</div>
                <div className="text-xs text-blue-600">Tage in Folge</div>
              </CardContent>
            </Card>
          </div>

          {/* Parent Linking - only show if no parent link exists */}
          {!hasParentLink && !childSettingsLoading && (
            <ChildLinking 
              userId={user.id} 
              onLinked={() => {
                // Reload profile to update hasParentLink status
                loadProfile();
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
  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSettingsMenu(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
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
