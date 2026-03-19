import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Languages, GraduationCap, ArrowLeft, Globe, Clock, Atom, Leaf, FlaskConical, Columns3, Star, TreePine, Sparkles, Calendar } from 'lucide-react';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAuth } from '@/hooks/useAuth';
import { useAgeGroup } from '@/hooks/useAgeGroup';
import { isSubjectAvailableForGrade } from '@/lib/category';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays } from 'date-fns';
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
  onCategorySelect: (category: SubjectId, topicHint?: string) => void;
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
  const { settings, loading } = useChildSettings(user?.id || '');
  const age = useAgeGroup(grade);
  const [visibleSubjects, setVisibleSubjects] = useState<Set<string>>(new Set());
  const [prioritySubjects, setPrioritySubjects] = useState<Set<string>>(new Set());
  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);

  // Grade-based default: only show subjects appropriate for this grade
  const getGradeDefaults = () => new Set(categories.filter(c => isSubjectAvailableForGrade(c.id, grade)).map(c => c.id));

  useEffect(() => {
    if (user?.id) {
      loadSubjectVisibility();
      loadActiveLearningPlan();
    } else {
      setVisibleSubjects(getGradeDefaults());
    }
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

  const loadSubjectVisibility = async () => {
    if (!user?.id) return;
    try {
      const { data: relationships } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', user.id)
        .limit(1);

      const relationship = relationships?.[0] || null;

      if (relationship?.parent_id) {
        const { data: visibilitySettings } = await supabase
          .from('child_subject_visibility')
          .select('subject, is_visible, is_priority')
          .eq('parent_id', relationship.parent_id)
          .eq('child_id', user.id);

        if (visibilitySettings && visibilitySettings.length > 0) {
          // Parent has explicit settings – use those
          const allSubjects = new Set<string>(categories.map(c => c.id));
          const priorities = new Set<string>();
          visibilitySettings.forEach(s => {
            if (!s.is_visible) allSubjects.delete(s.subject);
            if (s.is_priority) priorities.add(s.subject);
          });
          setVisibleSubjects(allSubjects);
          setPrioritySubjects(priorities);
        } else {
          // No parent overrides – use grade-based defaults
          setVisibleSubjects(getGradeDefaults());
        }
      } else {
        // No parent linked – use grade-based defaults
        setVisibleSubjects(getGradeDefaults());
      }
    } catch {
      setVisibleSubjects(getGradeDefaults());
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

  // Apply parent visibility (or grade defaults)
  const sortedCategories = categories
    .filter(c => visibleSubjects.has(c.id))
    .sort((a, b) => {
      const aPri = prioritySubjects.has(a.id) ? 0 : 1;
      const bPri = prioritySubjects.has(b.id) ? 0 : 1;
      return aPri - bPri;
    });

  const isYoung = age.group === 'young';

  return (
    <div className="min-h-screen bg-gradient-bg py-4 pt-safe-top pb-safe-bottom">
      <div className="page-container space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className={`${isYoung ? 'text-2xl' : 'text-xl'} font-bold`}>
            {isYoung ? '📖 Was möchtest du lernen?' : `Klasse ${grade} – Fach wählen`}
          </h1>
        </div>

        {/* Motivation */}
        <Card className="shadow-card bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200">
          <CardContent className={`${isYoung ? 'p-5' : 'p-4'} text-center`}>
            <div className={isYoung ? 'text-4xl mb-2' : 'text-3xl mb-2'}>🏆</div>
            <h3 className={`font-bold text-green-800 ${isYoung ? 'text-lg' : 'text-base'} mb-1`}>
              {isYoung ? 'Lerne und verdiene Handyzeit!' : 'Verdiene Handyzeit!'}
            </h3>
            {!isYoung && (
              <p className="text-sm text-green-700">
                Löse Aufgaben und verdiene wertvolle Bildschirmzeit
              </p>
            )}
          </CardContent>
        </Card>

        {/* Learning Plan Card */}
        {activePlan && (() => {
          const daysSinceCreated = differenceInDays(new Date(), new Date(activePlan.created_at));
          const currentDay = Math.min(daysSinceCreated + 1, 5);
          const subjectName = categories.find(c => c.id === activePlan.subject)?.shortName || activePlan.subject;
          
          // Get today's focus from plan_data for a more targeted topicHint
          const planDays = Array.isArray(activePlan.plan_data) ? activePlan.plan_data : [];
          const todaysPlan = planDays[currentDay - 1];
          const topicHint = todaysPlan 
            ? `${activePlan.topic} – Schwerpunkt: ${todaysPlan.focus}` 
            : activePlan.topic;
          
          return (
            <Card
              className="rounded-2xl border-2 border-primary/50 shadow-lg hover:scale-[1.02] cursor-pointer transition-all duration-300 bg-gradient-to-r from-primary/5 to-accent/5"
              onClick={() => onCategorySelect(activePlan.subject as SubjectId, topicHint)}
            >
              <CardContent className={`${isYoung ? 'p-5' : 'p-4'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`${isYoung ? 'text-lg' : 'text-base'} font-bold`}>📋 Dein Lernplan</h3>
                      <Badge variant="secondary" className="text-xs">{subjectName}</Badge>
                    </div>
                    <p className={`${isYoung ? 'text-sm' : 'text-xs'} text-muted-foreground font-medium mt-0.5 truncate`}>
                      {todaysPlan ? `Heute: ${todaysPlan.focus}` : activePlan.topic}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">Tag {currentDay} von 5</span>
                      {activePlan.test_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Test am {format(new Date(activePlan.test_date), 'd. MMM', { locale: de })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Categories */}
        <div className={`grid ${age.gridCols} gap-${isYoung ? '4' : '3'}`}>
          {sortedCategories.map((category) => {
            const seconds = getSecondsForCategory(category.id);
            const isPriority = prioritySubjects.has(category.id);

            if (isYoung) {
              // === YOUNG: big emoji tiles ===
              return (
                <Card
                  key={category.id}
                  className={`rounded-2xl border-2 shadow-lg hover:scale-105 cursor-pointer transition-all duration-300 ${isPriority ? 'ring-2 ring-primary border-primary' : ''}`}
                  onClick={() => onCategorySelect(category.id)}
                >
                  <CardContent className="p-5 text-center">
                    <div className={`w-16 h-16 mx-auto ${category.color} rounded-full flex items-center justify-center text-3xl mb-3`}>
                      {category.emoji}
                    </div>
                    <h3 className="text-lg font-bold">{category.shortName}</h3>
                    {isPriority && (
                      <Badge variant="default" className="mt-2 text-xs gap-1">
                        <Star className="w-3 h-3" /> Wichtig
                      </Badge>
                    )}
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="text-xs text-green-600 font-medium">+{seconds}s ⏱️</span>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // === TEEN: compact list cards ===
            const IconComponent = category.icon;
            return (
              <Card
                key={category.id}
                className={`shadow-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] ${isPriority ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => onCategorySelect(category.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${category.color} rounded-full flex items-center justify-center text-white text-lg`}>
                      {category.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{category.name}</h3>
                        {isPriority && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Star className="w-3 h-3" /> Schwerpunkt
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">+{seconds} Sek pro Aufgabe</span>
                      </div>
                    </div>
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
