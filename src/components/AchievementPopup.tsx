import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { NewAchievement } from '@/hooks/useAchievements';

interface AchievementPopupProps {
  achievements: NewAchievement[];
  onClose: () => void;
}

export function AchievementPopup({ achievements, onClose }: AchievementPopupProps) {
  if (achievements.length === 0) return null;

  const totalReward = achievements.reduce((sum, ach) => sum + ach.reward_minutes, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          
          <h2 className="text-2xl font-bold mb-2">Glückwunsch!</h2>
          <p className="text-muted-foreground mb-6">
            Du hast {achievements.length > 1 ? 'neue Erfolge' : 'einen neuen Erfolg'} erreicht!
          </p>

          <div className="space-y-3 mb-6">
            {achievements.map((achievement, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                style={{ borderLeft: `4px solid ${achievement.color}` }}
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="text-left">
                  <div className="font-medium">{achievement.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {achievement.description}
                  </div>
                  {achievement.reward_minutes > 0 && (
                    <div className="text-sm font-medium text-primary">
                      +{achievement.reward_minutes} Minuten Belohnung!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalReward > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-gruen-hell/10 rounded-2xl mb-4">
              <Gift className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Gesamt: +{totalReward} Minuten Belohnung!
              </span>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Weiter lernen!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}