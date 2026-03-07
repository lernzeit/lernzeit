import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, BookOpen, Trophy } from 'lucide-react';
import { useAgeGroup } from '@/hooks/useAgeGroup';

interface SessionLengthSelectorProps {
  subject: string;
  secondsPerTask: number;
  grade: number;
  onSelect: (count: number) => void;
  onBack: () => void;
}

const options = [
  { count: 5, label: 'Schnell', youngLabel: 'Kurz', emoji: '⚡', icon: Zap, description: 'Ideal für zwischendurch', youngDesc: '5 Aufgaben', color: 'text-warning' },
  { count: 10, label: 'Normal', youngLabel: 'Mittel', emoji: '📚', icon: BookOpen, description: 'Gute Lerneinheit', youngDesc: '10 Aufgaben', color: 'text-primary' },
  { count: 15, label: 'Marathon', youngLabel: 'Lang', emoji: '🏆', icon: Trophy, description: 'Für Lern-Champions', youngDesc: '15 Aufgaben', color: 'text-purple-600 dark:text-purple-400' },
];

export function SessionLengthSelector({ subject, secondsPerTask, grade, onSelect, onBack }: SessionLengthSelectorProps) {
  const age = useAgeGroup(grade);
  const isYoung = age.group === 'young';

  return (
    <div className="min-h-screen bg-gradient-bg py-4">
      <div className="page-container max-w-lg mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>

        <div className="text-center mb-6">
          <h2 className={`${isYoung ? 'text-3xl' : 'text-2xl'} font-bold mb-1`}>
            {isYoung ? '🎮 Wie viele Aufgaben?' : 'Wie viele Aufgaben?'}
          </h2>
          {!isYoung && (
            <p className="text-sm text-muted-foreground">Wähle die Länge deiner Lernsession</p>
          )}
        </div>

        <div className={`space-y-${isYoung ? '4' : '3'}`}>
          {options.map((opt) => {
            const estimatedMinutes = Math.ceil((opt.count * 40) / 60);
            const rewardSeconds = opt.count * secondsPerTask;
            const rewardMinutes = Math.round((rewardSeconds / 60) * 10) / 10;

            if (isYoung) {
              return (
                <Card
                  key={opt.count}
                  className="rounded-2xl border-2 shadow-lg cursor-pointer hover:scale-105 transition-all duration-300"
                  onClick={() => onSelect(opt.count)}
                >
                  <CardContent className="p-6 flex items-center gap-5">
                    <div className="text-5xl">{opt.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{opt.youngLabel}</h3>
                      <p className="text-base text-muted-foreground">{opt.youngDesc}</p>
                      <p className={`text-sm font-semibold mt-1 ${opt.color}`}>
                        +{rewardMinutes} Min Belohnung ⏱️
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={opt.count}
                className="cursor-pointer hover:shadow-card hover:scale-[1.02] transition-all duration-200"
                onClick={() => onSelect(opt.count)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-3xl">{opt.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.count} Fragen</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-muted-foreground">~{estimatedMinutes} Min</span>
                      <span className={opt.color}>bis zu +{rewardMinutes} Min Belohnung</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
