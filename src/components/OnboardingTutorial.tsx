import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Link, Clock, BarChart3, Trophy, Zap, ArrowRight, X } from 'lucide-react';

interface OnboardingTutorialProps {
  role: 'parent' | 'child';
  grade?: number;
  onComplete: () => void;
}

interface Step {
  emoji: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// ── Young children (Klasse 1–4): short text, big emojis ──
const youngChildSteps: Step[] = [
  {
    emoji: '🎉',
    title: 'Hallo!',
    description: 'Hier lernst du und bekommst dafür Handyzeit! 📱',
    icon: <BookOpen className="w-10 h-10" />,
  },
  {
    emoji: '📚',
    title: 'So geht\'s',
    description: 'Fach wählen ➜ Fragen lösen ➜ Zeit verdienen! ⏰',
    icon: <Zap className="w-10 h-10" />,
  },
  {
    emoji: '🏆',
    title: 'Sammle Sterne!',
    description: 'Jeden Tag üben bringt Bonus-Zeit! 🌟',
    icon: <Trophy className="w-10 h-10" />,
  },
  {
    emoji: '🚀',
    title: 'Fertig!',
    description: 'Auf geht\'s – verdiene deine ersten Minuten!',
    icon: <ArrowRight className="w-10 h-10" />,
  },
];

// ── Teens (Klasse 5–10): concise, informative ──
const teenChildSteps: Step[] = [
  {
    emoji: '👋',
    title: 'Willkommen bei LernZeit',
    description: 'Beantworte Fragen in verschiedenen Fächern und verdiene dadurch Bildschirmzeit.',
    icon: <BookOpen className="w-7 h-7" />,
  },
  {
    emoji: '⚡',
    title: 'Fach & Schwierigkeit',
    description: 'Wähle dein Fach, beantworte Fragen und sammle Minuten. Die Schwierigkeit passt sich automatisch an.',
    icon: <Zap className="w-7 h-7" />,
  },
  {
    emoji: '🎯',
    title: 'Streaks & Achievements',
    description: 'Tägliches Üben baut deinen Streak auf. Schalte Achievements frei und verdiene Bonus-Minuten.',
    icon: <Trophy className="w-7 h-7" />,
  },
  {
    emoji: '✅',
    title: 'Bereit?',
    description: 'Starte jetzt deine erste Session.',
    icon: <ArrowRight className="w-7 h-7" />,
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

export function OnboardingTutorial({ role, grade = 5, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isYoung = role === 'child' && grade <= 4;

  const steps =
    role === 'parent'
      ? parentSteps
      : isYoung
      ? youngChildSteps
      : teenChildSteps;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Style tokens based on age group
  const emojiSize = isYoung ? 'text-8xl' : 'text-6xl';
  const titleSize = isYoung ? 'text-2xl' : 'text-xl';
  const descSize = isYoung ? 'text-base' : 'text-sm';
  const dotSize = isYoung ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const dotActive = isYoung ? 'w-8' : 'w-6';
  const buttonSize = isYoung ? 'lg' : 'default';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className={`w-full shadow-2xl border-0 overflow-hidden ${isYoung ? 'max-w-sm rounded-3xl' : 'max-w-md'}`}>
        {/* Skip button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Überspringen"
        >
          <X className={`${isYoung ? 'w-6 h-6' : 'w-5 h-5'} text-muted-foreground`} />
        </button>

        <CardContent className="p-0">
          {/* Top colored section */}
          <div className={`bg-gradient-to-br from-primary/20 to-secondary/20 text-center ${isYoung ? 'p-10' : 'p-8'}`}>
            <div className={`${emojiSize} mb-3 animate-scale-in`}>{step.emoji}</div>
            <div className={`inline-flex items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 ${isYoung ? 'w-16 h-16' : 'w-14 h-14'}`}>
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className={`text-center ${isYoung ? 'p-6 pb-8' : 'p-6'}`}>
            <h2 className={`${titleSize} font-bold mb-3`}>{step.title}</h2>
            <p className={`text-muted-foreground ${descSize} leading-relaxed mb-6`}>
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`${dotSize} rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? `bg-primary ${dotActive}`
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
                  size={buttonSize as any}
                  className="flex-1"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  {isYoung ? '⬅️ Zurück' : 'Zurück'}
                </Button>
              )}
              <Button
                size={buttonSize as any}
                className={`flex-1 ${isYoung ? 'text-lg' : ''}`}
                onClick={() => {
                  if (isLast) {
                    onComplete();
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
              >
                {isLast
                  ? role === 'child'
                    ? isYoung
                      ? '🚀 Los!'
                      : 'Starten'
                    : 'Verstanden!'
                  : isYoung
                  ? 'Weiter ➡️'
                  : 'Weiter'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
