import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';

interface AchievementQuickViewProps {
  userId: string;
  onClick: () => void;
}

export function AchievementQuickView({ userId, onClick }: AchievementQuickViewProps) {
  const { getRecentAchievements, getCompletedAchievements, loading } = useAchievements(userId, { suppressToast: true });

  if (loading) {
    return (
      <Card className="shadow-card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 cursor-pointer hover:shadow-lg transition-all" onClick={onClick}>
        <CardContent className="p-4 text-center">
          <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-sm font-medium text-yellow-700">Erfolge</div>
          <div className="text-xs text-yellow-600">Wird geladen...</div>
        </CardContent>
      </Card>
    );
  }

  const recentAchievements = getRecentAchievements(30); // Last 30 days
  const completedAchievements = getCompletedAchievements();
  const totalCompleted = completedAchievements.length;

  return (
    <Card className="shadow-card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <div>
            <div className="text-sm font-medium text-yellow-700">Erfolge</div>
            <div className="text-xs text-yellow-600">
              {totalCompleted > 0 ? `${totalCompleted} erreicht` : 'Noch keine'}
            </div>
          </div>
        </div>

        {recentAchievements.length > 0 ? (
          <div className="space-y-1">
            {recentAchievements.slice(0, 3).map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-2 text-xs">
                <span className="text-sm">{achievement.icon}</span>
                <span className="text-yellow-700 truncate flex-1">{achievement.name}</span>
                <Star className="w-3 h-3 text-yellow-500" />
              </div>
            ))}
            {recentAchievements.length > 3 && (
              <div className="text-xs text-yellow-600 text-center">
                +{recentAchievements.length - 3} weitere
              </div>
            )}
          </div>
        ) : totalCompleted > 0 ? (
          <div className="text-center">
            <div className="text-xs text-yellow-600">Letzte Erfolge anzeigen</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-yellow-600">Sammle deine ersten!</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}