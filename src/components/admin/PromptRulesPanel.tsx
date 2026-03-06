import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface PromptRule {
  id: string;
  rule_text: string;
  subject: string | null;
  grade_min: number | null;
  grade_max: number | null;
  is_active: boolean;
  source_feedback_count: number;
  created_at: string;
}

export function PromptRulesPanel() {
  const [rules, setRules] = useState<PromptRule[]>([]);
  const [unanalyzedCount, setUnanalyzedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [{ data: rulesData }, { count }] = await Promise.all([
        supabase
          .from('prompt_rules')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('question_feedback')
          .select('*', { count: 'exact', head: true })
          .is('analyzed_at', null),
      ]);

      setRules((rulesData as PromptRule[]) || []);
      setUnanalyzedCount(count || 0);
    } catch (err) {
      console.error('Error loading prompt rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRule = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('prompt_rules')
      .update({
        is_active: !currentActive,
        deactivated_at: currentActive ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setRules(prev =>
        prev.map(r => r.id === id ? { ...r, is_active: !currentActive } : r)
      );
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Fehler', description: 'Nicht eingeloggt', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-feedback', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({
        title: 'Analyse abgeschlossen',
        description: `${data.newRules} neue Regel(n), ${data.analyzedFeedbacks} Feedbacks verarbeitet`,
      });

      await loadData();
    } catch (err: any) {
      toast({
        title: 'Analyse fehlgeschlagen',
        description: err.message || 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSubjectLabel = (subject: string | null) => {
    if (!subject) return 'Alle Fächer';
    const map: Record<string, string> = {
      math: 'Mathe', german: 'Deutsch', english: 'Englisch',
      geography: 'Erdkunde', history: 'Geschichte', physics: 'Physik',
      biology: 'Biologie', chemistry: 'Chemie', latin: 'Latein',
    };
    return map[subject] || subject;
  };

  const getGradeLabel = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Alle Klassen';
    if (min === max) return `Klasse ${min}`;
    return `Klasse ${min || '?'}–${max || '?'}`;
  };

  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {activeCount} aktive Regeln
          </Badge>
          <Badge
            variant={unanalyzedCount > 0 ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {unanalyzedCount} unanalysierte Feedbacks
          </Badge>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || unanalyzedCount === 0}
          size="sm"
          className="flex items-center gap-2"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          {isAnalyzing ? 'Analysiere...' : 'Feedback analysieren'}
        </Button>
      </div>

      {/* Rules list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              KI-generierte Prompt-Regeln
            </span>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Regeln vorhanden. Klicke "Feedback analysieren" um Regeln aus Nutzer-Feedback zu generieren.
            </p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    rule.is_active
                      ? 'bg-card border-border'
                      : 'bg-muted/50 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-relaxed">
                        {rule.rule_text}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getSubjectLabel(rule.subject)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getGradeLabel(rule.grade_min, rule.grade_max)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {rule.source_feedback_count} Meldungen
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rule.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
