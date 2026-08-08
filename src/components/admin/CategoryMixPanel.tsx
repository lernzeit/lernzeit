import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RotateCcw, Save } from 'lucide-react';

/**
 * Steuert den Anteil an Theoriefragen (Fachbegriffe, Definitionen) gegenüber
 * Rechenaufgaben — je Fach und Klassenstufe.
 *
 * Hintergrund: Ab Klasse 4/5 werden reine Rechenaufgaben zunehmend zu schwer,
 * um sie im Kopf zu lösen. Theoriefragen halten den Spielfluss aufrecht, ohne
 * fachlich flacher zu werden.
 */

interface MixRow {
  id: string;
  subject: string;
  grade: number;
  theory_percentage: number;
}

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Mathematik',
  physics: 'Physik',
  chemistry: 'Chemie',
};

/** Spiegelt die Seed-Werte der Migration — Grundlage für „Zurücksetzen". */
const DEFAULTS: Record<string, Record<number, number>> = {
  math: { 1: 0, 2: 0, 3: 15, 4: 20, 5: 25, 6: 30, 7: 30, 8: 35, 9: 40, 10: 40 },
  physics: { 5: 30, 6: 30, 7: 35, 8: 35, 9: 40, 10: 40 },
  chemistry: { 7: 35, 8: 40, 9: 40, 10: 45 },
};

export function CategoryMixPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<MixRow[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('question_category_mix')
      .select('id, subject, grade, theory_percentage')
      .order('subject')
      .order('grade');

    if (error) {
      toast({
        title: 'Laden fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRows((data ?? []) as MixRow[]);
      setEdits({});
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  /** Nach Fach gruppiert, damit je Fach eine Zeile mit allen Klassen entsteht. */
  const grouped = useMemo(() => {
    const map = new Map<string, MixRow[]>();
    for (const row of rows) {
      const list = map.get(row.subject) ?? [];
      list.push(row);
      map.set(row.subject, list);
    }
    return map;
  }, [rows]);

  const valueFor = (row: MixRow) => edits[row.id] ?? row.theory_percentage;
  const isDirty = (row: MixRow) =>
    edits[row.id] !== undefined && edits[row.id] !== row.theory_percentage;
  const dirtyCount = rows.filter(isDirty).length;

  const setValue = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    setEdits((prev) => ({ ...prev, [id]: Math.max(0, Math.min(100, Math.round(n))) }));
  };

  const saveAll = async () => {
    const changed = rows.filter(isDirty);
    if (changed.length === 0) return;

    setSaving(true);
    // Einzelne Updates statt Upsert: Die Tabelle ist klein, und so bleibt bei
    // einem Fehler nachvollziehbar, welche Zeile betroffen war.
    const failures: string[] = [];
    for (const row of changed) {
      const { error } = await supabase
        .from('question_category_mix')
        .update({ theory_percentage: edits[row.id] })
        .eq('id', row.id);
      if (error) {
        failures.push(`${SUBJECT_LABELS[row.subject] ?? row.subject} Klasse ${row.grade}: ${error.message}`);
      }
    }
    setSaving(false);

    if (failures.length > 0) {
      toast({
        title: `${failures.length} von ${changed.length} nicht gespeichert`,
        description: failures.slice(0, 3).join(' · '),
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Gespeichert',
        description: `${changed.length} ${changed.length === 1 ? 'Wert' : 'Werte'} aktualisiert. Die Edge Functions übernehmen die Änderung binnen einer Minute.`,
      });
    }
    await load();
  };

  const resetToDefaults = () => {
    const next: Record<string, number> = {};
    for (const row of rows) {
      const def = DEFAULTS[row.subject]?.[row.grade];
      if (def !== undefined) next[row.id] = def;
    }
    setEdits(next);
    toast({
      title: 'Defaults eingesetzt',
      description: 'Noch nicht gespeichert — mit „Speichern" bestätigen.',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theoriefragen-Anteil</CardTitle>
        <CardDescription>
          Anteil der Fragen, die nach Fachbegriffen und Definitionen fragen statt zu rechnen.
          0&nbsp;% = ausschließlich Rechenaufgaben, 100&nbsp;% = ausschließlich Theorie.
          Änderungen greifen nach spätestens einer Minute.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {[...grouped.entries()].map(([subject, subjectRows]) => (
          <div key={subject} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{SUBJECT_LABELS[subject] ?? subject}</h3>
              <Badge variant="outline" className="text-xs">
                Klasse {subjectRows[0].grade}–{subjectRows[subjectRows.length - 1].grade}
              </Badge>
            </div>

            {/* Waagerecht scrollbar, damit die Seite auf dem Handy nicht ausbricht */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {subjectRows.map((row) => (
                  <div
                    key={row.id}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 w-20 ${
                      isDirty(row) ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="text-xs text-muted-foreground">Kl. {row.grade}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={valueFor(row)}
                      onChange={(e) => setValue(row.id, e.target.value)}
                      className="h-8 text-center px-1"
                      aria-label={`Theorieanteil ${SUBJECT_LABELS[subject] ?? subject} Klasse ${row.grade} in Prozent`}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </Button>
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Auf Defaults zurücksetzen
          </Button>
          {dirtyCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {dirtyCount} ungespeicherte {dirtyCount === 1 ? 'Änderung' : 'Änderungen'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CategoryMixPanel;
