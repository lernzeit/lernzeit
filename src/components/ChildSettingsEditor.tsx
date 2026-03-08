import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  ChevronDown, 
  Clock, 
  BookOpen, 
  Languages, 
  GraduationCap, 
  Globe, 
  Atom, 
  Leaf, 
  FlaskConical, 
  Columns3,
  TreePine,
  Save,
  Loader2,
  Calendar,
  Crown,
  Info
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumFeature } from '@/components/PremiumGate';
import { isSubjectAvailableForGrade } from '@/lib/category';

interface ChildSettingsEditorProps {
  childId: string;
  childName: string;
  parentId: string;
  currentGrade?: number;
  onSettingsChanged?: () => void;
}

interface ChildSettings {
  weekday_max_minutes: number;
  weekend_max_minutes: number;
  math_seconds_per_task: number;
  german_seconds_per_task: number;
  science_seconds_per_task: number;
  english_seconds_per_task: number;
  geography_seconds_per_task: number;
  history_seconds_per_task: number;
  physics_seconds_per_task: number;
  biology_seconds_per_task: number;
  chemistry_seconds_per_task: number;
  latin_seconds_per_task: number;
}

interface SubjectVisibility {
  [subject: string]: boolean;
}

interface SubjectPriority {
  [subject: string]: boolean;
}

const PremiumBadge = () => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary gap-1 font-normal">
    <Crown className="h-2.5 w-2.5" />
    Premium
  </Badge>
);

const SUBJECTS = [
  { key: 'math', name: 'Mathematik', icon: BookOpen },
  { key: 'german', name: 'Deutsch', icon: Languages },
  { key: 'science', name: 'Sachkunde', icon: TreePine },
  { key: 'english', name: 'Englisch', icon: GraduationCap },
  { key: 'geography', name: 'Geographie', icon: Globe },
  { key: 'history', name: 'Geschichte', icon: Clock },
  { key: 'physics', name: 'Physik', icon: Atom },
  { key: 'biology', name: 'Biologie', icon: Leaf },
  { key: 'chemistry', name: 'Chemie', icon: FlaskConical },
  { key: 'latin', name: 'Latein', icon: Columns3 },
];

const DEFAULT_SETTINGS: ChildSettings = {
  weekday_max_minutes: 30,
  weekend_max_minutes: 60,
  math_seconds_per_task: 30,
  german_seconds_per_task: 30,
  science_seconds_per_task: 30,
  english_seconds_per_task: 30,
  geography_seconds_per_task: 30,
  history_seconds_per_task: 30,
  physics_seconds_per_task: 30,
  biology_seconds_per_task: 30,
  chemistry_seconds_per_task: 30,
  latin_seconds_per_task: 30,
};

export function ChildSettingsEditor({ childId, childName, parentId, currentGrade, onSettingsChanged }: ChildSettingsEditorProps) {
  const [settings, setSettings] = useState<ChildSettings>(DEFAULT_SETTINGS);
  const [visibility, setVisibility] = useState<SubjectVisibility>({});
  const [priorities, setPriorities] = useState<SubjectPriority>({});
  const [grade, setGrade] = useState<number>(currentGrade || 1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isPremium, isTrialing } = useSubscription();
  const hasPremiumAccess = isPremium || isTrialing;
  const [hasExplicitVisibility, setHasExplicitVisibility] = useState(false);

  useEffect(() => {
    if (childId) {
      loadSettings();
    }
  }, [childId]);

  useEffect(() => {
    if (!hasExplicitVisibility || !hasPremiumAccess) {
      applyGradeDefaults(grade);
    }
  }, [grade]);

  const applyGradeDefaults = (g: number) => {
    const newVisibility: SubjectVisibility = {};
    SUBJECTS.forEach(s => {
      newVisibility[s.key] = isSubjectAvailableForGrade(s.key, g);
    });
    setVisibility(newVisibility);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('child_settings')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData) {
        setSettings({
          weekday_max_minutes: settingsData.weekday_max_minutes,
          weekend_max_minutes: settingsData.weekend_max_minutes,
          math_seconds_per_task: settingsData.math_seconds_per_task,
          german_seconds_per_task: settingsData.german_seconds_per_task,
          science_seconds_per_task: (settingsData as any).science_seconds_per_task ?? 30,
          english_seconds_per_task: settingsData.english_seconds_per_task,
          geography_seconds_per_task: settingsData.geography_seconds_per_task,
          history_seconds_per_task: settingsData.history_seconds_per_task,
          physics_seconds_per_task: settingsData.physics_seconds_per_task,
          biology_seconds_per_task: settingsData.biology_seconds_per_task,
          chemistry_seconds_per_task: settingsData.chemistry_seconds_per_task,
          latin_seconds_per_task: settingsData.latin_seconds_per_task,
        });
      }

      const { data: visibilityData, error: visibilityError } = await supabase
        .from('child_subject_visibility')
        .select('subject, is_visible')
        .eq('child_id', childId);

      if (visibilityError) throw visibilityError;

      if (visibilityData && visibilityData.length > 0) {
        setHasExplicitVisibility(true);
        const visibilityMap: SubjectVisibility = {};
        SUBJECTS.forEach(s => {
          visibilityMap[s.key] = isSubjectAvailableForGrade(s.key, grade);
        });
        visibilityData.forEach(v => {
          visibilityMap[v.subject] = v.is_visible;
        });
        setVisibility(visibilityMap);
      } else {
        setHasExplicitVisibility(false);
        applyGradeDefaults(grade);
      }

      const priorityMap: SubjectPriority = {};
      SUBJECTS.forEach(s => {
        priorityMap[s.key] = false;
      });
      
      try {
        const { data: priorityData } = await supabase
          .from('child_subject_visibility')
          .select('subject, is_priority')
          .eq('child_id', childId) as any;

        if (priorityData) {
          priorityData.forEach((p: any) => {
            priorityMap[p.subject] = p.is_priority ?? false;
          });
        }
      } catch {
        // Column may not exist yet
      }

      setPriorities(priorityMap);
    } catch (error) {
      console.error('Error loading child settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error: gradeError } = await supabase
        .from('profiles')
        .update({ grade })
        .eq('id', childId);

      if (gradeError) throw gradeError;

      const { data: existingSettings } = await supabase
        .from('child_settings')
        .select('id')
        .eq('child_id', childId)
        .maybeSingle();

      if (existingSettings) {
        const { error: settingsError } = await supabase
          .from('child_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('child_id', childId);

        if (settingsError) throw settingsError;
      } else {
        const { error: settingsError } = await supabase
          .from('child_settings')
          .insert({
            parent_id: parentId,
            child_id: childId,
            ...settings,
          });

        if (settingsError) throw settingsError;
      }

      for (const subject of SUBJECTS) {
        const { data: existingVisibility } = await supabase
          .from('child_subject_visibility')
          .select('id')
          .eq('child_id', childId)
          .eq('subject', subject.key)
          .maybeSingle();

        if (existingVisibility) {
          const { error: visibilityError } = await supabase
            .from('child_subject_visibility')
            .update({
              is_visible: visibility[subject.key] ?? true,
              is_priority: priorities[subject.key] ?? false,
              updated_at: new Date().toISOString(),
            } as any)
            .eq('child_id', childId)
            .eq('subject', subject.key);

          if (visibilityError) throw visibilityError;
        } else {
          const { error: visibilityError } = await supabase
            .from('child_subject_visibility')
            .insert({
              parent_id: parentId,
              child_id: childId,
              subject: subject.key,
              is_visible: visibility[subject.key] ?? true,
              is_priority: priorities[subject.key] ?? false,
            } as any);

          if (visibilityError) throw visibilityError;
        }
      }

      toast({
        title: "Gespeichert",
        description: `Einstellungen für ${childName} wurden aktualisiert.`,
      });

      onSettingsChanged?.();
    } catch (error) {
      console.error('Error saving child settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof ChildSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSubjectVisibility = (subject: string) => {
    setHasExplicitVisibility(true);
    setVisibility(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  const toggleSubjectPriority = (subject: string) => {
    setPriorities(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableSubjects = SUBJECTS.filter(s => isSubjectAvailableForGrade(s.key, grade));

  return (
    <div className="space-y-4">
      {/* Grade Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Klassenstufe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Klasse</Label>
            <Select 
              value={grade.toString()} 
              onValueChange={(value) => setGrade(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Klasse wählen" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <SelectItem key={g} value={g.toString()}>
                    Klasse {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Screen Time Limits */}
      <PremiumFeature 
        featureName="Anpassbare Bildschirmzeit-Limits"
        onUpgradeClick={() => toast({ title: "Upgrade zu Premium", description: "Diese Funktion ist nur für Premium-Nutzer verfügbar." })}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bildschirmzeit-Limits
              </CardTitle>
              <PremiumBadge />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Wochentags (Min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={settings.weekday_max_minutes}
                  onChange={(e) => updateSetting('weekday_max_minutes', parseInt(e.target.value) || 30)}
                  disabled={!hasPremiumAccess}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Wochenende (Min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={settings.weekend_max_minutes}
                  onChange={(e) => updateSetting('weekend_max_minutes', parseInt(e.target.value) || 60)}
                  disabled={!hasPremiumAccess}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </PremiumFeature>

      {/* Merged Subject Settings - each subject is a collapsible */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Fächer
            </CardTitle>
            <PremiumBadge />
          </div>
          <CardDescription className="text-xs">
            Fächer für Klasse {grade} verwalten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 mb-3">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Bei Klassenwechsel werden Fächer automatisch angepasst.
            </p>
          </div>
          {availableSubjects.map((subject) => {
            const Icon = subject.icon;
            const isVisible = visibility[subject.key] ?? true;
            const isPriority = priorities[subject.key] ?? false;
            const settingKey = `${subject.key}_seconds_per_task` as keyof ChildSettings;
            const bonus = settings[settingKey];

            return (
              <SubjectRow
                key={subject.key}
                icon={Icon}
                name={subject.name}
                isVisible={isVisible}
                isPriority={isPriority}
                bonus={bonus}
                hasPremiumAccess={hasPremiumAccess}
                onToggleVisibility={() => toggleSubjectVisibility(subject.key)}
                onTogglePriority={() => toggleSubjectPriority(subject.key)}
                onBonusChange={(v) => updateSetting(settingKey, v)}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={saveSettings} 
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Speichern...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Einstellungen speichern
          </>
        )}
      </Button>
    </div>
  );
}

// Individual subject row as collapsible
function SubjectRow({
  icon: Icon,
  name,
  isVisible,
  isPriority,
  bonus,
  hasPremiumAccess,
  onToggleVisibility,
  onTogglePriority,
  onBonusChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  isVisible: boolean;
  isPriority: boolean;
  bonus: number;
  hasPremiumAccess: boolean;
  onToggleVisibility: () => void;
  onTogglePriority: () => void;
  onBonusChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
            !isVisible
              ? 'bg-muted/30 opacity-60'
              : isPriority
              ? 'bg-primary/5 border border-primary/15'
              : 'bg-muted/50 hover:bg-muted/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium">{name}</span>
            {isPriority && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                Fokus
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{bonus}s</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 mr-2 mb-2 mt-1 p-3 rounded-lg border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sichtbar</Label>
            <Switch
              checked={isVisible}
              onCheckedChange={onToggleVisibility}
              disabled={!hasPremiumAccess}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Schwerpunkt</Label>
              {!hasPremiumAccess && <Crown className="h-3 w-3 text-primary" />}
            </div>
            <Switch
              checked={isPriority}
              onCheckedChange={onTogglePriority}
              disabled={!hasPremiumAccess}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Bonus je Aufgabe</Label>
              {!hasPremiumAccess && <Crown className="h-3 w-3 text-primary" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={5}
                max={300}
                value={bonus === 0 ? '' : bonus}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { onBonusChange(0); return; }
                  const num = parseInt(raw);
                  if (!isNaN(num)) onBonusChange(num);
                }}
                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 5) onBonusChange(5); }}
                className="w-16 h-7 text-center text-xs"
                disabled={!hasPremiumAccess}
              />
              <span className="text-xs text-muted-foreground">s</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
