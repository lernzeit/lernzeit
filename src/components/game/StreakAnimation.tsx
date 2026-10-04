import { useEffect, useState } from 'react';
import { PflanzenBild, STUFEN, stufeFuer } from '@/components/child/LernPflanze';

interface StreakAnimationProps {
  newStreak: number;
  onClose: () => void;
}

/**
 * Die Lernpflanze waechst (App-Redesign, statt Feuer-Animation): erscheint am
 * Rundenende, wenn heute der erste Lerntag in Folge dazukam. Bei einer neuen
 * Stufe zeigt sie den Namen der Stufe.
 */
export function StreakAnimation({ newStreak, onClose }: StreakAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'zeigen' | 'exit'>('enter');

  useEffect(() => {
    const a = setTimeout(() => setPhase('zeigen'), 60);
    const b = setTimeout(() => setPhase('exit'), 3200);
    const c = setTimeout(onClose, 3700);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, [newStreak, onClose]);

  const stufe = stufeFuer(newStreak);
  const neueStufe = STUFEN.some((s) => s.ab === newStreak && s.ab > 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className={`absolute inset-0 bg-tinte/40 transition-opacity duration-500 ${phase === 'zeigen' ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`heft-karo relative flex w-full max-w-xs flex-col items-center rounded-[28px] bg-card px-6 pb-6 pt-4 text-center shadow-2xl transition-all duration-500 ${
          phase === 'zeigen' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <PflanzenBild stufe={stufe.id} className="h-32 w-32" />
        <p className="tabular text-3xl font-extrabold text-tinte">
          {newStreak} {newStreak === 1 ? 'Tag' : 'Tage'}
        </p>
        <p className="mt-1 font-hand text-lg text-gruen-text">
          {neueStufe ? `Deine Pflanze ist jetzt: ${stufe.name}!` : 'Deine Lernpflanze wächst.'}
        </p>
      </div>
    </div>
  );
}
