import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Zap
} from 'lucide-react';

interface ChildLearningAnalysisProps {
  childId: string;
  childName: string;
}

interface SubjectStats {
  subject: string;
  displayName: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
  avgTimePerQuestion: number;
  sessionCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface OverviewStats {
  totalQuestions: number;
  totalCorrect: number;
  overallSuccessRate: number;
  avgTimePerQuestion: number;
  strongestSubject: string | null;
  weakestSubject: string | null;
  totalLearningTime: number;
}

const SUBJECT_DISPLAY_NAMES: Record<string, string> = {
  'math': 'Mathematik',
  'mathematik': 'Mathematik',
  'german': 'Deutsch',
  'deutsch': 'Deutsch',
  'english': 'Englisch',
  'englisch': 'Englisch',
  'geography': 'Erdkunde',
  'history': 'Geschichte',
  'physics': 'Physik',
  'biology': 'Biologie',
  'chemistry': 'Chemie',
  'latin': 'Latein'
};

// Normalisiert Kategorien (math und mathematik werden zusammengefasst)
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower === 'mathematik') return 'math';
  if (lower === 'englisch') return 'english';
  return lower;
}

export function ChildLearningAnalysis({ childId, childName }: ChildLearningAnalysisProps) {
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [childId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);

      // Lade alle Sessions des Kindes
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('category, total_questions, correct_answers, time_spent, created_at')
        .eq('user_id', childId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      // Aggregiere Daten pro Fach (normalisiert)
      const statsMap = new Map<string, {
        totalQuestions: number;
        correctAnswers: number;
        totalTime: number;
        sessionCount: number;
        recentCorrect: number;
        recentTotal: number;
        olderCorrect: number;
        olderTotal: number;
      }>();

      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      sessions.forEach(session => {
        if (!session.category) return;
        
        const normalizedCategory = normalizeCategory(session.category);
        const existing = statsMap.get(normalizedCategory) || {
          totalQuestions: 0,
          correctAnswers: 0,
          totalTime: 0,
          sessionCount: 0,
          recentCorrect: 0,
          recentTotal: 0,
          olderCorrect: 0,
          olderTotal: 0
        };

        existing.totalQuestions += session.total_questions;
        existing.correctAnswers += session.correct_answers;
        existing.totalTime += session.time_spent || 0;
        existing.sessionCount += 1;

        // Trend-Berechnung: Vergleiche letzte 2 Wochen mit davor
        const sessionDate = new Date(session.created_at || now);
        if (sessionDate >= twoWeeksAgo) {
          existing.recentCorrect += session.correct_answers;
          existing.recentTotal += session.total_questions;
        } else {
          existing.olderCorrect += session.correct_answers;
          existing.olderTotal += session.total_questions;
        }

        statsMap.set(normalizedCategory, existing);
      });

      // Berechne Statistiken pro Fach
      const stats: SubjectStats[] = [];
      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalTime = 0;

      statsMap.forEach((data, category) => {
        const successRate = data.totalQuestions > 0 
          ? (data.correctAnswers / data.totalQuestions) * 100 
          : 0;
        
        const avgTime = data.totalQuestions > 0 
          ? data.totalTime / data.totalQuestions 
          : 0;

        // Trend berechnen
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (data.recentTotal >= 5 && data.olderTotal >= 5) {
          const recentRate = data.recentCorrect / data.recentTotal;
          const olderRate = data.olderCorrect / data.olderTotal;
          if (recentRate > olderRate + 0.05) trend = 'improving';
          else if (recentRate < olderRate - 0.05) trend = 'declining';
        }

        stats.push({
          subject: category,
          displayName: SUBJECT_DISPLAY_NAMES[category] || category,
          totalQuestions: data.totalQuestions,
          correctAnswers: data.correctAnswers,
          successRate,
          avgTimePerQuestion: avgTime,
          sessionCount: data.sessionCount,
          trend
        });

        totalQuestions += data.totalQuestions;
        totalCorrect += data.correctAnswers;
        totalTime += data.totalTime;
      });

      // Sortiere nach Anzahl Fragen (meistgeübte zuerst)
      stats.sort((a, b) => b.totalQuestions - a.totalQuestions);

      // Finde stärkstes und schwächstes Fach (mind. 10 Fragen)
      const significantStats = stats.filter(s => s.totalQuestions >= 10);
      const strongest = significantStats.reduce((best, curr) => 
        curr.successRate > (best?.successRate ?? 0) ? curr : best, null as SubjectStats | null);
      const weakest = significantStats.reduce((worst, curr) => 
        curr.successRate < (worst?.successRate ?? 100) ? curr : worst, null as SubjectStats | null);

      setSubjectStats(stats);
      setOverview({
        totalQuestions,
        totalCorrect,
        overallSuccessRate: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
        avgTimePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
        strongestSubject: strongest?.displayName || null,
        weakestSubject: weakest?.displayName || null,
        totalLearningTime: totalTime
      });

    } catch (error) {
      console.error('Fehler bei der Analyse:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)} Sek.`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} Min.`;
  };

  const formatLearningTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)} Sekunden`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} Minuten`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} Std. ${minutes} Min.`;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getSuccessRateBadge = (rate: number): { variant: "default" | "secondary" | "destructive" | "outline", label: string } => {
    if (rate >= 85) return { variant: "default", label: "Sehr gut" };
    if (rate >= 70) return { variant: "secondary", label: "Gut" };
    if (rate >= 50) return { variant: "outline", label: "Ausbaufähig" };
    return { variant: "destructive", label: "Übungsbedarf" };
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lernanalyse für {childName}
          </CardTitle>
          <CardDescription>Lade Daten...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!overview || subjectStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lernanalyse für {childName}
          </CardTitle>
          <CardDescription>
            Noch keine Lerndaten vorhanden. Sobald {childName} Aufgaben bearbeitet, erscheint hier die Analyse.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Übersichtskarte */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lernanalyse für {childName}
          </CardTitle>
          <CardDescription>
            Gesamtübersicht über den Lernfortschritt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{overview.totalQuestions}</div>
              <div className="text-xs text-muted-foreground">Aufgaben gelöst</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className={`text-2xl font-bold ${getSuccessRateColor(overview.overallSuccessRate)}`}>
                {Math.round(overview.overallSuccessRate)}%
              </div>
              <div className="text-xs text-muted-foreground">Richtig beantwortet</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{formatTime(overview.avgTimePerQuestion)}</div>
              <div className="text-xs text-muted-foreground">Ø pro Aufgabe</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{formatLearningTime(overview.totalLearningTime)}</div>
              <div className="text-xs text-muted-foreground">Gesamte Lernzeit</div>
            </div>
          </div>

          {/* Stärken & Schwächen Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.strongestSubject && (
              <div className="flex items-center gap-3 p-3 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Stärkstes Fach</div>
                  <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {overview.strongestSubject}
                  </div>
                </div>
              </div>
            )}
            {overview.weakestSubject && overview.weakestSubject !== overview.strongestSubject && (
              <div className="flex items-center gap-3 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg">
                <Target className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-medium">Mehr Übung empfohlen</div>
                  <div className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                    {overview.weakestSubject}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailanalyse pro Fach */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Leistung nach Fachbereichen</CardTitle>
          <CardDescription>
            Detaillierte Aufschlüsselung der Ergebnisse pro Fach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectStats.map((stat) => {
            const badge = getSuccessRateBadge(stat.successRate);
            const errorCount = stat.totalQuestions - stat.correctAnswers;
            
            return (
              <div key={stat.subject} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{stat.displayName}</span>
                    {getTrendIcon(stat.trend)}
                    {stat.trend === 'improving' && (
                      <span className="text-xs text-green-600">Verbessert sich</span>
                    )}
                    {stat.trend === 'declining' && (
                      <span className="text-xs text-red-600">Braucht mehr Übung</span>
                    )}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                {/* Erfolgsquote */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {stat.correctAnswers} von {stat.totalQuestions} richtig
                    </span>
                    <span className={`font-medium ${getSuccessRateColor(stat.successRate)}`}>
                      {Math.round(stat.successRate)}%
                    </span>
                  </div>
                  <Progress 
                    value={stat.successRate} 
                    className="h-2"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{errorCount} Fehler</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Ø {formatTime(stat.avgTimePerQuestion)} pro Aufgabe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    <span>{stat.sessionCount} Übungseinheiten</span>
                  </div>
                </div>

                {/* Hinweise bei Problemen */}
                {stat.successRate < 60 && stat.totalQuestions >= 10 && (
                  <div className="text-sm p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">
                    💡 Tipp: In diesem Fach gibt es viele Fehler. Vielleicht hilft es, die Grundlagen noch einmal zu wiederholen.
                  </div>
                )}
                {stat.avgTimePerQuestion > 30 && stat.totalQuestions >= 10 && (
                  <div className="text-sm p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-blue-800 dark:text-blue-300">
                    ⏱️ Die Bearbeitungszeit ist relativ lang. Mit mehr Übung wird {childName} schneller.
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
