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

      {/* Center message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="px-6 py-3 rounded-2xl bg-black/70 text-white font-bold text-lg md:text-2xl animate-scale-in-bounce shadow-2xl"
          style={{ animationDuration: '0.4s' }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
