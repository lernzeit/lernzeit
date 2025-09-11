/**
 * Quality Management Component - Phase 2 Implementation
 * Comprehensive template validation and quality control with advanced pipeline
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Play, BarChart3, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { templateQualityPipeline } from '@/services/TemplateQualityPipeline';
import { postGenerationReviewer } from '@/services/PostGenerationReviewer';
import { usePreGenerationValidator } from '@/hooks/usePreGenerationValidator';

export function QualityManagement() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [problematicTemplates, setProblematicTemplates] = useState<any[]>([]);
  const [qualityStats, setQualityStats] = useState<any>(null);
  const [recentReview, setRecentReview] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState('validation');
  
  const { validateBeforeGeneration, isValidating: preValidating } = usePreGenerationValidator();

  // Load quality statistics on mount
  useEffect(() => {
    loadQualityStatistics();
  }, []);

  const loadQualityStatistics = async () => {
    try {
      const stats = await templateQualityPipeline.getQualityStatistics(7);
      setQualityStats(stats);
    } catch (error) {
      console.error('Error loading quality statistics:', error);
    }
  };

  const runValidation = async (filters?: { grade?: number; domain?: string }) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-templates', {
        body: { 
          batch_size: 100,
          ...filters
        }
      });

      if (error) throw error;
      setValidationResults(data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const runRecentReview = async () => {
    setIsReviewing(true);
    try {
      const review = await postGenerationReviewer.reviewRecentTemplates(24);
      setRecentReview(review);
    } catch (error) {
      console.error('Error running recent review:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const runAutoCleanup = async () => {
    setIsReviewing(true);
    try {
      const result = await postGenerationReviewer.performAutoCleanup();
      alert(`Auto-cleanup complete: ${result.message}`);
      loadQualityStatistics(); // Refresh stats
    } catch (error) {
      console.error('Error running auto-cleanup:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const testPreValidation = async () => {
    const testContext = {
      grade: 3,
      domain: 'Zahlen & Operationen',
      difficulty: 'mittel',
      questionType: 'multiple_choice',
      userId: 'test-user'
    };

    try {
      const result = await validateBeforeGeneration(testContext);
      alert(`Pre-validation result: ${result.approved ? 'Approved' : 'Rejected'}\nRecommendations: ${result.recommendations.join(', ')}`);
    } catch (error) {
      console.error('Pre-validation test error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phase 2: Template-Qualitätsmanagement</h2>
          <p className="text-muted-foreground">
            Systematische Qualitätskontrolle mit Pre- und Post-Generation Validierung
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="validation">Batch-Validierung</TabsTrigger>
          <TabsTrigger value="review">Post-Generation Review</TabsTrigger>
          <TabsTrigger value="pipeline">Quality Pipeline</TabsTrigger>
          <TabsTrigger value="statistics">Statistiken</TabsTrigger>
        </TabsList>

        {/* Batch Validation Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Phase 2: Batch-Validierung
              </CardTitle>
              <CardDescription>
                Systematische Qualitätsprüfungen mit erweiterten Validierungsregeln
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={() => runValidation()} 
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating && <Clock className="w-4 h-4 animate-spin" />}
                  Alle Templates validieren
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => runValidation({ grade: 1 })}
                  disabled={isValidating}
                >
                  Nur Klasse 1
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => runValidation({ domain: 'Zahlen & Operationen' })}
                  disabled={isValidating}
                >
                  Nur Mathematik
                </Button>
              </div>

              {validationResults && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{validationResults.validated}</div>
                        <div className="text-sm text-muted-foreground">Validiert</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{validationResults.invalid}</div>
                        <div className="text-sm text-muted-foreground">Ungültig</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{validationResults.excluded}</div>
                        <div className="text-sm text-muted-foreground">Ausgeschlossen</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{validationResults.total}</div>
                        <div className="text-sm text-muted-foreground">Gesamt</div>
                      </div>
                    </div>
                    
                    {validationResults.quality_distribution && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Qualitätsverteilung</h4>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>Excellent: {validationResults.quality_distribution.excellent}</div>
                          <div>Good: {validationResults.quality_distribution.good}</div>
                          <div>Fair: {validationResults.quality_distribution.fair}</div>
                          <div>Poor: {validationResults.quality_distribution.poor}</div>
                        </div>
                      </div>
                    )}

                    {validationResults.recommendations && (
                      <div>
                        <h4 className="font-semibold mb-2">Empfehlungen</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResults.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-Generation Review Tab */}
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Post-Generation Review
              </CardTitle>
              <CardDescription>
                Automatische Qualitätsprüfung nach Template-Generierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={runRecentReview}
                  disabled={isReviewing}
                  className="flex items-center gap-2"
                >
                  {isReviewing && <Clock className="w-4 h-4 animate-spin" />}
                  <Play className="w-4 h-4" />
                  Review letzten 24h
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={runAutoCleanup}
                  disabled={isReviewing}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Auto-Cleanup
                </Button>
              </div>

              {recentReview && (
                <div className="bg-muted p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{recentReview.totalReviewed}</div>
                      <div className="text-sm text-muted-foreground">Geprüft</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{recentReview.approved}</div>
                      <div className="text-sm text-muted-foreground">Genehmigt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{recentReview.rejected}</div>
                      <div className="text-sm text-muted-foreground">Abgelehnt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{recentReview.needingReview}</div>
                      <div className="text-sm text-muted-foreground">Prüfung nötig</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Durchschnittsqualität</span>
                      <span className="text-sm">{(recentReview.averageQuality * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={recentReview.averageQuality * 100} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Pipeline Tab */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quality Pipeline Controls
              </CardTitle>
              <CardDescription>
                Pre-Generation Validierung und Pipeline-Management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={testPreValidation}
                  disabled={preValidating}
                  className="flex items-center gap-2"
                >
                  {preValidating && <Clock className="w-4 h-4 animate-spin" />}
                  Test Pre-Generation Validierung
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>Die Quality Pipeline umfasst:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Pre-Generation Validierung (verhindert schlechte Templates)</li>
                    <li>Post-Generation Review (automatische Qualitätsprüfung)</li>
                    <li>Kontinuierliches Feedback-Integration</li>
                    <li>Adaptive Schwierigkeitsanpassung</li>
                    <li>Automatische Bereinigung problematischer Templates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Qualitätsstatistiken (7 Tage)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {qualityStats ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold">{qualityStats.totalValidated}</div>
                      <div className="text-sm text-muted-foreground">Templates validiert</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{(qualityStats.averageScore * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Durchschnittsqualität</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{(qualityStats.approvalRate * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Genehmigungsrate</div>
                    </div>
                    <div>
                      <Progress value={qualityStats.approvalRate * 100} className="h-3" />
                    </div>
                  </div>
                </div>
              ) : (
                <Button onClick={loadQualityStatistics}>Statistiken laden</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Problematic Templates Display */}
      {validationResults?.problematic_templates && validationResults.problematic_templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🚨 Problematische Templates</CardTitle>
            <CardDescription>
              Templates mit identifizierten Problemen (ersten 10 angezeigt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResults.problematic_templates.slice(0, 10).map((template: any, index: number) => (
                <div key={template.template_id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Template {template.template_id}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.prompt}
                      </p>
                    </div>
                    {template.shouldExclude && (
                      <Badge variant="destructive">Ausschließen</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {template.issues.map((issue: string, i: number) => (
                      <div key={i} className="text-xs bg-red-50 text-red-800 p-1 rounded">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QualityManagement;