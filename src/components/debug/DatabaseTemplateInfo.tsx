import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseTemplateInfoProps {
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

interface TemplateStats {
  total: number;
  active: number;
  byQuarter: Record<string, number>;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
}

export function DatabaseTemplateInfo({ 
  currentProblem, 
  totalQuestions, 
  globalQuestionsCount,
  sessionId,
  category,
  grade,
  problemsLength,
  currentQuestionType,
  generationSource
}: DatabaseTemplateInfoProps) {
  const [showExtended, setShowExtended] = useState(false);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplateStats();
  }, [category, grade]);

  const loadTemplateStats = async () => {
    try {
      setLoading(true);
      
      // Map category to domain
      const domain = category === 'math' || category === 'mathematik' 
        ? 'Zahlen & Operationen' 
        : category;

      const { data: templates, error } = await supabase
        .from('templates')
        .select('id, domain, grade, grade_app, quarter_app, difficulty, question_type, status')
        .eq('domain', domain)
        .eq('grade', grade)
        .eq('status', 'ACTIVE');

      if (error) {
        console.error('Error loading template stats:', error);
        return;
      }

      const stats: TemplateStats = {
        total: templates?.length || 0,
        active: templates?.filter(t => t.status === 'ACTIVE').length || 0,
        byQuarter: {},
        byDifficulty: {},
        byType: {}
      };

      templates?.forEach(template => {
        // Count by quarter
        const quarter = template.quarter_app || 'Unknown';
        stats.byQuarter[quarter] = (stats.byQuarter[quarter] || 0) + 1;

        // Count by difficulty
        const difficulty = template.difficulty || 'Unknown';
        stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

        // Count by type
        const type = template.question_type || 'Unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      setTemplateStats(stats);
    } catch (error) {
      console.error('Error loading template stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageStatus = (count: number) => {
    if (count >= 200) return { label: 'Excellent', variant: 'default' as const };
    if (count >= 100) return { label: 'Good', variant: 'secondary' as const };
    if (count >= 50) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Low', variant: 'destructive' as const };
  };

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Database Template Info</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowExtended(!showExtended)}
            className="text-xs"
          >
            {showExtended ? 'Less' : 'More'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="text-xs space-y-2">
          {/* Basic Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Q: {currentProblem + 1}/{totalQuestions}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Problems: {problemsLength}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Used: {globalQuestionsCount}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Type: {currentQuestionType || 'Unknown'}
            </Badge>
            {generationSource && (
              <Badge 
                variant={generationSource === 'template' ? 'default' : generationSource === 'ai' ? 'secondary' : 'outline'} 
                className={`text-xs ${
                  generationSource === 'template' 
                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                    : generationSource === 'ai'
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-orange-100 text-orange-800 border-orange-300'
                }`}
              >
                {generationSource === 'template' ? '📋 DB Template' : generationSource === 'ai' ? '🤖 AI' : '⚡ Fallback'}
              </Badge>
            )}
          </div>

          {/* Database Template Coverage */}
          <div className="flex flex-wrap gap-2">
            {loading ? (
              <Badge variant="outline" className="text-xs">Loading...</Badge>
            ) : templateStats ? (
              <>
                <Badge variant="outline" className="text-xs">
                  DB Templates: {templateStats.total}
                </Badge>
                <Badge 
                  variant={getCoverageStatus(templateStats.total).variant}
                  className="text-xs"
                >
                  Coverage: {getCoverageStatus(templateStats.total).label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Source: Database
                </Badge>
              </>
            ) : (
              <Badge variant="destructive" className="text-xs">
                ❌ Load Error
              </Badge>
            )}
          </div>

          {/* Session Info */}
          <div className="text-muted-foreground">
            Session: {sessionId.substring(0, 12)}... | {category} Grade {grade}
          </div>

          {/* Extended Info */}
          {showExtended && templateStats && (
            <div className="mt-3 space-y-2 border-t pt-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold mb-1">By Quarter:</div>
                  {Object.entries(templateStats.byQuarter).map(([quarter, count]) => (
                    <div key={quarter}>{quarter}: {count}</div>
                  ))}
                </div>
                <div>
                  <div className="font-semibold mb-1">By Difficulty:</div>
                  {Object.entries(templateStats.byDifficulty).map(([diff, count]) => (
                    <div key={diff}>{diff}: {count}</div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold mb-1 text-xs">Question Types:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(templateStats.byType).map(([type, count]) => (
                    <div key={type}>{type}: {count}</div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div className="bg-muted/50 p-2 rounded text-xs">
                <div className="font-semibold mb-1">Database Status:</div>
                <div>📊 Total Templates: {templateStats.total}</div>
                <div>✅ Active Templates: {templateStats.active}</div>
                <div>⚡ Source: {generationSource === 'template' ? 'Database (optimal)' : generationSource === 'ai' ? 'AI fallback' : 'Simple fallback'}</div>
                <div>🎯 Coverage: {templateStats.total >= 200 ? 'Excellent' : templateStats.total >= 50 ? 'Good' : 'Needs improvement'}</div>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 p-2 rounded text-xs">
                <div className="font-semibold mb-1">Recommendations:</div>
                {templateStats.total < 200 && (
                  <div className="text-blue-700">• Generate more templates for better coverage</div>
                )}
                {Object.keys(templateStats.byQuarter).length < 4 && (
                  <div className="text-blue-700">• Add templates for missing quarters</div>
                )}
                {Object.keys(templateStats.byDifficulty).length < 3 && (
                  <div className="text-blue-700">• Improve difficulty distribution</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}