
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Palette, Calculator } from 'lucide-react';

interface QuestionGenerationInfoProps {
  generationSource: 'ai' | 'template' | 'simple' | 'database' | 'hybrid' | 'template-bank' | 'knowledge-generated' | 'legacy-fallback' | null;
  isGenerating: boolean;
}

export function QuestionGenerationInfo({ generationSource, isGenerating }: QuestionGenerationInfoProps) {
  if (isGenerating) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        Generiere Fragen...
      </div>
    );
  }

  const getSourceInfo = () => {
    switch (generationSource) {
      case 'ai':
        return {
          icon: <Bot className="h-4 w-4" />,
          label: 'Intelligente Fragen',
          description: 'Adaptiv und lehrreich',
          color: 'bg-green-500'
        };
      case 'template':
        return {
          icon: <Palette className="h-4 w-4" />,
          label: 'Template-basiert',
          description: 'Abwechslungsreiche Fragetypen',
          color: 'bg-blue-500'
        };
      case 'simple':
        return {
          icon: <Calculator className="h-4 w-4" />,
          label: 'Grundrechenaufgaben',
          description: 'Einfache Mathematik',
          color: 'bg-orange-500'
        };
      default:
        return null;
    }
  };

  const sourceInfo = getSourceInfo();
  
  if (!sourceInfo) return null;

  return null; // Badges are hidden as requested
}
