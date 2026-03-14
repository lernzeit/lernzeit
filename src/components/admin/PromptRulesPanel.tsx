import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, RefreshCw, AlertTriangle, CheckCircle, Loader2, Pencil, Save, X, Trash2 } from 'lucide-react';

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

const SUBJECT_OPTIONS = [
  { value: '_all', label: 'Alle Fächer' },
  { value: 'math', label: 'Mathe' },
  { value: 'german', label: 'Deutsch' },
  { value: 'english', label: 'Englisch' },
  { value: 'geography', label: 'Erdkunde' },
  { value: 'history', label: 'Geschichte' },
  { value: 'physics', label: 'Physik' },
  { value: 'biology', label: 'Biologie' },
  { value: 'chemistry', label: 'Chemie' },
  { value: 'latin', label: 'Latein' },
];

const GRADE_OPTIONS = [
  { value: '_all', label: 'Alle Klassen' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(i + 1),
    label: `Klasse ${i + 1}`,
  })),
];

export function PromptRulesPanel() {
  const [rules, setRules] = useState<PromptRule[]>([]);
  const [unanalyzedCount, setUnanalyzedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromptRule>>({});
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

  const startEdit = (rule: PromptRule) => {
    setEditingId(rule.id);
    setEditForm({
      rule_text: rule.rule_text,
      subject: rule.subject,
      grade_min: rule.grade_min,
      grade_max: rule.grade_max,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from('prompt_rules')
      .update({
        rule_text: editForm.rule_text,
        subject: editForm.subject || null,
        grade_min: editForm.grade_min || null,
        grade_max: editForm.grade_max || null,
      })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setRules(prev =>
        prev.map(r => r.id === editingId ? {
          ...r,
          rule_text: editForm.rule_text || r.rule_text,
          subject: editForm.subject || null,
          grade_min: editForm.grade_min || null,
          grade_max: editForm.grade_max || null,
        } : r)
      );
      toast({ title: 'Gespeichert', description: 'Regel wurde aktualisiert.' });
      setEditingId(null);
      setEditForm({});
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('prompt_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setRules(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Gelöscht', description: 'Regel wurde entfernt.' });
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
    const opt = SUBJECT_OPTIONS.find(o => o.value === subject);
    return opt?.label || subject;
  };

  const getGradeLabel = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Alle Klassen';
    if (min === max) return `Klasse ${min}`;
    return `Klasse ${min || '?'}–${max || '?'}`;
  };

  const activeCount = rules.filter(r => r.is_active).length;

  const handleSubjectChange = (val: string) => {
    setEditForm(prev => ({ ...prev, subject: val === '_all' ? null : val }));
  };

  const handleGradeMinChange = (val: string) => {
    const num = val === '_all' ? null : Number(val);
    setEditForm(prev => ({
      ...prev,
      grade_min: num,
      grade_max: num && prev.grade_max && prev.grade_max < num ? num : prev.grade_max ?? num,
    }));
  };

  const handleGradeMaxChange = (val: string) => {
    const num = val === '_all' ? null : Number(val);
    setEditForm(prev => ({
      ...prev,
      grade_max: num,
      grade_min: num && prev.grade_min && prev.grade_min > num ? num : prev.grade_min ?? num,
    }));
  };

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
                  {editingId === rule.id ? (
                    /* ---- Edit mode ---- */
                    <div className="space-y-3">
                      <Textarea
                        value={editForm.rule_text || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, rule_text: e.target.value }))}
                        className="text-sm min-h-[60px]"
                        placeholder="Regeltext…"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Fach</label>
                          <Select
                            value={editForm.subject || '_all'}
                            onValueChange={handleSubjectChange}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUBJECT_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Klasse von</label>
                          <Select
                            value={editForm.grade_min != null ? String(editForm.grade_min) : '_all'}
                            onValueChange={handleGradeMinChange}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADE_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Klasse bis</label>
                          <Select
                            value={editForm.grade_max != null ? String(editForm.grade_max) : '_all'}
                            onValueChange={handleGradeMaxChange}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADE_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1 text-xs"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs">
                            <X className="w-3 h-3 mr-1" />
                            Abbrechen
                          </Button>
                          <Button size="sm" onClick={saveEdit} className="text-xs">
                            <Save className="w-3 h-3 mr-1" />
                            Speichern
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ---- View mode ---- */
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer group"
                        onClick={() => startEdit(rule)}
                        title="Klicken zum Bearbeiten"
                      >
                        <p className="text-sm font-medium leading-relaxed group-hover:text-primary transition-colors">
                          {rule.rule_text}
                          <Pencil className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
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
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
