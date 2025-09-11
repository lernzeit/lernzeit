/**
 * Quality Management Component - Phase 1 Implementation
 * Manages template validation and quality control
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { templateQualityPipeline } from '@/services/TemplateQualityPipeline';
import { postGenerationReviewer } from '@/services/PostGenerationReviewer';
import { usePreGenerationValidator } from '@/hooks/usePreGenerationValidator';

interface ValidationResult {
  success: boolean;
  validated: number;
  invalid: number;
  excluded: number;
  total: number;
  problematic_templates: Array<{
    template_id: string;
    prompt: string;
    issues: string[];
    shouldExclude: boolean;
  }>;
  message: string;
}

export function QualityManagement() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);

  /**
   * Phase 1: Run comprehensive template validation
   */
  const runValidation = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-templates', {
        body: { batch_size: 100 }
      });

      if (error) throw error;

      setValidationResult(data);
      await loadFeedbackStats();
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        success: false,
        message: `Fehler: ${error.message}`,
        validated: 0,
        invalid: 0,
        excluded: 0,
        total: 0,
        problematic_templates: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Load user feedback statistics
   */
  const loadFeedbackStats = async () => {
    try {
      const { data, error } = await supabase
        .from('question_feedback')
        .select('feedback_type, grade, category, created_at')
        .in('feedback_type', ['confusing', 'inappropriate', 'not_curriculum_compliant']);

      if (error) throw error;

      const stats = data?.reduce((acc, item) => {
        acc.total++;
        acc[item.feedback_type] = (acc[item.feedback_type] || 0) + 1;
        return acc;
      }, { total: 0, confusing: 0, inappropriate: 0, not_curriculum_compliant: 0 }) || {};

      setFeedbackStats(stats);
    } catch (error) {
      console.error('Error loading feedback stats:', error);
    }
  };

  /**
   * Archive problematic templates
   */
  const archiveProblematicTemplates = async () => {
    if (!validationResult?.problematic_templates) return;

    try {
      const templatesToArchive = validationResult.problematic_templates
        .filter(t => t.shouldExclude)
        .map(t => t.template_id);

      const { error } = await supabase
        .from('templates')
        .update({ 
          status: 'ARCHIVED',
          validation_status: 'excluded',
          quality_score: 0.1
        })
        .in('id', templatesToArchive);

      if (error) throw error;

      alert(`${templatesToArchive.length} problematische Templates archiviert.`);
      await runValidation(); // Refresh results
    } catch (error) {
      console.error('Error archiving templates:', error);
      alert('Fehler beim Archivieren der Templates.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Phase 1: Qualitätskontrolle
          </CardTitle>
          <CardDescription>
            Sofortige Maßnahmen zur Filterung problematischer Fragen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runValidation} 
              disabled={isValidating}
              variant="default"
            >
              {isValidating ? 'Validiere...' : '🚨 Probleme identifizieren'}
            </Button>
            
            {validationResult && validationResult.problematic_templates.length > 0 && (
              <Button 
                onClick={archiveProblematicTemplates}
                variant="destructive"
              >
                🗂️ Problematische Templates archivieren
              </Button>
            )}
          </div>

          {validationResult && (
            <Alert>
              <AlertDescription>
                <strong>{validationResult.message}</strong>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>✅ Validiert: {validationResult.validated}</span>
                  <span className="text-yellow-600">⚠️ Ungültig: {validationResult.invalid}</span>
                  <span className="text-red-600">🚫 Ausgeschlossen: {validationResult.excluded}</span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* User Feedback Overview */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Nutzer-Feedback Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{feedbackStats.confusing || 0}</div>
                <div className="text-sm text-muted-foreground">Verwirrend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{feedbackStats.inappropriate || 0}</div>
                <div className="text-sm text-muted-foreground">Unpassend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{feedbackStats.not_curriculum_compliant || 0}</div>
                <div className="text-sm text-muted-foreground">Nicht Lehrplan</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{feedbackStats.total || 0}</div>
                <div className="text-sm text-muted-foreground">Gesamt negativ</div>
              </div>
            </div>
          ) : (
            <Button onClick={loadFeedbackStats} variant="outline">
              Feedback-Statistiken laden
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Problematic Templates List */}
      {validationResult?.problematic_templates && validationResult.problematic_templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🚨 Identifizierte Probleme</CardTitle>
            <CardDescription>
              Templates mit kritischen Problemen (erste 10 angezeigt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResult.problematic_templates.slice(0, 10).map((template, index) => (
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
                    {template.issues.map((issue, i) => (
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

      {/* Phase 1 Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Phase 1 Maßnahmen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline">✅ Implementiert</Badge>
            <span>Qualitätsschwelle von 0.7 auf 0.8 erhöht</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">✅ Implementiert</Badge>
            <span>Feedback-basierte Ausschlussliste aktiviert</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">✅ Implementiert</Badge>
            <span>Erweiterte Blacklist für unmögliche Aufgaben</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">✅ Implementiert</Badge>
            <span>Automatisches Archivieren problematischer Templates</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QualityManagement;