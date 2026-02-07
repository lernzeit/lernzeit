import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Save,
  Loader2,
  Settings2,
  Calendar
} from 'lucide-react';

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

const SUBJECTS = [
  { key: 'math', name: 'Mathematik', icon: BookOpen },
  { key: 'german', name: 'Deutsch', icon: Languages },
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
  english_seconds_per_task: 30,
  geography_seconds_per_task: 30,
  history_seconds_per_task: 30,
  physics_seconds_per_task: 30,
  biology_seconds_per_task: 30,
  chemistry_seconds_per_task: 30,
  latin_seconds_per_task: 30,
};

export function ChildSettingsEditor({ childId, childName, parentId, currentGrade, onSettingsChanged }: ChildSettingsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ChildSettings>(DEFAULT_SETTINGS);
  const [visibility, setVisibility] = useState<SubjectVisibility>({});
  const [grade, setGrade] = useState<number>(currentGrade || 1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && childId) {
      loadSettings();
    }
  }, [isOpen, childId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load child settings
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
          english_seconds_per_task: settingsData.english_seconds_per_task,
          geography_seconds_per_task: settingsData.geography_seconds_per_task,
          history_seconds_per_task: settingsData.history_seconds_per_task,
          physics_seconds_per_task: settingsData.physics_seconds_per_task,
          biology_seconds_per_task: settingsData.biology_seconds_per_task,
          chemistry_seconds_per_task: settingsData.chemistry_seconds_per_task,
          latin_seconds_per_task: settingsData.latin_seconds_per_task,
        });
      }

      // Load subject visibility
      const { data: visibilityData, error: visibilityError } = await supabase
        .from('child_subject_visibility')
        .select('subject, is_visible')
        .eq('child_id', childId);

      if (visibilityError) throw visibilityError;

      const visibilityMap: SubjectVisibility = {};
      SUBJECTS.forEach(s => {
        visibilityMap[s.key] = true; // Default all visible
      });
      
      visibilityData?.forEach(v => {
        visibilityMap[v.subject] = v.is_visible;
      });

      setVisibility(visibilityMap);

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
      // Update child grade in profile
      const { error: gradeError } = await supabase
        .from('profiles')
        .update({ grade })
        .eq('id', childId);

      if (gradeError) throw gradeError;

      // Check if child settings exist
      const { data: existingSettings } = await supabase
        .from('child_settings')
        .select('id')
        .eq('child_id', childId)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error: settingsError } = await supabase
          .from('child_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('child_id', childId);

        if (settingsError) throw settingsError;
      } else {
        // Insert new settings
        const { error: settingsError } = await supabase
          .from('child_settings')
          .insert({
            parent_id: parentId,
            child_id: childId,
            ...settings,
          });

        if (settingsError) throw settingsError;
      }

      // Save visibility settings - check and update/insert each
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
              updated_at: new Date().toISOString(),
            })
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
            });

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
    setVisibility(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Einstellungen
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Grade Management */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Klassenstufe
                </CardTitle>
                <CardDescription className="text-xs">
                  Aktuelle Klassenstufe von {childName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={13}
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">Klasse</span>
                </div>
              </CardContent>
            </Card>

            {/* Screen Time Limits */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Bildschirmzeit-Limits
                </CardTitle>
                <CardDescription className="text-xs">
                  Maximale tägliche Lernzeit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Wochentags (Min)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={180}
                      value={settings.weekday_max_minutes}
                      onChange={(e) => updateSetting('weekday_max_minutes', parseInt(e.target.value) || 30)}
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
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Visibility */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Sichtbare Fächer
                </CardTitle>
                <CardDescription className="text-xs">
                  Welche Fächer soll {childName} sehen?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {SUBJECTS.map((subject) => {
                    const Icon = subject.icon;
                    return (
                      <div 
                        key={subject.key}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{subject.name}</span>
                        </div>
                        <Switch
                          checked={visibility[subject.key] ?? true}
                          onCheckedChange={() => toggleSubjectVisibility(subject.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time Per Task */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Zeit pro Aufgabe
                </CardTitle>
                <CardDescription className="text-xs">
                  Sekunden Bildschirmzeit pro richtig gelöster Aufgabe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SUBJECTS.map((subject) => {
                    const Icon = subject.icon;
                    const settingKey = `${subject.key}_seconds_per_task` as keyof ChildSettings;
                    return (
                      <div 
                        key={subject.key}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{subject.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={5}
                            max={300}
                            value={settings[settingKey]}
                            onChange={(e) => updateSetting(settingKey, parseInt(e.target.value) || 30)}
                            className="w-20 text-right"
                          />
                          <span className="text-xs text-muted-foreground w-8">Sek</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
