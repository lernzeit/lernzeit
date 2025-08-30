
import React from 'react';
import { DatabaseTemplateInfo } from '@/components/debug/DatabaseTemplateInfo';

interface DebugInfoProps {
  currentProblem: number;
  totalQuestions: number;
  globalQuestionsCount: number;
  sessionId: string;
  category: string;
  grade: number;
  problemsLength: number;
  currentQuestionType?: string;
  generationSource?: 'template' | 'ai' | 'fallback' | null;
}

export function DebugInfo({ 
  currentProblem, 
  totalQuestions, 
  globalQuestionsCount,
  sessionId,
  category,
  grade,
  problemsLength,
  currentQuestionType,
  generationSource
}: DebugInfoProps) {
  return (
    <DatabaseTemplateInfo
      currentProblem={currentProblem}
      totalQuestions={totalQuestions}
      globalQuestionsCount={globalQuestionsCount}
      sessionId={sessionId}
      category={category}
      grade={grade}
      problemsLength={problemsLength}
      currentQuestionType={currentQuestionType}
      generationSource={generationSource}
    />
  );
}
