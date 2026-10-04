import React, { useState, useEffect } from 'react';
import { useSeitenanfang } from '@/hooks/useTastatur';
import { Button } from '@/components/ui/button';
import { BookOpen, Languages, GraduationCap, ArrowLeft, Globe, Clock, Atom, Leaf, FlaskConical, Columns3, TreePine } from 'lucide-react';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAuth } from '@/hooks/useAuth';
import { useAgeGroup } from '@/hooks/useAgeGroup';
import { useHefte } from '@/hooks/useHefte';
import { HeftRegal } from '@/components/child/Hefte';
import { LernplanListe, useLernplaene } from '@/components/child/Lernplaene';
import { de } from 'date-fns/locale';

type SubjectId = 'math' | 'german' | 'english' | 'science' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin';

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
  const plaene = useLernplaene(user?.id);

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

        {/* Lernplaene der Eltern fuer Klassenarbeiten (alle laufenden, 04.10.2026) */}
        <LernplanListe
          plaene={plaene}
          hefte={hefte.hefte}
          onStart={(fach, topicHint, planId) => onCategorySelect(fach as SubjectId, topicHint, planId)}
        />

        <HeftRegal
          titel={plaene.length ? 'Oder ein Fach frei wählen' : 'Wähle ein Fach zum Lernen'}
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
