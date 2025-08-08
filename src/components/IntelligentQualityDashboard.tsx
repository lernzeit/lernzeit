import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Target,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { SelectionQuestion } from '@/types/questionTypes';
import { useIntelligentQualitySystem } from '@/hooks/useIntelligentQualitySystem';

interface IntelligentQualityDashboardProps {
  questions: SelectionQuestion[];
  category: string;
  grade: number;
  userId: string;
  onOptimizeQuestions?: (optimizedQuestions: SelectionQuestion[]) => void;
}

export default function IntelligentQualityDashboard({ 
  questions, 
  category, 
  grade, 
  userId,
  onOptimizeQuestions 
}: IntelligentQualityDashboardProps) {
  const {
    batchAnalyzeQuestions,
    qualityReports,
    isAnalyzing,
    optimizeQuestions,
    optimizationResults,
    qualityTrends,
    qualityDimensions,
    averageQualityScore,
    qualityDistribution,
    needsOptimization
  } = useIntelligentQualitySystem(category, grade, userId);

  const [activeTab, setActiveTab] = useState('overview');
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (questions.length > 0 && qualityReports.size === 0) {
      batchAnalyzeQuestions(questions);
    }
  }, [questions, batchAnalyzeQuestions, qualityReports.size]);

  const handleOptimizeQuestions = async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const result = await optimizeQuestions(questions);
      if (onOptimizeQuestions) {
        onOptimizeQuestions(result.optimized_questions);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Intelligente Qualitätskontrolle
          </CardTitle>
          <CardDescription>
            Keine Fragen zum Analysieren verfügbar
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Phase 3: Intelligente Qualitätskontrolle
          </CardTitle>
          <CardDescription>
            KI-gestützte Analyse und Optimierung der Fragqualität
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(averageQualityScore)}`}>
                {(averageQualityScore * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Durchschnittliche Qualität</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {qualityReports.size}/{questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Analysierte Fragen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {optimizationResults?.applied_optimizations.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Angewandte Optimierungen</div>
            </div>
          </div>
          
          {needsOptimization && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Einige Fragen benötigen Optimierung. Verwenden Sie die KI-Optimierung für bessere Qualität.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="dimensions">Qualitätsdimensionen</TabsTrigger>
          <TabsTrigger value="optimization">Optimierung</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Qualitätsverteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Exzellent (≥80%)</span>
                    <Badge variant="default">{qualityDistribution.excellent}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gut (≥60%)</span>
                    <Badge variant="secondary">{qualityDistribution.good}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Befriedigend (≥40%)</span>
                    <Badge variant="outline">{qualityDistribution.fair}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Verbesserungsbedürftig</span>
                    <Badge variant="destructive">{qualityDistribution.poor}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Question Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Einzelne Fragen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {questions.map((question) => {
                    const report = qualityReports.get(question.id);
                    const score = report?.overall_score || 0;
                    
                    return (
                      <div key={question.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex-1 truncate">
                          <div className="text-sm truncate">{question.question}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {question.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={score * 100} 
                            className="w-16 h-2" 
                          />
                          <Badge variant={getQualityBadgeVariant(score)}>
                            {(score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualityDimensions.map((dimension) => {
              const avgScore = questions.length > 0 ? 
                questions.reduce((sum, q) => {
                  const report = qualityReports.get(q.id);
                  return sum + (report?.dimension_scores[dimension.id] || 0);
                }, 0) / questions.length : 0;

              return (
                <Card key={dimension.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{dimension.name}</CardTitle>
                    <CardDescription>
                      Gewichtung: {(dimension.weight * 100).toFixed(0)}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Durchschnitt</span>
                        <span className={`font-semibold ${getQualityColor(avgScore)}`}>
                          {(avgScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={avgScore * 100} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        Schwellenwert: {(dimension.threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                KI-gestützte Optimierung
              </CardTitle>
              <CardDescription>
                Automatische Verbesserung der Fragqualität durch intelligente Anpassungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={handleOptimizeQuestions}
                  disabled={isOptimizing || isAnalyzing}
                  className="flex items-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <Settings className="w-4 h-4 animate-spin" />
                      Optimiere...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      Fragen optimieren
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => batchAnalyzeQuestions(questions)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analysiere...' : 'Erneut analysieren'}
                </Button>
              </div>

              {optimizationResults && (
                <div className="mt-4 p-4 border rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Optimierung abgeschlossen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Qualitätssteigerung</div>
                      <div className="font-semibold text-green-600">
                        +{(optimizationResults.quality_improvement * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Optimierungszeit</div>
                      <div className="font-semibold">
                        {(optimizationResults.optimization_time / 1000).toFixed(1)}s
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Anpassungen</div>
                      <div className="font-semibold">
                        {optimizationResults.applied_optimizations.length}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-muted-foreground mb-2">Angewandte Optimierungen:</div>
                    <div className="flex flex-wrap gap-1">
                      {optimizationResults.applied_optimizations.map((opt, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Qualitätstrends
              </CardTitle>
              <CardDescription>
                Entwicklung der Fragqualität über Zeit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityTrends.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 flex items-end gap-2">
                    {qualityTrends.map((trend, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="bg-primary rounded-t w-full"
                          style={{ height: `${trend.overall_score * 200}px` }}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {trend.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    Qualitätsentwicklung über die letzten Sitzungen
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Noch keine Trenddaten verfügbar. Führen Sie weitere Analysen durch.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}