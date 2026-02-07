import React, { useEffect, useState, useMemo } from 'react';
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
  Zap,
  Lightbulb
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChildLearningAnalysisProps {
  childId: string;
  childName: string;
  childGrade?: number;
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
  errorCount: number;
}

interface WeeklyData {
  week: string;
  successRate: number;
  questions: number;
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

// Lernempfehlungen basierend auf Klassenstufe und Fach
const LEARNING_RECOMMENDATIONS: Record<string, Record<number, string[]>> = {
  'math': {
    1: ['Zählen und Mengen erfassen', 'Plus und Minus im Zahlenraum bis 10', 'Formen erkennen'],
    2: ['Einmaleins der 2er, 5er und 10er-Reihen', 'Addition und Subtraktion bis 100', 'Uhrzeit lesen'],
    3: ['Alle Einmaleins-Reihen üben', 'Schriftliche Addition und Subtraktion', 'Längen und Gewichte'],
    4: ['Schriftliche Multiplikation und Division', 'Brüche als Teile eines Ganzen', 'Flächenberechnung'],
    5: ['Bruchrechnung vertiefen', 'Negative Zahlen verstehen', 'Proportionalität'],
    6: ['Prozentrechnung üben', 'Geometrie: Kreisberechnung', 'Rationale Zahlen'],
    7: ['Lineare Gleichungen lösen', 'Zinsrechnung', 'Dreiecksberechnungen'],
    8: ['Lineare Funktionen zeichnen', 'Ähnlichkeit und Strahlensätze', 'Wahrscheinlichkeit'],
    9: ['Satz des Pythagoras anwenden', 'Quadratische Gleichungen', 'Trigonometrie'],
    10: ['Exponentialfunktionen', 'Quadratische Funktionen', 'Statistik vertiefen']
  },
  'german': {
    1: ['Buchstaben und Laute üben', 'Erste Wörter lesen', 'Silben klatschen'],
    2: ['Rechtschreibregeln üben', 'Sätze bilden', 'Geschichten lesen'],
    3: ['Wortarten unterscheiden', 'Groß- und Kleinschreibung', 'Aufsätze schreiben'],
    4: ['Satzglieder bestimmen', 'Zeichensetzung üben', 'Texte zusammenfassen'],
    5: ['Grammatik vertiefen', 'Berichte schreiben', 'Textanalyse üben'],
    6: ['Erörterungen schreiben', 'Literatur analysieren', 'Kommasetzung'],
    7: ['Argumentieren üben', 'Balladen verstehen', 'Konjunktiv anwenden'],
    8: ['Sachtexte analysieren', 'Bewerbungen schreiben', 'Stilmittel erkennen'],
    9: ['Dramenanalyse', 'Erörterungen strukturieren', 'Zitiertechniken'],
    10: ['Lyrikanalyse', 'Komplexe Sachtexte', 'Prüfungsvorbereitung']
  }
};

function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower === 'mathematik') return 'math';
  if (lower === 'englisch') return 'english';
  return lower;
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `KW ${weekNumber}`;
}

export function ChildLearningAnalysis({ childId, childName, childGrade = 4 }: ChildLearningAnalysisProps) {
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [childId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);

      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('category, total_questions, correct_answers, time_spent, created_at')
        .eq('user_id', childId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      // Aggregiere Daten pro Fach
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

      // Wöchentliche Daten für Diagramm
      const weeklyMap = new Map<string, { correct: number; total: number }>();

      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

      sessions.forEach(session => {
        if (!session.category) return;
        
        const sessionDate = new Date(session.created_at || now);
        const normalizedCategory = normalizeCategory(session.category);
        
        // Fach-Statistiken
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

        if (sessionDate >= twoWeeksAgo) {
          existing.recentCorrect += session.correct_answers;
          existing.recentTotal += session.total_questions;
        } else {
          existing.olderCorrect += session.correct_answers;
          existing.olderTotal += session.total_questions;
        }

        statsMap.set(normalizedCategory, existing);

        // Wöchentliche Daten (letzte 8 Wochen)
        if (sessionDate >= eightWeeksAgo) {
          const weekKey = getWeekKey(sessionDate);
          const weekData = weeklyMap.get(weekKey) || { correct: 0, total: 0 };
          weekData.correct += session.correct_answers;
          weekData.total += session.total_questions;
          weeklyMap.set(weekKey, weekData);
        }
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
          trend,
          errorCount: data.totalQuestions - data.correctAnswers
        });

        totalQuestions += data.totalQuestions;
        totalCorrect += data.correctAnswers;
        totalTime += data.totalTime;
      });

      stats.sort((a, b) => b.totalQuestions - a.totalQuestions);

      // Wöchentliche Daten sortiert
      const weeklyDataArray: WeeklyData[] = Array.from(weeklyMap.entries())
        .map(([week, data]) => ({
          week,
          successRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          questions: data.total
        }))
        .slice(-6); // Letzte 6 Wochen

      const significantStats = stats.filter(s => s.totalQuestions >= 10);
      const strongest = significantStats.reduce((best, curr) => 
        curr.successRate > (best?.successRate ?? 0) ? curr : best, null as SubjectStats | null);
      const weakest = significantStats.reduce((worst, curr) => 
        curr.successRate < (worst?.successRate ?? 100) ? curr : worst, null as SubjectStats | null);

      setSubjectStats(stats);
      setWeeklyData(weeklyDataArray);
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

  // Generiere Lernempfehlungen
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    subjectStats.forEach(stat => {
      if (stat.successRate < 70 && stat.totalQuestions >= 10) {
        const subjectRecs = LEARNING_RECOMMENDATIONS[stat.subject]?.[childGrade];
        if (subjectRecs && subjectRecs.length > 0) {
          // Wähle 1-2 zufällige Empfehlungen
          const shuffled = [...subjectRecs].sort(() => Math.random() - 0.5);
          recs.push(`${stat.displayName}: ${shuffled[0]}`);
          if (shuffled[1] && stat.successRate < 50) {
            recs.push(`${stat.displayName}: ${shuffled[1]}`);
          }
        }
      }
      
      // Empfehlung bei langer Bearbeitungszeit
      if (stat.avgTimePerQuestion > 25 && stat.totalQuestions >= 10) {
        recs.push(`${stat.displayName}: Kopfrechnen üben für schnelleres Lösen`);
      }
    });

    return recs.slice(0, 4); // Max 4 Empfehlungen
  }, [subjectStats, childGrade]);

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
            Lernanalyse
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
            Lernanalyse
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
            Gesamtübersicht
          </CardTitle>
          <CardDescription>
            Lernfortschritt für {childName}
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

          {/* Stärken & Schwächen */}
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

      {/* Zeitlicher Verlauf */}
      {weeklyData.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Entwicklung der letzten Wochen
            </CardTitle>
            <CardDescription>
              Erfolgsquote im zeitlichen Verlauf
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Erfolgsquote']}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lernempfehlungen */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Lernempfehlungen für Klasse {childGrade}
            </CardTitle>
            <CardDescription>
              Basierend auf den Fehlerschwerpunkten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {stat.correctAnswers} von {stat.totalQuestions} richtig
                    </span>
                    <span className={`font-medium ${getSuccessRateColor(stat.successRate)}`}>
                      {Math.round(stat.successRate)}%
                    </span>
                  </div>
                  <Progress value={stat.successRate} className="h-2" />
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{stat.errorCount} Fehler</span>
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
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
