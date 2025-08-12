import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Award, Zap } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';

interface AchievementDisplayProps {
  userId: string;
  variant?: 'compact' | 'full';
}

export function AchievementDisplay({ userId, variant = 'full' }: AchievementDisplayProps) {
  const { 
    userAchievements, 
    getCompletedAchievements, 
    getRecentAchievements, 
    getTotalRewardMinutes, 
    loading 
  } = useAchievements(userId, { suppressToast: true });

  console.log('🏆 AchievementDisplay data:', {
    userId,
    variant,
    totalAchievements: userAchievements.length,
    completedCount: getCompletedAchievements().length,
    recentCount: getRecentAchievements().length,
    loading
  });

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Erfolge</div>
              <div className="text-sm text-muted-foreground">Wird geladen...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedAchievements = getCompletedAchievements();
  const recentAchievements = getRecentAchievements();
  const totalRewardMinutes = getTotalRewardMinutes();

  // Group by category for full view
  const achievementsByCategory = userAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof userAchievements>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'math': return '🧮';
      case 'german': return '📚';
      case 'english': return '🇬🇧';
      case 'geography': return '🌍';
      case 'history': return '📜';
      case 'physics': return '⚛️';
      case 'biology': return '🧬';
      case 'chemistry': return '🧪';
      case 'latin': return '🏛️';
      case 'general': return '🎯';
      default: return '🎯';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'math': return 'Mathematik';
      case 'german': return 'Deutsch';
      case 'english': return 'Englisch';
      case 'geography': return 'Geographie';
      case 'history': return 'Geschichte';
      case 'physics': return 'Physik';
      case 'biology': return 'Biologie';
      case 'chemistry': return 'Chemie';
      case 'latin': return 'Latein';
      case 'general': return 'Allgemein';
      default: return category;
    }
  };

  // Compact view for dashboard
  if (variant === 'compact') {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Erfolge
                {recentAchievements.length > 0 && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {completedAchievements.length > 0 ? (
                  <>
                    {completedAchievements.length} erreicht • +{totalRewardMinutes} Min Bonus
                  </>
                ) : userAchievements.length > 0 ? (
                  <>
                    {userAchievements.filter(a => a.current_progress > 0).length} in Arbeit • {userAchievements.length} verfügbar
                  </>
                ) : (
                  'Sammle deine ersten Erfolge!'
                )}
              </div>
            </div>
            <div className="text-2xl">
              {completedAchievements.length > 0 ? '🏆' : '🎯'}
            </div>
          </div>
          
          {recentAchievements.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium text-primary mb-2">
                🎉 Neue Erfolge!
              </div>
              <div className="space-y-1">
              {recentAchievements
                .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
                .slice(0, 2).map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-2 text-xs">
                    <span>{achievement.icon}</span>
                    <span className="text-muted-foreground">{achievement.name}</span>
                    {achievement.reward_minutes > 0 && (
                      <span className="text-primary font-medium">+{achievement.reward_minutes}min</span>
                    )}
                  </div>
                ))}
                {recentAchievements.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    ... und {recentAchievements.length - 2} weitere
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view for achievements page
  if (userAchievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Erfolgs-System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Löse deine ersten Aufgaben, um Erfolge freizuschalten!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Erfolgs-System
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-green-600" />
              <span className="font-medium">{completedAchievements.length}</span>
              <span className="text-muted-foreground">erreicht</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="font-medium">+{totalRewardMinutes}min</span>
              <span className="text-muted-foreground">Bonus</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(achievementsByCategory).map(([category, achievements]) => {
            const completed = achievements.filter(a => a.is_completed).length;
            const inProgress = achievements.filter(a => a.current_progress > 0 && !a.is_completed).length;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{getCategoryName(category)}</div>
                    <div className="text-sm text-muted-foreground">
                      {completed} abgeschlossen • {inProgress} in Arbeit • {achievements.length} gesamt
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 ml-11">
                  {achievements
                    .sort((a, b) => {
                      // Sort: completed first, then by progress percentage, then by requirement value
                      if (a.is_completed && !b.is_completed) return -1;
                      if (!a.is_completed && b.is_completed) return 1;
                      if (a.is_completed && b.is_completed) return 0;
                      
                      const aProgress = (a.current_progress || 0) / a.requirement_value;
                      const bProgress = (b.current_progress || 0) / b.requirement_value;
                      if (aProgress !== bProgress) return bProgress - aProgress;
                      
                      return a.requirement_value - b.requirement_value;
                    })
                    .map((achievement) => {
                      const progress = (achievement.current_progress || 0) / achievement.requirement_value * 100;
                      
                      return (
                        <div key={achievement.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{achievement.icon}</span>
                              <div>
                                <div className={`font-medium ${achievement.is_completed ? 'text-green-600' : ''}`}>
                                  {achievement.name}
                                  {achievement.is_completed && <Star className="w-4 h-4 text-yellow-500 inline ml-1" />}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {achievement.description}
                                  {achievement.reward_minutes > 0 && (
                                    <span className="ml-2 text-primary">+{achievement.reward_minutes}min</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {achievement.current_progress || 0}/{achievement.requirement_value}
                            </div>
                          </div>
                          <Progress 
                            value={progress} 
                            className="h-2"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}