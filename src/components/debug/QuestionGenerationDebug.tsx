/**
 * Advanced Debug Tools for Question Generation System
 * Phase 6: Comprehensive debugging and monitoring interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, RefreshCw, Database, Zap, Bot, Filter, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAdvancedQuestionGeneration } from '@/hooks/useAdvancedQuestionGeneration';
import { ImprovedDuplicateDetectionEngine } from '@/utils/templates/improvedDuplicateDetection';
import { detectDuplicatesWithContext, type DiversityMetrics } from '@/utils/duplicateDetection';

interface DebugSessionData {
  sessionId: string;
  category: string;
  grade: number;
  questionsGenerated: number;
  duplicatesDetected: number;
  sources: {
    database: number;
    template: number;
    ai: number;
  };
  generationTime: number;
  qualityScore: number;
}

interface DatabaseDebugInfo {
  totalTemplates: number;
  categoryBreakdown: Record<string, number>;
  qualityDistribution: Record<string, number>;
  duplicateAnalysis: {
    totalDuplicates: number;
    duplicatesByGrade: Record<string, number>;
  };
}

export function QuestionGenerationDebug() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('mathematik');
  const [selectedGrade, setSelectedGrade] = useState(4);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debugSessions, setDebugSessions] = useState<DebugSessionData[]>([]);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseDebugInfo | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const {
    problems,
    isGenerating,
    generationSource,
    metrics,
    sessionId,
    generateProblems,
    getSessionStats
  } = useAdvancedQuestionGeneration({
    category: selectedCategory,
    grade: selectedGrade,
    userId: user?.id || 'debug',
    totalQuestions: 5,
    autoGenerate: false,
    options: {
      enableDuplicateDetection: true,
      enableEnhancedParsing: true,
      qualityThreshold: 0.5 // Lower for debugging
    }
  });

  // Real-time monitoring effect
  useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(async () => {
      await refreshDatabaseInfo();
      await updateSessionData();
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeEnabled, selectedCategory, selectedGrade]);

  // Initialize debug data
  useEffect(() => {
    refreshDatabaseInfo();
    updateSessionData();
  }, [selectedCategory, selectedGrade]);

  const refreshDatabaseInfo = async () => {
    try {
      // Get total templates count
      const { count: totalTemplates } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // Get category breakdown
      const { data: categoryData } = await supabase
        .from('templates')
        .select('domain')
        .eq('status', 'ACTIVE');

      const categoryBreakdown = categoryData?.reduce((acc, item) => {
        acc[item.domain] = (acc[item.domain] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get quality distribution (using rating data instead)
      const { data: qualityData } = await supabase
        .from('templates')
        .select('rating_sum, rating_count')
        .eq('status', 'ACTIVE')
        .gt('rating_count', 0);

      const qualityDistribution = qualityData?.reduce((acc, item) => {
        const score = item.rating_count > 0 ? item.rating_sum / item.rating_count : 0;
        const bucket = Math.floor(score * 10) / 10;
        const key = `${bucket.toFixed(1)}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Analyze duplicates using our enhanced detection
      const { data: allQuestions } = await supabase
        .from('templates')
        .select('student_prompt, domain, grade')
        .eq('status', 'ACTIVE')
        .eq('domain', selectedCategory)
        .eq('grade', selectedGrade);

      const questionTexts = allQuestions?.map(q => {
        try {
          return q.student_prompt;
        } catch {
          return q.student_prompt;
        }
      }) || [];

      const duplicateAnalysis = detectDuplicatesWithContext(
        questionTexts,
        [],
        [],
        { strictMode: true, maxDuplicates: 100 }
      );

      setDatabaseInfo({
        totalTemplates: totalTemplates || 0,
        categoryBreakdown,
        qualityDistribution,
        duplicateAnalysis: {
          totalDuplicates: duplicateAnalysis.duplicates.length,
          duplicatesByGrade: { [selectedGrade]: duplicateAnalysis.duplicates.length }
        }
      });

    } catch (error) {
      console.error('Error fetching database info:', error);
    }
  };

  const updateSessionData = async () => {
    if (!metrics) return;

    const sessionData: DebugSessionData = {
      sessionId,
      category: selectedCategory,
      grade: selectedGrade,
      questionsGenerated: problems.length,
      duplicatesDetected: metrics.duplicatesRejected,
      sources: {
        database: metrics.databaseTemplatesUsed,
        template: metrics.localTemplatesUsed,
        ai: metrics.aiGenerationUsed ? 1 : 0
      },
      generationTime: metrics.totalGenerationTime,
      qualityScore: metrics.averageQuality
    };

    setDebugSessions(prev => {
      const filtered = prev.filter(s => s.sessionId !== sessionId);
      return [...filtered, sessionData].slice(-10); // Keep last 10 sessions
    });
  };

  const forceRegenerate = async () => {
    console.log('🔧 DEBUG: Force regenerating questions');
    await generateProblems();
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear database templates for debugging?')) return;
    
    try {
      await supabase
        .from('templates')
        .update({ status: 'INACTIVE' })
        .eq('domain', selectedCategory)
        .eq('grade', selectedGrade);
      
      await refreshDatabaseInfo();
      console.log('🗑️ DEBUG: Database templates cleared for category/grade');
    } catch (error) {
      console.error('Error clearing database:', error);
    }
  };

  const analyzeCurrentQuestions = () => {
    if (problems.length === 0) return null;

    const questions = problems.map(p => p.question);
    const analysis = detectDuplicatesWithContext(questions, [], []);
    
    return {
      total: questions.length,
      unique: analysis.unique.length,
      duplicates: analysis.duplicates.length,
      diversityScore: analysis.metrics.qualityScore,
      topics: analysis.metrics.uniqueTopics
    };
  };

  const currentAnalysis = analyzeCurrentQuestions();
  const sessionStats = getSessionStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Generation Debug Console</h2>
          <p className="text-muted-foreground">Advanced monitoring and debugging tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            {realTimeEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Real-time {realTimeEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={refreshDatabaseInfo} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Category:</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ml-2 p-1 border rounded"
              >
                <option value="mathematik">Mathematik</option>
                <option value="deutsch">Deutsch</option>
                <option value="englisch">Englisch</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Grade:</label>
              <select 
                value={selectedGrade} 
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
                className="ml-2 p-1 border rounded"
              >
                {[1,2,3,4,5,6].map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={forceRegenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Force Generate'}
            </Button>
            <Button onClick={clearDatabase} variant="destructive" size="sm">
              Clear DB Templates
            </Button>
            <Button 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              variant="outline"
              size="sm"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Advanced {showAdvanced ? '−' : '+'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Session</TabsTrigger>
          <TabsTrigger value="database">Database Stats</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Generation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {generationSource === 'template' && <Zap className="h-4 w-4 text-yellow-500" />}
                    {generationSource === 'ai' && <Bot className="h-4 w-4 text-purple-500" />}
                    {generationSource === 'simple' && <Database className="h-4 w-4 text-blue-500" />}
                    <span className="text-sm font-medium">
                      {generationSource || 'No source'}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{problems.length} questions</div>
                  {isGenerating && <Progress value={undefined} className="h-2" />}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>Quality: {metrics?.averageQuality?.toFixed(2) || 'N/A'}</div>
                  <div>Parse Rate: {(metrics?.parseSuccessRate * 100)?.toFixed(1) || 'N/A'}%</div>
                  <div>Generation Time: {metrics?.totalGenerationTime || 0}ms</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Duplicate Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>Rejected: {metrics?.duplicatesRejected || 0}</div>
                  {currentAnalysis && (
                    <>
                      <div>Unique: {currentAnalysis.unique}/{currentAnalysis.total}</div>
                      <div>Diversity: {(currentAnalysis.diversityScore * 100).toFixed(1)}%</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Questions Analysis */}
          {problems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Questions</CardTitle>
                <CardDescription>
                  {currentAnalysis && (
                    <span>
                      {currentAnalysis.topics.length} topics: {currentAnalysis.topics.join(', ')}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {problems.map((problem, index) => (
                    <div key={problem.id} className="p-2 border rounded text-sm">
                      <div className="font-medium">Q{index + 1}: {problem.question}</div>
                      <div className="text-muted-foreground">
                        Type: {problem.questionType} | Answer: {
                          problem.questionType === 'text-input' 
                            ? (problem as any).answer 
                            : (problem as any).correctAnswer
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          {databaseInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>Total Templates: {databaseInfo.totalTemplates}</div>
                    <div>Duplicates Found: {databaseInfo.duplicateAnalysis.totalDuplicates}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(databaseInfo.categoryBreakdown).map(([category, count]) => (
                      <div key={category} className="flex justify-between">
                        <span>{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Quality Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(databaseInfo.qualityDistribution)
                      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                      .map(([score, count]) => (
                        <div key={score} className="text-center">
                          <div className="text-sm font-medium">{score}</div>
                          <div className="text-xs text-muted-foreground">{count}</div>
                          <div className="h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-blue-500 rounded"
                              style={{ 
                                width: `${(count / Math.max(...Object.values(databaseInfo.qualityDistribution))) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Generation Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {debugSessions.length === 0 ? (
                  <p className="text-muted-foreground">No sessions recorded yet</p>
                ) : (
                  debugSessions.slice(-5).reverse().map((session, index) => (
                    <div key={session.sessionId} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {session.category} Grade {session.grade}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.questionsGenerated} questions • {session.generationTime}ms
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>DB: {session.sources.database} | Local: {session.sources.template} | AI: {session.sources.ai}</div>
                          <div>Duplicates: {session.duplicatesDetected}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(sessionStats, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Generation Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(metrics, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Manual Debug Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => console.log('Current Problems:', problems)}
                    >
                      Log Problems
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => console.log('Session cleared')}
                    >
                      Clear Session
                    </Button>
                    <Button size="sm" variant="outline" onClick={refreshDatabaseInfo}>
                      Refresh DB Info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}