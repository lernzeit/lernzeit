import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { triggerCombo } from '@/utils/confetti';

interface StreakAnimationProps {
  newStreak: number;
  onClose: () => void;
}

export function StreakAnimation({ newStreak, onClose }: StreakAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'count' | 'message' | 'exit'>('enter');
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    triggerCombo();

    // Phase 1: Enter (scale in)
    const enterTimer = setTimeout(() => setPhase('count'), 400);

    // Phase 2: Count up to streak number
    const countTimer = setTimeout(() => {
      let current = 0;
      const step = Math.max(1, Math.floor(newStreak / 8));
      const interval = setInterval(() => {
        current = Math.min(current + step, newStreak);
        setDisplayCount(current);
        if (current >= newStreak) {
          clearInterval(interval);
          setPhase('message');
        }
      }, 80);
    }, 500);

    // Phase 3: Show motivational message, then exit
    const exitTimer = setTimeout(() => setPhase('exit'), 3500);
    const closeTimer = setTimeout(onClose, 4200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(countTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [newStreak, onClose]);

  const getMessage = () => {
    if (newStreak >= 30) return '🏆 Legendär! Einen Monat am Stück!';
    if (newStreak >= 14) return '💎 Zwei Wochen Streak – unglaublich!';
    if (newStreak >= 7) return '⭐ Eine ganze Woche – mega!';
    if (newStreak >= 5) return '🔥 5 Tage! Du bist unstoppbar!';
    if (newStreak >= 3) return '💪 3 Tage am Stück – weiter so!';
    return '🎯 Streak gestartet – bleib dran!';
  };

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${
          phase === 'exit' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Main content */}
      <div
        className={`relative flex flex-col items-center gap-3 transition-all duration-500 ${
          phase === 'enter'
            ? 'scale-50 opacity-0'
            : phase === 'exit'
            ? 'scale-150 opacity-0'
            : 'scale-100 opacity-100'
        }`}
      >
        {/* Fire ring */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center animate-pulse shadow-2xl">
            <div className="w-24 h-24 rounded-full bg-background/90 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Flame className="w-8 h-8 text-orange-500 animate-bounce" />
                <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                  {displayCount}
                </span>
              </div>
            </div>
          </div>

          {/* Floating fire emojis */}
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute text-2xl animate-float-up"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${10 + Math.random() * 40}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s',
              }}
            >
              🔥
            </span>
          ))}
        </div>

        {/* Streak label */}
        <div className="text-lg font-bold text-white drop-shadow-lg">
          Tage-Streak!
        </div>

        {/* Motivational message */}
        {(phase === 'message' || phase === 'exit') && (
          <div
            className="px-6 py-3 rounded-2xl bg-black/70 text-white font-semibold text-center text-sm md:text-base animate-scale-in-bounce shadow-2xl max-w-xs"
          >
            {getMessage()}
            <div className="text-xs text-white/70 mt-1">
              Jeden Tag lernen zahlt sich aus!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
