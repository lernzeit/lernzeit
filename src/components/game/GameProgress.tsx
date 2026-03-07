import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import { GameTimer } from './GameTimer';
import { useAgeGroup } from '@/hooks/useAgeGroup';

interface GameProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  startTime: number;
  isActive?: boolean;
  grade?: number;
}

export function GameProgress({ 
  currentQuestion, 
  totalQuestions, 
  score,
  startTime,
  isActive = true,
  grade = 5
}: GameProgressProps) {
  const age = useAgeGroup(grade);
  const isYoung = age.group === 'young';
  const progress = (currentQuestion / totalQuestions) * 100;
  
  return (
    <div className="space-y-2">
      <GameTimer startTime={startTime} isActive={isActive} />
      <div className={`flex items-center justify-between ${isYoung ? 'text-base' : 'text-sm'}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          {isYoung ? (
            <span className="text-lg">⭐ {score}</span>
          ) : (
            <>
              <Trophy className="w-4 h-4" />
              Punkte: {score}
            </>
          )}
        </div>
        <div className={`font-medium ${isYoung ? 'text-lg' : ''}`}>
          {isYoung
            ? `${currentQuestion} von ${totalQuestions}`
            : `${currentQuestion} / ${totalQuestions}`}
        </div>
      </div>
      <Progress value={progress} className={age.progressHeight} />
    </div>
  );
}
