import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TemplatePoolManager } from '@/services/TemplatePoolManager';
import { SessionDuplicatePrevention } from '@/services/SessionDuplicatePrevention';

interface CoverageHeatmapData {
  grade: number;
  quarter: string;
  domain: string;
  templateCount: number;
  targetCount: number;
  coveragePercentage: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface TemplateQualityMetric {
  id: string;
  grade: number;
  domain: string;
  difficulty: string;
  question_type: string;
  student_prompt: string;
  quality_score: number;
  plays: number;
  correct: number;
  success_rate: number;
  last_validated: string;
  status: string;
}

export const QualityDashboard = () => {
  const [coverageData, setCoverageData] = useState<CoverageHeatmapData[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<TemplateQualityMetric[]>([]);
  const [sessionStats, setSessionStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  
  useEffect(() => {
    loadDashboardData();
  }, [selectedGrade]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load coverage analysis
      const coverage = await TemplatePoolManager.analyzeCoverage();
      
      // Convert gaps to heatmap data
      const heatmapData: CoverageHeatmapData[] = [];
      const domains = ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Daten & Zufall', 'Gleichungen & Funktionen'];
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

      for (const grade of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        for (const quarter of quarters) {
          for (const domain of domains) {
            const gap = coverage.gaps.find(g => 
              g.grade === grade && g.quarter_app === quarter && g.domain === domain
            );
            
            if (gap) {
              const targetCount = 15; // 15 templates per combination
              heatmapData.push({
                grade,
                quarter,
                domain,
                templateCount: gap.current_count,
                targetCount,
                coveragePercentage: (gap.current_count / targetCount) * 100,
                priority: gap.priority
              });
            }
          }
        }
      }
      
      setCoverageData(heatmapData.filter(d => d.grade === selectedGrade));

      // Load template quality metrics
      const { data: templates, error } = await supabase
        .from('templates')
        .select('*')
        .eq('grade', selectedGrade)
        .eq('status', 'ACTIVE')
        .order('quality_score', { ascending: false })
        .limit(50);

      if (!error && templates) {
        const metrics = templates.map(t => ({
          ...t,
          success_rate: t.plays > 0 ? (t.correct / t.plays) * 100 : 0
        }));
        setQualityMetrics(metrics);
      }

      // Load session statistics
      const sessions = SessionDuplicatePrevention.getAllSessionStats();
      setSessionStats(sessions.filter(s => s.grade === selectedGrade));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const triggerBatchGeneration = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('batch-generate-questions', {
        body: { 
          grade: selectedGrade,
          prioritizeGaps: true,
          batchSize: 20
        }
      });

      if (error) throw error;
      
      console.log('Batch generation triggered:', data);
      setTimeout(loadDashboardData, 2000); // Reload after 2 seconds
    } catch (error) {
      console.error('Error triggering batch generation:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  const totalTemplates = qualityMetrics.length;
  const highQualityTemplates = qualityMetrics.filter(t => t.quality_score >= 0.8).length;
  const avgQualityScore = totalTemplates > 0 ? 
    qualityMetrics.reduce((sum, t) => sum + t.quality_score, 0) / totalTemplates : 0;
  const activeSessions = sessionStats.filter(s => !s.isExpired).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Template Quality Dashboard</h1>
        <div className="flex gap-2">
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(Number(e.target.value))}
            className="px-3 py-2 border rounded"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(grade => (
              <option key={grade} value={grade}>Klasse {grade}</option>
            ))}
          </select>
          <Button onClick={triggerBatchGeneration} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Generate Templates
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <Badge variant={totalTemplates >= 50 ? "default" : "destructive"}>
              {totalTemplates >= 50 ? "Good" : "Needs More"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highQualityTemplates}</div>
            <div className="text-sm text-gray-600">
              {totalTemplates > 0 ? Math.round((highQualityTemplates / totalTemplates) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getQualityColor(avgQualityScore)}`}>
              {avgQualityScore.toFixed(2)}
            </div>
            <Progress value={avgQualityScore * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <div className="text-sm text-gray-600">Currently learning</div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Template Coverage Heatmap - Klasse {selectedGrade}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => (
              <div key={quarter}>
                <h4 className="font-semibold mb-2">{quarter}</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Daten & Zufall', 'Gleichungen & Funktionen'].map(domain => {
                    const data = coverageData.find(d => d.quarter === quarter && d.domain === domain);
                    const percentage = data?.coveragePercentage || 0;
                    
                    return (
                      <div key={domain} className="p-3 border rounded">
                        <div className="text-xs font-medium mb-1 truncate" title={domain}>
                          {domain.split(' ')[0]}...
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{data?.templateCount || 0}/15</span>
                          <div className={`w-3 h-3 rounded ${getCoverageColor(percentage)}`} />
                        </div>
                        <Progress value={percentage} className="mt-1 h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Quality List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {qualityMetrics.slice(0, 20).map(template => (
              <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate" title={template.student_prompt}>
                    {template.student_prompt.substring(0, 60)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    {template.domain} • {template.difficulty} • {template.question_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={template.quality_score >= 0.8 ? "default" : "secondary"}>
                    {template.quality_score.toFixed(2)}
                  </Badge>
                  <div className="text-sm">
                    {template.success_rate.toFixed(0)}%
                    {template.success_rate >= 70 ? 
                      <TrendingUp className="w-3 h-3 text-green-500 inline ml-1" /> :
                      <TrendingDown className="w-3 h-3 text-red-500 inline ml-1" />
                    }
                  </div>
                  <div className="text-xs text-gray-400">
                    {template.plays} plays
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Active Learning Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sessionStats.filter(s => !s.isExpired).slice(0, 9).map(session => (
              <div key={session.sessionId} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">User Session</div>
                  <Badge variant="outline">{session.grade}. Klasse</Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div>Templates: {session.templatesUsed}</div>
                  <div>Questions: {session.questionsAnswered}</div>
                  <div>Duration: {Math.round(session.duration / 1000 / 60)}min</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};