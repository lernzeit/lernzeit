/**
 * Template Bank Management Dashboard
 * Admin interface for monitoring and managing the template system
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Database,
  Brain,
  Target
} from 'lucide-react';

import { curriculumManager, CurriculumCoverage } from '@/services/CurriculumManager';
import { batchTemplateGenerator, BatchGenerationProgress } from '@/services/BatchTemplateGenerator';
import { multiProviderAIService } from '@/services/MultiProviderAIService';
import { supabase } from '@/lib/supabase';

interface TemplateStats {
  totalTemplates: number;
  byGrade: Record<number, number>;
  byDomain: Record<string, number>;
  byDifficulty: Record<string, number>;
  byQuarter: Record<string, number>;
  qualityDistribution: { range: string; count: number; }[];
  recentlyGenerated: number;
}

export const TemplateBankDashboard: React.FC = () => {
  const [coverage, setCoverage] = useState<CurriculumCoverage | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [generationProgress, setGenerationProgress] = useState<BatchGenerationProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProviderStatus, setAiProviderStatus] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadProviderStatus();
    
    // Set up progress tracking
    const unsubscribe = batchTemplateGenerator.onProgress((progress) => {
      setGenerationProgress(progress);
    });

    return unsubscribe;
  }, []);

  const loadDashboardData = async () => {
    setIsAnalyzing(true);
    try {
      // Load coverage analysis
      const coverageData = await curriculumManager.analyzeCoverage();
      setCoverage(coverageData);

      // Load template statistics
      const stats = await loadTemplateStats();
      setTemplateStats(stats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addLog(`Error loading dashboard: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadTemplateStats = async (): Promise<TemplateStats> => {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('grade, domain, difficulty, quarter_app, quality_score, created_at')
      .eq('status', 'ACTIVE');

    if (error) throw error;

    const stats: TemplateStats = {
      totalTemplates: templates?.length || 0,
      byGrade: {},
      byDomain: {},
      byDifficulty: {},
      byQuarter: {},
      qualityDistribution: [],
      recentlyGenerated: 0
    };

    if (!templates) return stats;

    // Calculate distributions
    templates.forEach(template => {
      // By grade
      stats.byGrade[template.grade] = (stats.byGrade[template.grade] || 0) + 1;
      
      // By domain
      stats.byDomain[template.domain] = (stats.byDomain[template.domain] || 0) + 1;
      
      // By difficulty
      stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1;
      
      // By quarter
      stats.byQuarter[template.quarter_app] = (stats.byQuarter[template.quarter_app] || 0) + 1;
      
      // Recent generation (last 7 days)
      const created = new Date(template.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (created > weekAgo) {
        stats.recentlyGenerated++;
      }
    });

    // Quality distribution
    const qualityRanges = [
      { range: '0.0-0.3', min: 0.0, max: 0.3, count: 0 },
      { range: '0.3-0.5', min: 0.3, max: 0.5, count: 0 },
      { range: '0.5-0.7', min: 0.5, max: 0.7, count: 0 },
      { range: '0.7-0.9', min: 0.7, max: 0.9, count: 0 },
      { range: '0.9-1.0', min: 0.9, max: 1.0, count: 0 }
    ];

    templates.forEach(template => {
      const quality = template.quality_score || 0.5;
      const range = qualityRanges.find(r => quality >= r.min && quality < r.max);
      if (range) range.count++;
    });

    stats.qualityDistribution = qualityRanges;

    return stats;
  };

  const loadProviderStatus = () => {
    const status = multiProviderAIService.getProviderStatus();
    setAiProviderStatus(status);
  };

  const handleGenerateHighPriority = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    addLog('Starting high-priority template generation...');

    try {
      const result = await batchTemplateGenerator.fillHighPriorityGaps(100);
      
      addLog(`Generation complete: ${result.totalGenerated} generated, ${result.totalSaved} saved`);
      
      // Refresh data
      await loadDashboardData();
    } catch (error) {
      console.error('Generation error:', error);
      addLog(`Generation error: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleGenerateForGrade = async (grade: number) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    addLog(`Starting template generation for Grade ${grade}...`);

    try {
      const result = await batchTemplateGenerator.generateForGrade(grade, 50);
      
      addLog(`Grade ${grade} generation complete: ${result.totalGenerated} templates`);
      
      // Refresh data
      await loadDashboardData();
    } catch (error) {
      console.error('Generation error:', error);
      addLog(`Generation error: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleRecountStats = async () => {
    setIsAnalyzing(true);
    addLog('Starting template statistics recount...');

    try {
      const { data, error } = await supabase.functions.invoke('recount-template-stats', {});
      
      if (error) throw error;
      
      addLog(`Stats recount complete: ${data?.templatesProcessed || 0} templates processed`);
      
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Recount error:', error);
      addLog(`Recount error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoRepair = async () => {
    setIsAnalyzing(true);
    addLog('Starte Daten-Reparatur (Mathe & Trennzeichen)...');

    try {
      const { data, error } = await supabase.functions.invoke('auto-template-repair', {
        body: { limit: 2000 }
      });

      if (error) throw error;

      addLog(`Reparatur fertig: ${data?.updatedIds?.length || 0} Vorlagen aktualisiert (Mathe: ${data?.mathFixed || 0}, Trennz.: ${data?.sepFixed || 0})`);
      await loadDashboardData();
    } catch (error) {
      console.error('Repair error:', error);
      addLog(`Repair error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Template-Bank Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={loadDashboardData} 
            disabled={isAnalyzing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button 
            onClick={handleGenerateHighPriority}
            disabled={isGenerating}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generiert...' : 'High-Priority Füllen'}
          </Button>
          <Button 
            onClick={handleRecountStats}
            disabled={isAnalyzing}
            variant="outline"
          >
            <Target className="h-4 w-4 mr-2" />
            Stats Neu Berechnen
          </Button>
          <Button 
            onClick={handleAutoRepair}
            disabled={isAnalyzing}
            variant="outline"
          >
            <Brain className="h-4 w-4 mr-2" />
            Daten-Reparatur (Mathe & Trennzeichen)
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Templates</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templateStats ? formatNumber(templateStats.totalTemplates) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {templateStats ? `+${templateStats.recentlyGenerated} diese Woche` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Curriculum Abdeckung</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coverage ? `${coverage.coveragePercentage.toFixed(1)}%` : '...'}
            </div>
            <Progress 
              value={coverage?.coveragePercentage || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Lücken</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coverage ? formatNumber(coverage.gaps.length) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {coverage ? `${coverage.gaps.filter(g => g.priority === 'HIGH').length} High-Priority` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Provider Status</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aiProviderStatus.filter(p => p.enabled && !p.rateLimited).length}/
              {aiProviderStatus.length}
            </div>
            <p className="text-xs text-muted-foreground">Verfügbare Provider</p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Progress */}
      {generationProgress && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Batch-Generierung läuft...</span>
                <span>{generationProgress.percentComplete.toFixed(1)}%</span>
              </div>
              <Progress value={generationProgress.percentComplete} />
              <div className="text-sm text-muted-foreground">
                {generationProgress.successful}/{generationProgress.totalRequested} erfolgreich, 
                Batch {generationProgress.currentBatch}/{generationProgress.totalBatches}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="coverage">Abdeckung</TabsTrigger>
          <TabsTrigger value="generation">Generierung</TabsTrigger>
          <TabsTrigger value="quality">Qualität</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates by Grade */}
            <Card>
              <CardHeader>
                <CardTitle>Templates nach Klassenstufe</CardTitle>
              </CardHeader>
              <CardContent>
                {templateStats && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(templateStats.byGrade).map(([grade, count]) => ({ 
                      grade: `Klasse ${grade}`, 
                      count 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Templates by Domain */}
            <Card>
              <CardHeader>
                <CardTitle>Templates nach Domäne</CardTitle>
              </CardHeader>
              <CardContent>
                {templateStats && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(templateStats.byDomain).map(([domain, count], index) => ({
                          name: domain,
                          value: count,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Schnell-Aktionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(grade => (
                  <Button
                    key={grade}
                    variant="outline"
                    onClick={() => handleGenerateForGrade(grade)}
                    disabled={isGenerating}
                    className="h-20 flex flex-col"
                  >
                    <span className="text-lg font-bold">Klasse {grade}</span>
                    <span className="text-xs">50 Templates</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum-Abdeckung Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {coverage ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {coverage.coveredCombinations}
                      </div>
                      <div className="text-sm text-muted-foreground">Abgedeckt</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {coverage.gaps.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Lücken</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {coverage.totalCombinations}
                      </div>
                      <div className="text-sm text-muted-foreground">Gesamt</div>
                    </div>
                  </div>

                  {coverage.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Empfehlungen:</h4>
                      {coverage.recommendations.map((rec, index) => (
                        <Alert key={index}>
                          <AlertDescription>{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* High Priority Gaps */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">High-Priority Lücken (Top 10):</h4>
                    <div className="space-y-1">
                      {coverage.gaps
                        .filter(gap => gap.priority === 'HIGH')
                        .slice(0, 10)
                        .map((gap, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <span className="text-sm">
                              Klasse {gap.grade} {gap.quarter} - {gap.domain} - {gap.difficulty}
                            </span>
                            <Badge variant="destructive">
                              {gap.currentCount}/{gap.targetCount}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>Lade Coverage-Daten...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generation">
          <Card>
            <CardHeader>
              <CardTitle>Generierungs-Konsole</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Provider Status */}
                <div>
                  <h4 className="font-semibold mb-2">AI-Provider Status:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiProviderStatus.map((provider, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{provider.provider}</span>
                        <Badge variant={provider.enabled && !provider.rateLimited ? "default" : "destructive"}>
                          {provider.enabled && !provider.rateLimited ? 'Verfügbar' : 'Nicht verfügbar'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logs */}
                <div>
                  <h4 className="font-semibold mb-2">Aktivitäts-Log:</h4>
                  <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
                    {logs.length === 0 ? (
                      <div className="text-muted-foreground">Keine Aktivitäten...</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="mb-1">{log}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Qualitäts-Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              {templateStats && (
                <div className="space-y-6">
                  {/* Quality Distribution */}
                  <div>
                    <h4 className="font-semibold mb-4">Qualitäts-Verteilung:</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={templateStats.qualityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Difficulty Distribution */}
                  <div>
                    <h4 className="font-semibold mb-4">Schwierigkeits-Verteilung:</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(templateStats.byDifficulty).map(([difficulty, count]) => (
                        <div key={difficulty} className="text-center p-4 border rounded">
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground">{difficulty}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};