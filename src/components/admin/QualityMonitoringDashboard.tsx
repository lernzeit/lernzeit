import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react';

interface QualityMetrics {
  totalValidated: number;
  averageScore: number;
  approvalRate: number;
  recentIssues: Array<{
    id: string;
    template_id: string;
    issue_type: string;
    description: string;
    created_at: string;
  }>;
  trendData: Array<{
    date: string;
    score: number;
    count: number;
  }>;
}

interface RealTimeActivity {
  id: string;
  type: 'validation' | 'approval' | 'rejection' | 'issue';
  template_id: string;
  score?: number;
  message: string;
  timestamp: string;
}

export const QualityMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [activities, setActivities] = useState<RealTimeActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadRecentActivities();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadMetrics();
        loadRecentActivities();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      const { data: qualityData, error } = await supabase
        .from('question_quality_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (qualityData) {
        const totalValidated = qualityData.length;
        const averageScore = qualityData.reduce((sum, item) => sum + item.overall_score, 0) / totalValidated;
        const approvalRate = qualityData.filter(item => item.overall_score >= 0.8).length / totalValidated;

        // Group by date for trend data
        const trendMap = new Map();
        qualityData.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (!trendMap.has(date)) {
            trendMap.set(date, { scores: [], count: 0 });
          }
          trendMap.get(date).scores.push(item.overall_score);
          trendMap.get(date).count++;
        });

        const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
          date,
          score: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length,
          count: data.count
        })).slice(-7); // Last 7 days

        setMetrics({
          totalValidated,
          averageScore,
          approvalRate,
          recentIssues: [], // Will be loaded separately
          trendData
        });
      }
    } catch (error) {
      console.error('Error loading quality metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Simulate real-time activities (in real implementation, use WebSocket or polling)
      const { data: recentTemplates, error } = await supabase
        .from('templates')
        .select('id, student_prompt, created_at, status')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mockActivities: RealTimeActivity[] = recentTemplates?.map(template => ({
        id: template.id,
        type: Math.random() > 0.7 ? 'rejection' : 'approval',
        template_id: template.id,
        score: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
        message: `Template "${template.student_prompt.substring(0, 50)}..." ${Math.random() > 0.7 ? 'abgelehnt' : 'genehmigt'}`,
        timestamp: template.created_at
      })) || [];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const getQualityStatusColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityStatusBadge = (score: number) => {
    if (score >= 0.9) return <Badge variant="default" className="bg-green-100 text-green-800">Exzellent</Badge>;
    if (score >= 0.8) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Gut</Badge>;
    return <Badge variant="destructive">Mangelhaft</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Lade Quality Monitoring Daten...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quality Monitoring Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-Refresh {autoRefresh ? 'EIN' : 'AUS'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Validierte Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalValidated}</div>
              <p className="text-sm text-muted-foreground">Letzte 7 Tage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Durchschnitts-Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getQualityStatusColor(metrics.averageScore)}`}>
                {(metrics.averageScore * 100).toFixed(1)}%
              </div>
              <div className="mt-2">
                {getQualityStatusBadge(metrics.averageScore)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Approval Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {(metrics.approvalRate * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.approvalRate * 100} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList>
          <TabsTrigger value="realtime">Real-Time Activity</TabsTrigger>
          <TabsTrigger value="trends">Qualitätstrends</TabsTrigger>
          <TabsTrigger value="issues">Aktuelle Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Live Template Validierung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.length > 0 ? activities.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {activity.type === 'approval' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {activity.type === 'rejection' && <XCircle className="h-5 w-5 text-red-500" />}
                      {activity.type === 'validation' && <Clock className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'issue' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                      
                      <div>
                        <p className="font-medium">{activity.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString('de-DE')}
                        </p>
                      </div>
                    </div>
                    
                    {activity.score && (
                      <div className="text-right">
                        <div className={`font-bold ${getQualityStatusColor(activity.score)}`}>
                          {(activity.score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">
                    Keine aktuellen Aktivitäten
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Qualitätstrend (7 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.trendData && metrics.trendData.length > 0 ? (
                <div className="space-y-4">
                  {metrics.trendData.map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">
                          {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-muted-foreground">{day.count} Templates</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${getQualityStatusColor(day.score)}`}>
                          {(day.score * 100).toFixed(1)}%
                        </div>
                        <Progress value={day.score * 100} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Keine Trenddaten verfügbar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Quality Issues werden automatisch erkannt und hier angezeigt. 
              Kritische Issues erfordern sofortige Aufmerksamkeit.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Aktuelle Quality Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock issues for demonstration */}
                <div className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">Mathematische Logik-Fehler</p>
                      <p className="text-sm text-muted-foreground">Template #T-2024-001: Falsche Berechnung in Lösung</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Kritisch</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Semantic Duplicate</p>
                      <p className="text-sm text-muted-foreground">Template #T-2024-002: 85% Ähnlichkeit zu T-2024-000</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">Warnung</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};