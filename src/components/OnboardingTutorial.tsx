import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Link, Clock, BarChart3, Trophy, Zap, ArrowRight, X } from 'lucide-react';

interface OnboardingTutorialProps {
  role: 'parent' | 'child';
  onComplete: () => void;
}

interface Step {
  emoji: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const childSteps: Step[] = [
  {
    emoji: '🎉',
    title: 'Willkommen bei LernZeit!',
    description: 'Hier lernst du spielerisch und verdienst dabei echte Handyzeit. Je mehr du übst, desto mehr Zeit bekommst du!',
    icon: <BookOpen className="w-8 h-8" />,
  },
  {
    emoji: '📚',
    title: 'So funktioniert\'s',
    description: 'Wähle ein Fach → Beantworte Fragen → Verdiene für jede richtige Antwort Handyzeit! Du bekommst verschiedene Fragetypen.',
    icon: <Zap className="w-8 h-8" />,
  },
  {
    emoji: '🏆',
    title: 'Deine Erfolge',
    description: 'Sammle Streaks, schalte Achievements frei und klettere nach oben! Tägliches Üben bringt dir Bonus-Belohnungen.',
    icon: <Trophy className="w-8 h-8" />,
  },
  {
    emoji: '🚀',
    title: 'Los geht\'s!',
    description: 'Du bist startklar! Wähle gleich ein Fach und verdiene deine ersten Minuten Handyzeit.',
    icon: <ArrowRight className="w-8 h-8" />,
  },
];

const parentSteps: Step[] = [
  {
    emoji: '👋',
    title: 'Willkommen bei LernZeit!',
    description: 'Mit LernZeit lernt Ihr Kind spielerisch und verdient sich dabei kontrollierte Bildschirmzeit. Sie behalten den vollen Überblick.',
    icon: <BookOpen className="w-8 h-8" />,
  },
  {
    emoji: '🔗',
    title: 'Kind verknüpfen',
    description: 'Generieren Sie einen Einladungscode und geben Sie ihn an Ihr Kind weiter. So verknüpfen Sie die Konten und behalten die Kontrolle.',
    icon: <Link className="w-8 h-8" />,
  },
  {
    emoji: '⏰',
    title: 'Bildschirmzeit verwalten',
    description: 'Legen Sie Tageslimits fest, genehmigen Sie Zeitanfragen und passen Sie die verdienten Minuten pro Fach individuell an.',
    icon: <Clock className="w-8 h-8" />,
  },
  {
    emoji: '📊',
    title: 'Lernfortschritte verfolgen',
    description: 'Im Analyse-Dashboard sehen Sie genau, in welchen Fächern Ihr Kind Fortschritte macht und wo es Unterstützung braucht.',
    icon: <BarChart3 className="w-8 h-8" />,
  },
];

export function OnboardingTutorial({ role, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = role === 'child' ? childSteps : parentSteps;
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Skip button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Überspringen"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <CardContent className="p-0">
          {/* Top colored section */}
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-8 text-center">
            <div className="text-6xl mb-3 animate-scale-in">{step.emoji}</div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-primary w-6'
                      : i < currentStep
                      ? 'bg-primary/40'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Zurück
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => {
                  if (isLast) {
                    onComplete();
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
              >
                {isLast ? (role === 'child' ? '🚀 Los geht\'s!' : 'Verstanden!') : 'Weiter'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
