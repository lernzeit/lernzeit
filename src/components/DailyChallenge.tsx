import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';

interface DailyChallengeProps {
  userId: string;
}

export function DailyChallenge({ userId }: DailyChallengeProps) {
  const { challenge, loading, getDescription, getEmoji, getTitle } = useDailyChallenge(userId);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3 px-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Challenge wird geladen...</span>
        </CardContent>
      </Card>
    );
  }

  if (!challenge) return null;

  const isCompleted = challenge.is_completed;

  return (
    <Card className={`transition-all ${
      isCompleted
        ? 'border-green-400/50 bg-green-50/30 dark:bg-green-950/10'
        : 'border-primary/30 bg-primary/5'
    }`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEmoji()}</span>
            <span className="font-semibold text-sm">{getTitle()}</span>
          </div>
          {isCompleted ? (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
              <CheckCircle className="h-3 w-3" />
              Geschafft!
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              +{challenge.reward_minutes} Min
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{getDescription()}</p>
      </CardContent>
    </Card>
  );
}
