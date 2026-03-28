import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Target, Award, Star, Gift } from 'lucide-react';

interface GameCompletionScreenProps {
  score: number;
  totalQuestions: number;
  sessionDuration: number;
  timePerTask: number;
  achievementBonusMinutes: number;
  perfectSessionBonus?: number;
  grade?: number;
  onContinue: () => void;
}

export function GameCompletionScreen({
  score,
  totalQuestions,
  sessionDuration,
  timePerTask,
  achievementBonusMinutes,
  perfectSessionBonus = 0,
  grade = 5,
  onContinue
}: GameCompletionScreenProps) {
  const earnedSeconds = score * timePerTask;
  const timeSpentSeconds = Math.round(sessionDuration / 1000);
  const perfectSessionBonusSeconds = perfectSessionBonus * 60;
  const netTimeSeconds = Math.max(0, earnedSeconds - timeSpentSeconds + (achievementBonusMinutes * 60) + perfectSessionBonusSeconds);
  const efficiency = Math.round((score / totalQuestions) * 100);
  const earnedMinutes = Number((netTimeSeconds / 60).toFixed(1));

  const isYoung = grade <= 4;

  // Determine celebration level
  const getCelebrationLevel = () => {
    if (efficiency >= 90) return 'excellent';
    if (efficiency >= 70) return 'good';
    return 'okay';
  };

  const celebrationLevel = getCelebrationLevel();

  // === YOUNG MODE (Klasse 1-4): super simple ===
  if (isYoung) {
    const youngEmojis = {
      excellent: '🏆',
      good: '🎉',
      okay: '💪'
    };
    const youngTitles = {
      excellent: 'Super gemacht!',
      good: 'Toll gemacht!',
      okay: 'Gut gemacht!'
    };

    return (
      <div className="w-full max-w-xl mx-auto space-y-6 overflow-hidden">
        <Card className="text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-8">
            {/* Big emoji */}
            <div className="text-8xl mb-4 animate-bounce">
              {youngEmojis[celebrationLevel]}
            </div>
            
            {/* Simple title */}
            <h1 className="text-3xl font-bold text-primary mb-6">
              {youngTitles[celebrationLevel]}
            </h1>

            {/* Score as simple stars */}
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <span key={i} className={`text-3xl ${i < score ? '' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>
            
            {/* Big minutes display */}
            <div className="bg-primary/10 rounded-2xl p-6 mb-6">
              <div className="text-5xl font-bold text-primary mb-1">{earnedMinutes}</div>
              <div className="text-lg text-muted-foreground">Minuten gewonnen! 📱</div>
            </div>

            {/* Simple continue button */}
            <Button 
              onClick={onContinue}
              size="lg" 
              className="w-full text-xl py-7 bg-primary hover:bg-primary/90"
            >
              🎉 Weiter!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === TEEN MODE (Klasse 5-10): full detail ===
  const celebrationEmojis = {
    excellent: '🏆🌟✨',
    good: '🎉👏💫',
    okay: '🎯💪🔥'
  };

  const celebrationTitles = {
    excellent: 'Unglaublich!',
    good: 'Fantastisch!',
    okay: 'Gut gemacht!'
  };

  const celebrationMessages = {
    excellent: 'Du bist ein wahrer Champion! Perfekte Leistung!',
    good: 'Tolle Arbeit! Du machst echte Fortschritte!',
    okay: 'Weiter so! Jede richtige Antwort zählt!'
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 overflow-hidden">
      {/* Celebration Header */}
      <Card className="text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-4">
          <div className="text-6xl mb-4 animate-bounce">
            {celebrationEmojis[celebrationLevel]}
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {celebrationTitles[celebrationLevel]}
          </h1>
          <p className="text-muted-foreground">
            {celebrationMessages[celebrationLevel]}
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mt-4">
            <Award className="w-4 h-4" />
            {score} von {totalQuestions} richtig!
          </div>
        </CardHeader>
      </Card>

      {/* Main Results */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
              <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold text-primary">{efficiency}%</div>
              <div className="text-sm text-muted-foreground">Genauigkeit</div>
            </div>
            <div className="text-center p-4 bg-accent/20 rounded-xl border border-accent/30">
              <Gift className="w-8 h-8 mx-auto mb-2 text-accent-foreground" />
              <div className="text-3xl font-bold text-accent-foreground">{earnedMinutes}</div>
              <div className="text-sm text-muted-foreground">Min. gewonnen</div>
            </div>
          </div>

          {(achievementBonusMinutes > 0 || perfectSessionBonus > 0) && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-xl p-4 mb-6 border border-yellow-200 dark:border-yellow-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">Bonus-Belohnungen!</span>
              </div>
              <div className="space-y-1 text-sm">
                {perfectSessionBonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">Perfect Session</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">+{perfectSessionBonus} Min.</span>
                  </div>
                )}
                {achievementBonusMinutes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-yellow-700 dark:text-yellow-300">Achievement Bonus</span>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">+{achievementBonusMinutes} Min.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground mb-6">
            <Clock className="w-4 h-4 inline mr-1" />
            {score} richtige × {timePerTask}s = {earnedSeconds}s<br/>
            - {timeSpentSeconds}s verbraucht
            {(achievementBonusMinutes > 0 || perfectSessionBonus > 0) && (
              <>
                <br/>+ {achievementBonusMinutes * 60 + perfectSessionBonusSeconds}s Bonus
              </>
            )}
            <br/>= <span className="font-semibold text-primary">{netTimeSeconds}s ({earnedMinutes} Min.)</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button 
          onClick={onContinue}
          size="lg" 
          className="w-full text-lg py-6 bg-primary hover:bg-primary/90"
        >
          <Trophy className="w-5 h-5 mr-2" />
          {earnedMinutes} Min. Bildschirmzeit erhalten!
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Deine Zeit wurde hinzugefügt! 📱✨
        </div>
      </div>
    </div>
  );
}
