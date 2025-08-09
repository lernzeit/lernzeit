import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import IntelligentQualityDashboard from "@/components/IntelligentQualityDashboard";

interface QualityDashboardModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function QualityDashboardModal({ isOpen, onOpenChange, userId }: QualityDashboardModalProps) {
  // Minimal integration: start with empty questions; component can analyze when provided
  const questions: any[] = [];
  const defaultCategory = "math";
  const defaultGrade = 4;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Intelligentes Qualitäts-Dashboard</DialogTitle>
          <DialogDescription>
            Analysiert und optimiert Fragenqualität. (Vorab-Integration)
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <IntelligentQualityDashboard
            questions={questions as any}
            category={defaultCategory}
            grade={defaultGrade}
            userId={userId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
