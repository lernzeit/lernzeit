import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';

/**
 * Übersicht über die Qualitätsprüfung des Fragen-Caches.
 *
 * Das ist bewusst mehr als Statistik: Die Prüfung läuft auf einem kostenlosen
 * Modell, und ein Fehlurteil würde eine korrekte Frage aus der Auslieferung
 * nehmen. Deshalb sind die Befunde einsehbar und jede Entscheidung ist
 * zurücknehmbar.
 */

interface FailedQuestion {
  id: string;
  grade: number;
  subject: string;
  question_text: string;
  category: string;
  quality_issues: string | null;
  quality_model: string | null;
  quality_checked_at: string | null;
}

interface Stats {
  total: number;
  checked: number;
  failed: number;
  inactive: number;
}

export function CacheQualityPanel() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState<FailedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const countOf = async (apply: (q: ReturnType<typeof baseQuery>) => unknown) => {
      const q = baseQuery();
      const { count } = await (apply(q) as ReturnType<typeof baseQuery>);
      return count ?? 0;
    };
    function baseQuery() {
      return supabase.from('ai_question_cache').select('id', { count: 'exact', head: true });
    }

    const [total, checked, failedCount, inactive] = await Promise.all([
      countOf((q) => q),
      countOf((q) => q.not('quality_checked_at', 'is', null)),
      countOf((q) => q.eq('quality_status', 'failed')),
      countOf((q) => q.eq('is_active', false)),
    ]);

    setStats({ total, checked, failed: failedCount, inactive });

    const { data } = await supabase
      .from('ai_question_cache')
      .select('id, grade, subject, question_text, category, quality_issues, quality_model, quality_checked_at')
      .eq('quality_status', 'failed')
      .order('quality_checked_at', { ascending: false })
      .limit(50);

    setFailed((data ?? []) as FailedQuestion[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const reactivate = async (id: string) => {
    setReactivating(id);
    const { error } = await supabase
      .from('ai_question_cache')
      .update({
        is_active: true,
        quality_status: 'ok',
        quality_issues: null,
        // Zeitstempel bleibt stehen: Die Frage kommt erst wieder dran, wenn die
        // Warteschlange sie regulär erreicht — sonst würde sie sofort erneut
        // aussortiert.
      })
      .eq('id', id);
    setReactivating(null);

    if (error) {
      toast({ title: 'Reaktivieren fehlgeschlagen', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Frage reaktiviert', description: 'Sie wird wieder ausgeliefert.' });
      void load();
    }
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

  const unchecked = stats ? stats.total - stats.checked : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Qualitätsprüfung</CardTitle>
            <CardDescription>
              Läuft dreimal täglich auf einem kostenlosen Modell. Rechenaufgaben werden zuerst
              deterministisch geprüft — das kostet keine Anfrage.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold">{stats?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">Fragen gesamt</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold text-green-600">{stats?.checked ?? 0}</div>
            <div className="text-xs text-muted-foreground">geprüft</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold text-muted-foreground">{unchecked}</div>
            <div className="text-xs text-muted-foreground">noch offen</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-semibold text-destructive">{stats?.inactive ?? 0}</div>
            <div className="text-xs text-muted-foreground">deaktiviert</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            Aussortierte Fragen
            {failed.length > 0 && <Badge variant="outline">{failed.length}</Badge>}
          </h3>

          {failed.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Nichts beanstandet.
            </p>
          ) : (
            <div className="space-y-2">
              {failed.map((q) => (
                <div key={q.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{q.subject}</Badge>
                    <Badge variant="outline">Klasse {q.grade}</Badge>
                    <Badge variant="outline">{q.category === 'theory' ? 'Theorie' : 'Rechnen'}</Badge>
                    {q.quality_model && <span>geprüft von {q.quality_model}</span>}
                  </div>

                  <p className="text-sm">{q.question_text}</p>

                  {q.quality_issues && (
                    <p className="text-sm text-destructive">{q.quality_issues}</p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void reactivate(q.id)}
                    disabled={reactivating === q.id}
                  >
                    {reactivating === q.id
                      ? <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      : <RotateCcw className="h-3 w-3 mr-2" />}
                    Fehlurteil — wieder ausliefern
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CacheQualityPanel;
