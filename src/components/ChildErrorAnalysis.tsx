import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingDown, BookOpen, Clock } from 'lucide-react';

interface ChildErrorAnalysisProps {
  childId: string;
  childName: string;
}

interface ErrorStats {
  questionType: string;
  totalQuestions: number;
  incorrectAnswers: number;
  errorRate: number;
  category: string;
}

interface DifficultyStats {
  category: string;
  currentLevel: number;
  masteryScore: number;
  weaknesses: string[];
  strengths: string[];
}

export function ChildErrorAnalysis({ childId, childName }: ChildErrorAnalysisProps) {
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [difficultyStats, setDifficultyStats] = useState<DifficultyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrorAnalysis();
  }, [childId]);

  const loadErrorAnalysis = async () => {
    try {
      setLoading(true);

      // Load game sessions for error analysis
      const { data: sessions, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', childId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        return;
      }

      // Load difficulty profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_difficulty_profiles')
        .select('*')
        .eq('user_id', childId);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      } else if (profiles) {
        setDifficultyStats(profiles.map(p => ({
          category: p.category,
          currentLevel: p.current_level,
          masteryScore: p.mastery_score,
          weaknesses: p.weaknesses || [],
          strengths: p.strengths || []
        })));
      }

      // Calculate error statistics by category and question type
      if (sessions && sessions.length > 0) {
        const statsMap = new Map<string, {
          total: number;
          incorrect: number;
          category: string;
        }>();

        sessions.forEach(session => {
          const key = `${session.category}_${session.question_source || 'standard'}`;
          const existing = statsMap.get(key) || { total: 0, incorrect: 0, category: session.category };
          
          existing.total += session.total_questions;
          existing.incorrect += (session.total_questions - session.correct_answers);
          
          statsMap.set(key, existing);
        });

        const stats: ErrorStats[] = Array.from(statsMap.entries())
          .map(([key, data]) => ({
            questionType: key.split('_')[1] || 'standard',
            category: data.category,
            totalQuestions: data.total,
            incorrectAnswers: data.incorrect,
            errorRate: data.total > 0 ? (data.incorrect / data.total) * 100 : 0
          }))
          .filter(stat => stat.totalQuestions >= 3) // Only show if enough data
          .sort((a, b) => b.errorRate - a.errorRate);

        setErrorStats(stats);
      }
    } catch (error) {
      console.error('Error loading error analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorBadgeColor = (errorRate: number): "destructive" | "secondary" | "outline" => {
    if (errorRate >= 60) return "destructive";
    if (errorRate >= 40) return "secondary";
    return "outline";
  };

  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'math': 'Mathematik',
      'mathematik': 'Mathematik',
      'german': 'Deutsch',
      'deutsch': 'Deutsch',
      'english': 'Englisch',
      'geography': 'Geografie',
      'history': 'Geschichte',
      'physics': 'Physik',
      'biology': 'Biologie',
      'chemistry': 'Chemie'
    };
    return categoryMap[category.toLowerCase()] || category;
  };

  const getQuestionTypeDisplayName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'multiple-choice': 'Multiple Choice',
      'text-input': 'Texteingabe',
      'matching': 'Zuordnung',
      'word-selection': 'Wortauswahl',
      'template-bank': 'Template Bank',
      'enhanced': 'Erweitert',
      'standard': 'Standard'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fehleranalyse für {childName}
          </CardTitle>
          <CardDescription>Lade Daten...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fehleranalyse für {childName}
          </CardTitle>
          <CardDescription>
            Übersicht über Fehlerschwerpunkte und Lernschwierigkeiten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Höchste Fehlerquoten nach Fragetyp */}
          {errorStats.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Höchste Fehlerquoten nach Fragetyp
              </h4>
              <div className="space-y-3">
                {errorStats.slice(0, 5).map((stat, index) => (
                  <div key={`${stat.category}_${stat.questionType}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {getCategoryDisplayName(stat.category)} - {getQuestionTypeDisplayName(stat.questionType)}
                        </span>
                        <Badge variant={getErrorBadgeColor(stat.errorRate)}>
                          {stat.errorRate.toFixed(1)}% Fehlerquote
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.incorrectAnswers} von {stat.totalQuestions} Fragen falsch beantwortet
                      </div>
                      <Progress value={stat.errorRate} className="h-2 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Noch nicht genügend Daten für eine Fehleranalyse verfügbar.</p>
              <p className="text-sm">Das Kind sollte mindestens 3 Fragen pro Kategorie beantworten.</p>
            </div>
          )}

          {/* Schwierigkeitsprofile und Schwächen */}
          {difficultyStats.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Adaptives Lernniveau und Schwächen
              </h4>
              <div className="grid gap-3">
                {difficultyStats.map((diff) => (
                  <div key={diff.category} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{getCategoryDisplayName(diff.category)}</span>
                      <Badge variant="outline">
                        Niveau: {Math.round(diff.currentLevel * 100)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Meisterschaft: {Math.round(diff.masteryScore * 100)}%
                        </div>
                        <Progress value={diff.masteryScore * 100} className="h-2" />
                      </div>
                      
                      {diff.weaknesses.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-destructive mb-1">Schwächen:</div>
                          <div className="flex flex-wrap gap-1">
                            {diff.weaknesses.map((weakness, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {weakness}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {diff.strengths.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-green-600 mb-1">Stärken:</div>
                          <div className="flex flex-wrap gap-1">
                            {diff.strengths.map((strength, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-green-200 text-green-700">
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}