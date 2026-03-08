import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { toGermanCategory, isSubjectAvailableForGrade } from '@/lib/category';
import {
  Sparkles,
  Loader2,
  Calendar,
  BookOpen,
  Target,
  Clock,
  Lightbulb,
  CheckCircle2,
  Crown,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface LinkedChild {
  id: string;
  name: string | null;
  grade: number;
}

interface LearningPlanDay {
  day: number;
  title: string;
  focus: string;
  goals: string[];
  exercises: string[];
  appCategory: string;
  estimatedMinutes: number;
  tip: string;
}

interface LearningPlan {
  id: string;
  child_id: string;
  child_name: string;
  grade: number;
  subject: string;
  topic: string;
  test_date: string | null;
  plan_data: LearningPlanDay[];
  created_at: string;
}

interface Props {
  userId: string;
  linkedChildren: LinkedChild[];
  /** When set, locks to this child – hides the child dropdown and filters plans */
  fixedChildId?: string;
}

const ALL_SUBJECTS = [
  { key: 'math', name: 'Mathematik' },
  { key: 'german', name: 'Deutsch' },
  { key: 'science', name: 'Sachkunde' },
  { key: 'english', name: 'Englisch' },
  { key: 'geography', name: 'Geographie' },
  { key: 'history', name: 'Geschichte' },
  { key: 'physics', name: 'Physik' },
  { key: 'biology', name: 'Biologie' },
  { key: 'chemistry', name: 'Chemie' },
  { key: 'latin', name: 'Latein' },
];

export function LearningPlanGenerator({ userId, linkedChildren, fixedChildId }: Props) {
  const { toast } = useToast();
  const { isPremium, isTrialing } = useSubscription();
  const hasPremiumAccess = isPremium || isTrialing;

  const [selectedChildId, setSelectedChildId] = useState<string>(fixedChildId || '');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [testDate, setTestDate] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savedPlans, setSavedPlans] = useState<LearningPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const selectedChild = linkedChildren.find(c => c.id === selectedChildId);
  const availableSubjects = selectedChild
    ? ALL_SUBJECTS.filter(s => isSubjectAvailableForGrade(s.key, selectedChild.grade))
    : ALL_SUBJECTS;

  useEffect(() => {
    if (fixedChildId) {
      setSelectedChildId(fixedChildId);
    } else if (linkedChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(linkedChildren[0].id);
    }
  }, [linkedChildren, fixedChildId]);

  useEffect(() => {
    loadSavedPlans();
  }, [userId]);

  const loadSavedPlans = async () => {
    try {
      setLoadingPlans(true);
      let query = supabase
        .from('learning_plans')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Filter to specific child when embedded under a child card
      if (fixedChildId) {
        query = query.eq('child_id', fixedChildId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSavedPlans((data as any[]) || []);
    } catch {
      console.error('Error loading plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedChildId || !subject || !topic.trim()) {
      toast({
        title: 'Fehlende Angaben',
        description: 'Bitte wähle ein Kind, ein Fach und gib das Thema ein.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await supabase.functions.invoke('generate-learning-plan', {
        body: {
          childId: selectedChildId,
          childName: selectedChild?.name || 'Kind',
          grade: selectedChild?.grade || 1,
          subject,
          topic: topic.trim(),
          testDate: testDate || null,
          additionalInfo: additionalInfo.trim() || null,
        },
      });

      if (resp.error) throw resp.error;

      const result = resp.data;
      if (result?.error) {
        if (result.error.includes('Premium')) {
          toast({ title: 'Premium erforderlich', description: result.error, variant: 'destructive' });
        } else {
          throw new Error(result.error);
        }
        return;
      }

      toast({
        title: '🎉 Lernplan erstellt!',
        description: `Der 5-Tage-Lernplan für ${selectedChild?.name || 'Ihr Kind'} ist fertig.`,
      });

      // Reset form
      setTopic('');
      setTestDate('');
      setAdditionalInfo('');
      loadSavedPlans();
    } catch (err: any) {
      console.error('Generate error:', err);
      toast({
        title: 'Fehler',
        description: err?.message || 'Lernplan konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase.from('learning_plans').delete().eq('id', planId);
      if (error) throw error;
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      toast({ title: 'Lernplan gelöscht' });
    } catch {
      toast({ title: 'Fehler', description: 'Konnte nicht gelöscht werden.', variant: 'destructive' });
    }
  };

  if (!hasPremiumAccess) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">KI-Lernplan-Generator</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Lassen Sie die KI einen personalisierten 5-Tage-Lernplan erstellen – perfekt 
            abgestimmt auf die Klassenstufe und das Prüfungsthema Ihres Kindes.
          </p>
          <Badge variant="secondary" className="gap-1">
            <Crown className="h-3 w-3" /> Premium-Feature
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (linkedChildren.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Verknüpfen Sie zuerst ein Kind, um einen Lernplan zu erstellen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            KI-Lernplan erstellen
          </CardTitle>
          <CardDescription>
            Beschreiben Sie die Prüfung oder das Thema – die KI erstellt einen 5-Tage-Lernplan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Child Selection – only when not fixed to a single child */}
          {!fixedChildId && (
            <div className="space-y-2">
              <Label>Kind auswählen</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kind wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {linkedChildren.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name || 'Unbenannt'} (Klasse {child.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label>Fach</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Fach wählen..." />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label>Thema / Prüfung</Label>
            <Textarea
              placeholder="z.B. 'Mathe-Test über Bruchrechnung' oder 'Deutscharbeit: Erörterung schreiben'"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              rows={2}
            />
          </div>

          {/* Test Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Testdatum (optional)
            </Label>
            <Input
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
            />
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <Label>Zusätzliche Hinweise (optional)</Label>
            <Input
              placeholder="z.B. 'Schwäche bei Textaufgaben' oder 'Nur 15 Min pro Tag'"
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !selectedChildId || !subject || !topic.trim()}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                KI erstellt Lernplan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Lernplan generieren
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Saved Plans */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Gespeicherte Lernpläne
          {savedPlans.length > 0 && (
            <Badge variant="secondary" className="text-xs">{savedPlans.length}</Badge>
          )}
        </h3>

        {loadingPlans ? (
          <Card>
            <CardContent className="py-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : savedPlans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Lernpläne erstellt. Probieren Sie es aus!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {savedPlans.map(plan => (
              <LearningPlanCard key={plan.id} plan={plan} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DayProgress {
  totalQuestions: number;
  correctAnswers: number;
  sessions: number;
}

function normalizeCategoryKey(cat: string): string {
  const mapping: Record<string, string> = {
    'mathematik': 'math', 'mathe': 'math',
    'deutsch': 'german', 'englisch': 'english',
    'sachkunde': 'science', 'sachunterricht': 'science',
    'erdkunde': 'geography', 'geographie': 'geography',
    'geschichte': 'history', 'physik': 'physics',
    'biologie': 'biology', 'chemie': 'chemistry',
    'latein': 'latin',
  };
  return mapping[cat.toLowerCase()] || cat.toLowerCase();
}

function usePlanProgress(plan: LearningPlan) {
  const [dayProgress, setDayProgress] = useState<Map<number, DayProgress>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const days = Array.isArray(plan.plan_data) ? plan.plan_data : [];

  useEffect(() => {
    if (days.length === 0) return;

    const planStart = new Date(plan.created_at);
    planStart.setHours(0, 0, 0, 0);

    // End = test_date or created + days count
    const planEnd = plan.test_date
      ? new Date(plan.test_date)
      : new Date(planStart.getTime() + days.length * 24 * 60 * 60 * 1000);
    planEnd.setHours(23, 59, 59, 999);

    const fetchProgress = async () => {
      try {
        const { data } = await supabase
          .from('game_sessions')
          .select('session_date, correct_answers, total_questions, category')
          .eq('user_id', plan.child_id)
          .gte('session_date', planStart.toISOString())
          .lte('session_date', planEnd.toISOString())
          .order('session_date', { ascending: true });

        if (!data) { setLoaded(true); return; }

        // Filter to matching subject
        const matching = data.filter(s =>
          normalizeCategoryKey(s.category || '') === normalizeCategoryKey(plan.subject)
        );

        // Map sessions to plan days (day 0 = planStart, day 1 = planStart+1, etc.)
        const progress = new Map<number, DayProgress>();
        for (const session of matching) {
          const sessionDate = new Date(session.session_date!);
          const dayIndex = Math.floor(
            (sessionDate.getTime() - planStart.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (dayIndex < 0 || dayIndex >= days.length) continue;

          const existing = progress.get(dayIndex) || { totalQuestions: 0, correctAnswers: 0, sessions: 0 };
          existing.totalQuestions += session.total_questions;
          existing.correctAnswers += session.correct_answers;
          existing.sessions += 1;
          progress.set(dayIndex, existing);
        }

        setDayProgress(progress);
      } catch (err) {
        console.error('Error loading plan progress:', err);
      } finally {
        setLoaded(true);
      }
    };

    fetchProgress();
  }, [plan.child_id, plan.subject, plan.created_at, plan.test_date, days.length]);

  const totalStats = React.useMemo(() => {
    let practiced = 0, questions = 0, correct = 0;
    dayProgress.forEach(dp => {
      practiced++;
      questions += dp.totalQuestions;
      correct += dp.correctAnswers;
    });
    const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
    return { practiced, total: days.length, questions, correct, accuracy };
  }, [dayProgress, days.length]);

  return { dayProgress, totalStats, loaded };
}

function LearningPlanCard({ plan, onDelete }: { plan: LearningPlan; onDelete: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const days = Array.isArray(plan.plan_data) ? plan.plan_data : [];
  const createdDate = new Date(plan.created_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const { dayProgress, totalStats, loaded } = usePlanProgress(plan);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-start justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex-1 text-left space-y-1 hover:opacity-80 transition-opacity">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {plan.topic}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription className="text-xs space-x-2">
                  <span>{plan.child_name}</span>
                  <span>•</span>
                  <span>Klasse {plan.grade}</span>
                  <span>•</span>
                  <span>{toGermanCategory(plan.subject)}</span>
                  {plan.test_date && (
                    <>
                      <span>•</span>
                      <span>Test: {new Date(plan.test_date).toLocaleDateString('de-DE')}</span>
                    </>
                  )}
                </CardDescription>
                {/* Subtle progress summary */}
                {loaded && totalStats.questions > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex gap-0.5">
                      {days.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            dayProgress.has(i)
                              ? 'bg-primary'
                              : 'bg-muted-foreground/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {totalStats.practiced}/{totalStats.total} Tage geübt • {totalStats.accuracy}% richtig
                    </span>
                  </div>
                )}
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{createdDate}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(plan.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-3">
            <Accordion type="single" collapsible className="w-full">
              {days.map((day, idx) => {
                const dp = dayProgress.get(idx);
                const dayAccuracy = dp && dp.totalQuestions > 0
                  ? Math.round((dp.correctAnswers / dp.totalQuestions) * 100)
                  : null;

                return (
                  <AccordionItem key={idx} value={`day-${idx}`} className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-3 text-left flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          dp
                            ? 'bg-primary text-primary-foreground'
                            : idx === days.length - 1
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {dp ? <CheckCircle2 className="h-4 w-4" /> : (day.day || idx + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{day.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {day.estimatedMinutes} Min
                            <span className="mx-1">•</span>
                            {day.focus}
                          </p>
                        </div>
                        {dp && dayAccuracy !== null && (
                          <Badge
                            variant={dayAccuracy >= 70 ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                          >
                            {dp.correctAnswers}/{dp.totalQuestions} • {dayAccuracy}%
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 space-y-3">
                      {dp && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {dp.sessions} {dp.sessions === 1 ? 'Übungseinheit' : 'Übungseinheiten'} absolviert – {dp.correctAnswers} von {dp.totalQuestions} Aufgaben richtig ({dayAccuracy}%)
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Lernziele
                        </p>
                        <ul className="space-y-0.5">
                          {day.goals?.map((goal, gi) => (
                            <li key={gi} className="text-sm flex items-start gap-1.5">
                              <ChevronRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                              {goal}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Übungen
                        </p>
                        <ul className="space-y-0.5">
                          {day.exercises?.map((ex, ei) => (
                            <li key={ei} className="text-sm flex items-start gap-1.5">
                              <span className="text-primary font-medium shrink-0">{ei + 1}.</span>
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {day.tip && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{day.tip}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
