import React, { useEffect, useState } from 'react';

export type AnimationType = 'speed' | 'combo' | 'perfect' | 'correct';

interface InGameAnimationProps {
  type: AnimationType;
  message: string;
  onComplete: () => void;
}

const emojis: Record<AnimationType, string[]> = {
  speed: ['⚡', '🦄', '💨', '🔥'],
  combo: ['🔥', '💥', '⭐', '🎯'],
  perfect: ['🌈', '🎆', '🦄', '⭐', '🏆'],
  correct: ['✨', '⭐'],
};

// Markenfarben: Tempo Bernstein, Serien Blau, richtig Gruen (Kontrast fuer grosse Schrift)
const FARBE: Record<AnimationType, string> = {
  speed: 'bg-amber-400 text-amber-950',
  combo: 'bg-primary text-primary-foreground',
  perfect: 'bg-amber-400 text-amber-950',
  correct: 'bg-emerald-600 text-white',
};

export function InGameAnimation({ type, message, onComplete }: InGameAnimationProps) {
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number; y: number; delay: number }[]>([]);
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const icons = emojis[type];
    const count = type === 'correct' ? 4 : type === 'speed' ? 8 : 12;
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: icons[i % icons.length],
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 10,
      delay: Math.random() * 0.4,
    }));
    setParticles(generated);

    const duration = type === 'correct' ? 1200 : 2000;
    const timeout = setTimeout(() => onCompleteRef.current(), duration);
    // Safety fallback: force dismiss after max 3s no matter what
    const safetyTimeout = setTimeout(() => onCompleteRef.current(), 3000);
    return () => {
      clearTimeout(timeout);
      clearTimeout(safetyTimeout);
    };
  }, [type]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Floating emojis */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl md:text-4xl animate-float-up"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: type === 'correct' ? '1s' : '1.5s',
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* Meldung oben statt in der Mitte: In der Mitte lag sie zwei Sekunden lang
          ueber dem Knopf "Weiter". Oben steht nur die schon beantwortete Aufgabe. */}
      <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' }}>
        <div
          className={`px-5 py-2.5 rounded-full font-bold text-lg md:text-xl animate-scale-in-bounce shadow-lg ${FARBE[type]}`}
          style={{ animationDuration: '0.4s' }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
