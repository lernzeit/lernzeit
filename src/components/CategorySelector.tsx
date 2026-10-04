import React, { useState, useEffect } from 'react';
import { useSeitenanfang } from '@/hooks/useTastatur';
import { Button } from '@/components/ui/button';
import { BookOpen, Languages, GraduationCap, ArrowLeft, Globe, Clock, Atom, Leaf, FlaskConical, Columns3, TreePine, Sparkles, Calendar } from 'lucide-react';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAuth } from '@/hooks/useAuth';
import { useAgeGroup } from '@/hooks/useAgeGroup';
import { useHefte } from '@/hooks/useHefte';
import { HeftRegal } from '@/components/child/Hefte';
import { supabase } from '@/lib/supabase';
import { format, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';

type SubjectId = 'math' | 'german' | 'english' | 'science' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin';

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
  subject: string;
  topic: string;
  test_date: string | null;
  created_at: string;
  grade: number;
  plan_data: LearningPlanDay[] | null;
}

interface CategorySelectorProps {
  grade: number;
  onCategorySelect: (category: SubjectId, topicHint?: string, planId?: string) => void;
  onBack: () => void;
}

const categories: { id: SubjectId; name: string; shortName: string; icon: any; color: string; emoji: string }[] = [
  { id: 'math',      name: 'Mathematik',  shortName: 'Mathe',      icon: BookOpen,      color: 'bg-blue-500',    emoji: '🔢' },
  { id: 'german',    name: 'Deutsch',     shortName: 'Deutsch',    icon: Languages,     color: 'bg-green-500',   emoji: '📚' },
  { id: 'science',   name: 'Sachkunde',   shortName: 'Sachkunde',  icon: TreePine,      color: 'bg-lime-500',    emoji: '🌿' },
  { id: 'english',   name: 'Englisch',    shortName: 'Englisch',   icon: GraduationCap, color: 'bg-purple-500',  emoji: '🔤' },
  { id: 'geography', name: 'Geographie',  shortName: 'Geo',        icon: Globe,         color: 'bg-teal-500',    emoji: '🌍' },
  { id: 'history',   name: 'Geschichte',  shortName: 'Geschichte', icon: Clock,         color: 'bg-amber-500',   emoji: '🏛️' },
  { id: 'physics',   name: 'Physik',      shortName: 'Physik',     icon: Atom,          color: 'bg-cyan-500',    emoji: '⚡' },
  { id: 'biology',   name: 'Biologie',    shortName: 'Bio',        icon: Leaf,          color: 'bg-emerald-500', emoji: '🌱' },
  { id: 'chemistry', name: 'Chemie',      shortName: 'Chemie',     icon: FlaskConical,  color: 'bg-orange-500',  emoji: '🧪' },
  { id: 'latin',     name: 'Latein',      shortName: 'Latein',     icon: Columns3,      color: 'bg-rose-500',    emoji: '🏺' },
];

export function CategorySelector({ grade, onCategorySelect, onBack }: CategorySelectorProps) {
  const { user } = useAuth();
  useSeitenanfang();
  const { settings, loading } = useChildSettings(user?.id || '');
  const age = useAgeGroup(grade);
  const hefte = useHefte(user?.id, grade);
  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);

  useEffect(() => {
    if (user?.id) loadActiveLearningPlan();
  }, [user?.id, grade]);

  const loadActiveLearningPlan = async () => {
    if (!user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('learning_plans')
        .select('id, subject, topic, test_date, created_at, grade, plan_data')
        .eq('child_id', user.id)
        .or(`test_date.gte.${today},test_date.is.null`)
        .order('test_date', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      setActivePlan(data as unknown as LearningPlan | null);
    } catch {
      setActivePlan(null);
    }
  };

  const getSecondsForCategory = (categoryId: string) => {
    if (!settings) return 30;
    switch (categoryId) {
      case 'math': return settings.math_seconds_per_task;
      case 'german': return settings.german_seconds_per_task;
      case 'science': return settings.science_seconds_per_task;
      case 'english': return settings.english_seconds_per_task;
      case 'geography': return settings.geography_seconds_per_task;
      case 'history': return settings.history_seconds_per_task;
      case 'physics': return settings.physics_seconds_per_task;
      case 'biology': return settings.biology_seconds_per_task;
      case 'chemistry': return settings.chemistry_seconds_per_task;
      case 'latin': return settings.latin_seconds_per_task;
      default: return 30;
    }
  };

  const isYoung = age.group === 'young';

  return (
    <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom">
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-10 pt-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Zurück">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={`${isYoung ? 'text-2xl' : 'text-xl'} font-extrabold`}>Was möchtest du lernen?</h1>
        </div>

        {/* Lernplan der Eltern fuer eine Klassenarbeit */}
        {activePlan && (() => {
          // Kalendertage, nicht volle 24 Stunden: Ein Plan von 21 Uhr ist am
          // naechsten Nachmittag bei Tag 2 (frueher noch bei Tag 1).
          const planDays = Array.isArray(activePlan.plan_data) ? activePlan.plan_data : [];
          const daysSinceCreated = differenceInCalendarDays(new Date(), new Date(activePlan.created_at));
          const currentDay = Math.min(daysSinceCreated + 1, Math.max(planDays.length, 1));
          const subjectName = categories.find(c => c.id === activePlan.subject)?.shortName || activePlan.subject;
          const todaysPlan = planDays[currentDay - 1];
          const topicHint = todaysPlan
            ? `${activePlan.topic} – Schwerpunkt: ${todaysPlan.focus}`
            : activePlan.topic;

          return (
            <button
              type="button"
              className="heft-karo block w-full rounded-[24px] bg-card p-5 text-left ring-2 ring-inset ring-primary/60 transition-transform active:scale-[0.99]"
              onClick={() => onCategorySelect(activePlan.subject as SubjectId, topicHint, activePlan.id)}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                Dein Lernplan, {subjectName}
              </div>
              <p className="mt-1 text-lg font-extrabold leading-snug text-tinte">
                {todaysPlan ? `Heute: ${todaysPlan.focus}` : activePlan.topic}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span>Tag {currentDay} von {Math.max(planDays.length, 1)}</span>
                {activePlan.test_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Test am {format(new Date(activePlan.test_date), 'd. MMM', { locale: de })}
                  </span>
                )}
              </p>
            </button>
          );
        })()}

        <HeftRegal
          titel={activePlan ? 'Oder ein anderes Fach' : 'Wähle ein Fach zum Lernen'}
          hefte={hefte.hefte}
          onWaehlen={(fach) => onCategorySelect(fach)}
        />

        {!isYoung && (
          <p className="text-center text-sm text-muted-foreground">
            Für jede richtige Aufgabe gibt es Bildschirmzeit, {getSecondsForCategory('math')} Sekunden in Mathe.
          </p>
        )}
      </div>
    </div>
  );
}
