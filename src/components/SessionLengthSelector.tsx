import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, BookOpen, Trophy } from 'lucide-react';

interface SessionLengthSelectorProps {
  subject: string;
  secondsPerTask: number;
  onSelect: (count: number) => void;
  onBack: () => void;
}

const options = [
  {
    count: 5,
    label: 'Schnell',
    emoji: '⚡',
    icon: Zap,
    description: 'Ideal für zwischendurch',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    count: 10,
    label: 'Normal',
    emoji: '📚',
    icon: BookOpen,
    description: 'Gute Lerneinheit',
    color: 'text-primary',
  },
  {
    count: 15,
    label: 'Marathon',
    emoji: '🏆',
    icon: Trophy,
    description: 'Für Lern-Champions',
    color: 'text-purple-600 dark:text-purple-400',
  },
];

export function SessionLengthSelector({
  subject,
  secondsPerTask,
  onSelect,
  onBack,
}: SessionLengthSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-bg py-4">
      <div className="page-container max-w-lg mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-1">Wie viele Aufgaben?</h2>
          <p className="text-sm text-muted-foreground">
            Wähle die Länge deiner Lernsession
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => {
            const estimatedSeconds = opt.count * 40; // ~40s per question avg
            const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
            const rewardSeconds = opt.count * secondsPerTask;
            const rewardMinutes = Math.round((rewardSeconds / 60) * 10) / 10;

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
                      <span className="text-xs text-muted-foreground">
                        {opt.count} Fragen
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        ~{estimatedMinutes} Min
                      </span>
                      <span className={opt.color}>
                        bis zu +{rewardMinutes} Min Belohnung
                      </span>
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
