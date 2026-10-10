import React, { useState, useEffect, useRef } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Stepper } from '@/components/parent/Stepper';
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
  Info,
  Star
} from 'lucide-react';
import { usePremiumZugang } from '@/hooks/usePremiumZugang';
import { PremiumFeature } from '@/components/PremiumGate';
import { useHandysperreFreigaben } from '@/hooks/useHandysperre';
import { isSubjectAvailableForGrade } from '@/lib/category';
import {
  DEFAULT_BASE_MINUTES,
  DEFAULT_SECONDS_PER_TASK,
  DEFAULT_WEEKDAY_MAX_MINUTES,
  DEFAULT_WEEKEND_MAX_MINUTES,
  describeStandard,
} from '@/config/childSettings';

interface ChildSettingsEditorProps {
  childId: string;
  childName: string;
  parentId: string;
  currentGrade?: number;
  onSettingsChanged?: () => void;
}

interface ChildSettings {
  /**
   * Minuten, die dem Kind taeglich ohne Lernen zustehen — Apples Gedanke
   * eines Tagesbudgets. 0 heisst: alles muss verdient werden.
   *
   * Der Vorgabewert gilt fuer alle; nur das Aendern ist Premium. Ein Kind,
   * dessen Eltern nicht zahlen, soll kein rund um die Uhr gesperrtes Telefon
   * haben.
   */
  screen_time_base_minutes: number;
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
  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-tinte">
    <Crown className="h-2.5 w-2.5 text-warning" />
    Premium
  </span>
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
  screen_time_base_minutes: DEFAULT_BASE_MINUTES,
  weekday_max_minutes: DEFAULT_WEEKDAY_MAX_MINUTES,
  weekend_max_minutes: DEFAULT_WEEKEND_MAX_MINUTES,
  math_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  german_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  science_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  english_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  geography_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  history_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  physics_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  biology_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  chemistry_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
  latin_seconds_per_task: DEFAULT_SECONDS_PER_TASK,
};

export function ChildSettingsEditor({ childId, childName, parentId, currentGrade, onSettingsChanged }: ChildSettingsEditorProps) {
  const [settings, setSettings] = useState<ChildSettings>(DEFAULT_SETTINGS);
  // Freiminuten wirken nur mit der LernZeit-Sperre, die vorerst nur freigeschaltete Kinder haben
  const handysperreFreigaben = useHandysperreFreigaben();
  const handysperreAn = !!handysperreFreigaben?.has(childId);
  const [visibility, setVisibility] = useState<SubjectVisibility>({});
  const [priorities, setPriorities] = useState<SubjectPriority>({});
  const [grade, setGrade] = useState<number>(currentGrade || 1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isPremium, isTrialing } = usePremiumZugang();
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
          screen_time_base_minutes:
            (settingsData as { screen_time_base_minutes?: number }).screen_time_base_minutes
            ?? DEFAULT_BASE_MINUTES,
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

  // Sofort speichern (App-Redesign, Wunsch 04.10.2026): keine Speichern-Taste
  // mehr. Jede Aenderung wird nach kurzer Pause gespeichert. Ohne Meldung
  // (Wunsch 04.10.2026 abends: die Toasts nervten bei Plus/Minus); der Stand
  // steht leise unter den Regeln ("Wird gespeichert …"). Nur Fehler melden sich.
  const einstellungenRef = useRef(settings);
  einstellungenRef.current = settings;
  const ausstehend = useRef<{ vorher: ChildSettings | null; timer: number | null }>({ vorher: null, timer: null });

  const schreibeEinstellungen = async (werte: ChildSettings) => {
    const { data: vorhanden } = await supabase
      .from('child_settings')
      .select('id')
      .eq('child_id', childId)
      .maybeSingle();
    if (vorhanden) {
      const { error } = await supabase
        .from('child_settings')
        .update({ ...werte, updated_at: new Date().toISOString() })
        .eq('child_id', childId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('child_settings')
        .insert({ parent_id: parentId, child_id: childId, ...werte });
      if (error) throw error;
    }
  };

  const fehler = () => sonnerToast.error('Konnte nicht gespeichert werden. Bitte versuch es noch einmal.');

  const updateSetting = (key: keyof ChildSettings, value: number) => {
    const jetzt = einstellungenRef.current;
    if (jetzt[key] === value) return;
    if (!ausstehend.current.vorher) ausstehend.current.vorher = jetzt;
    const neu = { ...jetzt, [key]: value };
    einstellungenRef.current = neu;
    setSettings(neu);
    if (ausstehend.current.timer) window.clearTimeout(ausstehend.current.timer);
    ausstehend.current.timer = window.setTimeout(async () => {
      const vorher = ausstehend.current.vorher;
      ausstehend.current = { vorher: null, timer: null };
      const werte = einstellungenRef.current;
      setSaving(true);
      try {
        // Kein onSettingsChanged: Das laedt die ganze Familie neu und liess die
        // Seite bei jedem Plus/Minus flackern. Grenzen und Sekunden braucht das
        // Eltern-Dashboard nicht.
        await schreibeEinstellungen(werte);
      } catch (error) {
        console.error('Error saving child settings:', error);
        if (vorher) { setSettings(vorher); einstellungenRef.current = vorher; }
        fehler();
      } finally {
        setSaving(false);
      }
    }, 700);
  };

  useEffect(() => () => { if (ausstehend.current.timer) window.clearTimeout(ausstehend.current.timer); }, []);

  const aendereKlasse = async (neu: number) => {
    const vorher = grade;
    if (neu === vorher) return;
    setGrade(neu);
    const schreiben = async (g: number) => {
      const { error } = await supabase.from('profiles').update({ grade: g }).eq('id', childId);
      if (error) throw error;
    };
    try {
      await schreiben(neu);
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error saving grade:', error);
      setGrade(vorher);
      fehler();
    }
  };

  // Faecher: Gibt es noch keine eigene Auswahl, werden beim ersten Aendern alle
  // Faecher geschrieben (wie frueher beim Speichern). Sonst gilt fuer nicht
  // eingetragene Faecher "sichtbar", auch wenn die Klassenstufe sie nicht hat.
  const schreibeFach = async (fach: string, sichtbar: boolean, schwerpunkt: boolean) => {
    const { data: vorhanden } = await supabase
      .from('child_subject_visibility')
      .select('id')
      .eq('child_id', childId)
      .eq('subject', fach)
      .maybeSingle();
    if (vorhanden) {
      const { error } = await supabase
        .from('child_subject_visibility')
        .update({ is_visible: sichtbar, is_priority: schwerpunkt, updated_at: new Date().toISOString() } as any)
        .eq('child_id', childId)
        .eq('subject', fach);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('child_subject_visibility')
        .insert({ parent_id: parentId, child_id: childId, subject: fach, is_visible: sichtbar, is_priority: schwerpunkt } as any);
      if (error) throw error;
    }
  };

  const aendereFach = async (fach: string, aenderung: { sichtbar?: boolean; schwerpunkt?: boolean }) => {
    const vorherSicht = { ...visibility };
    const vorherPrio = { ...priorities };
    const neueSicht = { ...visibility, [fach]: aenderung.sichtbar ?? (visibility[fach] ?? true) };
    const neuePrio = { ...priorities, [fach]: aenderung.schwerpunkt ?? (priorities[fach] ?? false) };
    setVisibility(neueSicht);
    setPriorities(neuePrio);
    const alleSchreiben = async (sicht: SubjectVisibility, prio: SubjectPriority) => {
      for (const s of SUBJECTS) await schreibeFach(s.key, sicht[s.key] ?? true, prio[s.key] ?? false);
    };
    try {
      if (!hasExplicitVisibility) {
        await alleSchreiben(neueSicht, neuePrio);
        setHasExplicitVisibility(true);
      } else {
        await schreibeFach(fach, neueSicht[fach], neuePrio[fach]);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      setVisibility(vorherSicht);
      setPriorities(vorherPrio);
      fehler();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableSubjects = (isPremium || isTrialing)
    ? SUBJECTS
    : SUBJECTS.filter(s => isSubjectAvailableForGrade(s.key, grade));

  return (
    <div className="space-y-6">
      {/* Nach Trial-Ende: gespeicherte Werte im Klartext gegenueberstellen */}
      {!hasPremiumAccess && (() => {
        const changed = SUBJECTS
          .filter(s => settings[`${s.key}_seconds_per_task` as keyof ChildSettings] !== 30)
          .map(s => {
            const sec = settings[`${s.key}_seconds_per_task` as keyof ChildSettings] as number;
            const label = sec % 60 === 0
              ? `${sec / 60} ${sec === 60 ? 'Minute' : 'Minuten'}`
              : `${sec} Sekunden`;
            return `${s.name} auf ${label}`;
          });
        if (changed.length === 0) return null;
        const list = changed.length === 1
          ? changed[0]
          : `${changed.slice(0, -1).join(', ')} und ${changed[changed.length - 1]}`;
        return (
          <div className="space-y-1 rounded-2xl bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-tinte">
              <Crown className="h-4 w-4 text-primary" />
              Deine Premium-Einstellungen sind pausiert
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Du hattest {list} pro Aufgabe eingestellt. Jetzt gilt wieder für alle Fächer der
              Standard: {describeStandard()}.
              Deine Einstellungen bleiben gespeichert und gelten sofort wieder, wenn du Premium aktivierst.
            </p>
          </div>
        );
      })()}

      <Gruppe titel="Klasse">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Label htmlFor={`klasse-${childId}`} className="text-sm font-semibold text-tinte">Klassenstufe</Label>
          <Select value={grade.toString()} onValueChange={(value) => void aendereKlasse(parseInt(value))}>
            <SelectTrigger id={`klasse-${childId}`} className="w-32 rounded-full">
              <SelectValue placeholder="Klasse wählen" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                <SelectItem key={g} value={g.toString()}>
                  Klasse {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Gruppe>

      <PremiumFeature
        featureName="Anpassbare Bildschirmzeit-Limits"
        onUpgradeClick={() => toast({ title: "Upgrade zu Premium", description: "Diese Funktion ist nur für Premium-Nutzer verfügbar." })}
      >
        <Gruppe titel="Bildschirmzeit am Tag" premium>
          <Zeile titel="Werktags" hinweis="höchstens">
            <Stepper label="Werktags" wert={settings.weekday_max_minutes} min={5} max={180} schritt={5} einheit="Min." disabled={!hasPremiumAccess} onChange={(v) => updateSetting('weekday_max_minutes', v)} />
          </Zeile>
          <Zeile titel="Am Wochenende" hinweis="höchstens">
            <Stepper label="Am Wochenende" wert={settings.weekend_max_minutes} min={5} max={180} schritt={5} einheit="Min." disabled={!hasPremiumAccess} onChange={(v) => updateSetting('weekend_max_minutes', v)} />
          </Zeile>
          {handysperreAn && (
          <Zeile titel="Freiminuten" hinweis="ohne Lernen, nur mit Handysperre">
            <Stepper label="Freiminuten" wert={settings.screen_time_base_minutes} min={0} max={480} schritt={5} einheit="Min." disabled={!hasPremiumAccess} onChange={(v) => updateSetting('screen_time_base_minutes', v)} />
          </Zeile>
          )}
        </Gruppe>
      </PremiumFeature>

      <Gruppe titel="Fächer und Zeit pro richtiger Aufgabe" premium>
        {availableSubjects.map((subject) => {
          const sichtbar = visibility[subject.key] ?? true;
          const schwerpunkt = priorities[subject.key] ?? false;
          const settingKey = `${subject.key}_seconds_per_task` as keyof ChildSettings;
          return (
            <div key={subject.key} className={`space-y-2 px-4 py-3 ${sichtbar ? '' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-3">
                <Switch
                  checked={sichtbar}
                  onCheckedChange={(v) => void aendereFach(subject.key, { sichtbar: v })}
                  disabled={!hasPremiumAccess}
                  aria-label={`${subject.name} anzeigen`}
                />
                <span className={`min-w-0 flex-1 truncate text-sm font-bold ${sichtbar ? 'text-tinte' : 'text-muted-foreground'}`}>{subject.name}</span>
                <button
                  type="button"
                  onClick={() => void aendereFach(subject.key, { schwerpunkt: !schwerpunkt })}
                  disabled={!hasPremiumAccess || !sichtbar}
                  aria-pressed={schwerpunkt}
                  className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                    schwerpunkt ? 'bg-warning/15 text-tinte' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${schwerpunkt ? 'fill-warning text-warning' : ''}`} />
                  Schwerpunkt
                </button>
              </div>
              {sichtbar && (
                <div className="flex items-center justify-between gap-3 pl-[3.25rem]">
                  <span className="text-xs text-muted-foreground">pro Aufgabe</span>
                  <Stepper label={`${subject.name}, Zeit pro Aufgabe`} wert={settings[settingKey]} min={5} max={300} schritt={5} einheit="Sek." disabled={!hasPremiumAccess} onChange={(v) => updateSetting(settingKey, v)} />
                </div>
              )}
            </div>
          );
        })}
      </Gruppe>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Wird gespeichert …</> : 'Änderungen werden sofort gespeichert.'}
      </p>
    </div>
  );
}

/** Gruppe von Einstellungen: Titel und weisses Blatt mit Trennlinien. */
function Gruppe({ titel, premium, children }: { titel: string; premium?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-extrabold">
        {titel}
        {premium && <PremiumBadge />}
      </h3>
      <div className="divide-y divide-karo rounded-[20px] bg-card ring-1 ring-inset ring-karo">{children}</div>
    </section>
  );
}

function Zeile({ titel, hinweis, children }: { titel: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-tinte">{titel}</p>
        {hinweis && <p className="text-xs text-muted-foreground">{hinweis}</p>}
      </div>
      {children}
    </div>
  );
}
