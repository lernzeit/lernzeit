import React from 'react';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';

interface DailyChallengeProps {
  userId: string;
}

export function DailyChallenge({ userId }: DailyChallengeProps) {
  const { challenge, loading, getDescription, getTitle } = useDailyChallenge(userId);

  if (loading || !challenge) return null;

  const isCompleted = challenge.is_completed;

  // Als Notiz auf Karo, wie eine Aufgabe der Lehrerin (App-Redesign)
  return (
    <div className="heft-karo flex items-start gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-inset ring-karo">
      {isCompleted ? (
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-gruen-text" />
      ) : (
        <span className="tabular mt-0.5 shrink-0 rounded-full bg-gruen-hell/15 px-2 py-0.5 text-xs font-extrabold text-gruen-text">
          +{challenge.reward_minutes} Min.
        </span>
      )}
      <p className={cn('font-hand text-[0.95rem] leading-snug text-tinte', isCompleted && 'text-muted-foreground line-through decoration-gruen-hell decoration-2')}>
        <span className="sr-only">{getTitle()}: </span>
        Heute: {getDescription()}
      </p>
    </div>
  );
}
