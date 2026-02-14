
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Languages, GraduationCap, ArrowLeft, Globe, Clock, Atom, Leaf, FlaskConical, Columns3, Star } from 'lucide-react';
import { useChildSettings } from '@/hooks/useChildSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface CategorySelectorProps {
  grade: number;
  onCategorySelect: (category: 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin') => void;
  onBack: () => void;
}

export function CategorySelector({ grade, onCategorySelect, onBack }: CategorySelectorProps) {
  const { user } = useAuth();
  const { settings, loading } = useChildSettings(user?.id || '');
  const [visibleSubjects, setVisibleSubjects] = useState<Set<string>>(new Set());
  const [prioritySubjects, setPrioritySubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadSubjectVisibility();
    } else {
      setVisibleSubjects(new Set(['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin']));
    }
  }, [user?.id]);

  const loadSubjectVisibility = async () => {
    if (!user?.id) return;

    try {
      // Get parent-child relationship first
      const { data: relationships } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', user.id)
        .maybeSingle();

      if (relationships?.parent_id) {
        // Get subject visibility settings
        const { data: visibilitySettings } = await supabase
          .from('child_subject_visibility')
          .select('subject, is_visible, is_priority')
          .eq('parent_id', relationships.parent_id)
          .eq('child_id', user.id);

        if (visibilitySettings && visibilitySettings.length > 0) {
          const allSubjects = new Set(['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin']);
          const priorities = new Set<string>();
          
          visibilitySettings.forEach(setting => {
            if (!setting.is_visible) {
              allSubjects.delete(setting.subject);
            }
            if (setting.is_priority) {
              priorities.add(setting.subject);
            }
          });
          
          setVisibleSubjects(allSubjects);
          setPrioritySubjects(priorities);
        } else {
          setVisibleSubjects(new Set(['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin']));
        }
      } else {
        setVisibleSubjects(new Set(['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin']));
      }
    } catch (error) {
      console.error('Error loading subject visibility:', error);
      setVisibleSubjects(new Set(['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin']));
    }
  };

  const getMinutesForCategory = (categoryId: string) => {
    console.log('🔍 CategorySelector getMinutesForCategory:', { categoryId, settings, loading });
    if (!settings) return 1; // Default: 1 minute per task
    
    const seconds = (() => {
      switch (categoryId) {
        case 'math': return settings.math_seconds_per_task;
        case 'german': return settings.german_seconds_per_task;
        case 'english': return settings.english_seconds_per_task;
        case 'geography': return settings.geography_seconds_per_task;
        case 'history': return settings.history_seconds_per_task;
        case 'physics': return settings.physics_seconds_per_task;
        case 'biology': return settings.biology_seconds_per_task;
        case 'chemistry': return settings.chemistry_seconds_per_task;
        case 'latin': return settings.latin_seconds_per_task;
        default: return 30; // Default: 30 seconds per task
      }
    })();
    
    console.log(`🔍 CategorySelector ${categoryId}: ${seconds} seconds`);
    return seconds;
  };

  const categories = [
    {
      id: 'math' as const,
      name: 'Mathematik',
      description: 'Rechnen und Zahlen',
      icon: BookOpen,
      color: 'bg-blue-500',
      emoji: '🔢'
    },
    {
      id: 'german' as const,
      name: 'Deutsch',
      description: 'Sprache und Wörter',
      icon: Languages,
      color: 'bg-green-500',
      emoji: '📚'
    },
    {
      id: 'english' as const,
      name: 'Englisch',
      description: 'English words',
      icon: GraduationCap,
      color: 'bg-purple-500',
      emoji: '🇬🇧'
    },
    {
      id: 'geography' as const,
      name: 'Geographie',
      description: 'Länder und Kontinente',
      icon: Globe,
      color: 'bg-teal-500',
      emoji: '🌍'
    },
    {
      id: 'history' as const,
      name: 'Geschichte',
      description: 'Vergangene Ereignisse',
      icon: Clock,
      color: 'bg-amber-500',
      emoji: '🏛️'
    },
    {
      id: 'physics' as const,
      name: 'Physik',
      description: 'Naturgesetze',
      icon: Atom,
      color: 'bg-cyan-500',
      emoji: '⚡'
    },
    {
      id: 'biology' as const,
      name: 'Biologie',
      description: 'Lebewesen',
      icon: Leaf,
      color: 'bg-emerald-500',
      emoji: '🌱'
    },
    {
      id: 'chemistry' as const,
      name: 'Chemie',
      description: 'Stoffe und Reaktionen',
      icon: FlaskConical,
      color: 'bg-orange-500',
      emoji: '🧪'
    },
    {
      id: 'latin' as const,
      name: 'Latein',
      description: 'Lateinische Sprache',
      icon: Columns3,
      color: 'bg-rose-500',
      emoji: '🏺'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl">
                Klasse {grade} - Wähle ein Fach
              </CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Motivation Card - Now at the top */}
        <Card className="shadow-card bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="font-bold text-green-800 mb-1">Verdiene Handyzeit!</h3>
            <p className="text-sm text-green-700">
              Löse 5 Aufgaben und verdiene wertvolle Bildschirmzeit
            </p>
          </CardContent>
        </Card>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-4">
          {categories
            .filter(category => visibleSubjects.has(category.id))
            .sort((a, b) => {
              const aPri = prioritySubjects.has(a.id) ? 0 : 1;
              const bPri = prioritySubjects.has(b.id) ? 0 : 1;
              return aPri - bPri;
            })
            .map((category) => {
              const IconComponent = category.icon;
              const seconds = getMinutesForCategory(category.id);
              const isPriority = prioritySubjects.has(category.id);
              
              return (
              <Card
                key={category.id}
                className={`shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer ${isPriority ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => onCategorySelect(category.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center text-white text-xl`}>
                      {category.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{category.name}</h3>
                        {isPriority && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Star className="w-3 h-3" />
                            Schwerpunkt
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">
                          +{seconds} Sek pro Aufgabe
                        </span>
                      </div>
                    </div>
                    <IconComponent className="w-5 h-5 text-muted-foreground" />
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
