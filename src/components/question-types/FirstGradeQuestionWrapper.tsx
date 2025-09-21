import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface FirstGradeQuestionWrapperProps {
  children: React.ReactNode;
  questionText: string;
  onReportProblem?: () => void;
}

/**
 * Wrapper component for first-grade questions with enhanced UI and problem reporting
 */
export const FirstGradeQuestionWrapper: React.FC<FirstGradeQuestionWrapperProps> = ({
  children,
  questionText,
  onReportProblem
}) => {
  return (
    <div className="first-grade-question-wrapper p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border-2 border-primary/20">
      {/* Enhanced question text for first graders */}
      <div className="question-text-container mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 leading-tight">
          {questionText}
        </h2>
        
        {/* Visual separator */}
        <div className="w-16 h-1 bg-primary/30 rounded-full mb-4"></div>
      </div>

      {/* Question content */}
      <div className="question-content mb-6">
        {children}
      </div>

      {/* Problem reporting button - always visible for first graders */}
      {onReportProblem && (
        <div className="flex justify-center mt-6 pt-4 border-t border-primary/10">
          <Button
            variant="outline"
            size="sm"
            onClick={onReportProblem}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Problem melden
          </Button>
        </div>
      )}
    </div>
  );
};