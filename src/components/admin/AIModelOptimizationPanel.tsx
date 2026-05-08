import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface RunRow {
  id: string;
  run_at: string;
  use_case: string;
  previous_model: string | null;
  new_model: string | null;
  applied: boolean;
  winner_provider: string | null;
  winner_score: number | null;
  winner_cost_usd: number | null;
  reason: string | null;
  triggered_by: string;
}

export function AIModelOptimizationPanel() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_model_optimization_runs')
      .select('id, run_at, use_case, previous_model, new_model, applied, winner_provider, winner_score, winner_cost_usd, reason, triggered_by')
      .order('run_at', { ascending: false })
      .limit(50);
    if (error) toast({ title: 'Laden fehlgeschlagen', description: error.message, variant: 'destructive' });
    else setRuns((data ?? []) as RunRow[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-optimize-models', { body: { apply: true } });
      if (error) throw error;
      const queued = (data as { queued?: number })?.queued ?? 0;
      toast({
        title: 'Optimierung gestartet',
        description: `${queued} Use-Cases laufen im Hintergrund. Ergebnisse erscheinen nach und nach (~30–90 s).`,
      });
      // Poll the runs table every 5s for up to 3 minutes so the user sees progress live.
      const startCount = runs.length;
      let elapsed = 0;
      const poll = setInterval(async () => {
        elapsed += 5;
        await load();
        if (elapsed >= 180) {
          clearInterval(poll);
          setRunning(false);
        }
      }, 5000);
    } catch (err) {
      toast({ title: 'Fehler', description: (err as Error).message, variant: 'destructive' });
      setRunning(false);
    }
  }

  // Group: latest run per use case
  const latestByUseCase = new Map<string, RunRow>();
  for (const r of runs) if (!latestByUseCase.has(r.use_case)) latestByUseCase.set(r.use_case, r);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Automatische Modell-Optimierung</span>
            <Button size="sm" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Jetzt ausführen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Läuft automatisch <strong>am 1. jedes Monats um 03:00 UTC</strong>. Pro Use-Case werden bis zu 6 Modelle (inkl. OpenRouter Free) mit standardisierten Prompts getestet, vom KI-Juror bewertet und bei guter Qualität bevorzugt das günstigste/kostenlose Modell aktiviert.</p>
          <p className="text-xs">Auswahllogik: Kostenloses Modell gewinnt, wenn Score ≥ 7.5 und max. 1 Punkt unter dem besten Modell — sonst gewinnt das beste Modell.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Aktueller Stand pro Use-Case</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Laden …</div>
          ) : latestByUseCase.size === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Optimierungsläufe. Klick „Jetzt ausführen" für den ersten Lauf.</p>
          ) : (
            <div className="space-y-3">
              {[...latestByUseCase.values()].map((r) => (
                <div key={r.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{r.use_case}</Badge>
                    {r.applied
                      ? <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> übernommen</Badge>
                      : <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> nicht übernommen</Badge>}
                    {r.winner_score !== null && <Badge variant="outline">Score {r.winner_score}</Badge>}
                    {r.winner_cost_usd !== null && (
                      <Badge variant="outline">{r.winner_cost_usd === 0 ? 'kostenlos' : `${r.winner_cost_usd.toFixed(3)} USD/1k`}</Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Vorher:</span> <code className="text-xs">{r.previous_model ?? '–'}</code>
                    {' → '}
                    <span className="text-muted-foreground">Neu:</span> <code className="text-xs">{r.new_model ?? '–'}</code>
                    {r.winner_provider && <span className="text-xs text-muted-foreground"> via {r.winner_provider}</span>}
                  </div>
                  {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(r.run_at).toLocaleString('de-DE')} · {r.triggered_by}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}