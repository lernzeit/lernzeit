import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MetricRow {
  use_case: string;
  provider: string;
  model: string;
  total_calls: number;
  success_calls: number;
  error_calls: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_usd: number | null;
}

const RANGES = [
  { value: '24h', label: '24 Stunden', hours: 24 },
  { value: '7d', label: '7 Tage', hours: 24 * 7 },
  { value: '30d', label: '30 Tage', hours: 24 * 30 },
];

export function AIModelMetricsPanel() {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [range, setRange] = useState('24h');
  const [useCase, setUseCase] = useState<string>('__all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { void load(); }, [range, useCase]);

  async function load() {
    setLoading(true);
    const hours = RANGES.find((r) => r.value === range)?.hours ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc('get_ai_model_metrics_summary', {
      p_since: since,
      p_use_case: useCase === '__all' ? undefined : useCase,
    });
    if (error) {
      toast({ title: 'Metriken laden fehlgeschlagen', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data ?? []) as MetricRow[]);
    }
    setLoading(false);
  }

  const totals = useMemo(() => {
    const t = { calls: 0, success: 0, cost: 0, latencySum: 0, latencyCount: 0 };
    for (const r of rows) {
      t.calls += Number(r.total_calls);
      t.success += Number(r.success_calls);
      t.cost += Number(r.total_cost_usd ?? 0);
      if (r.avg_latency_ms != null) {
        t.latencySum += Number(r.avg_latency_ms) * Number(r.total_calls);
        t.latencyCount += Number(r.total_calls);
      }
    }
    return {
      calls: t.calls,
      successRate: t.calls > 0 ? Math.round((t.success / t.calls) * 1000) / 10 : 0,
      avgLatency: t.latencyCount > 0 ? Math.round(t.latencySum / t.latencyCount) : 0,
      cost: t.cost,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    const byModel = new Map<string, { model: string; latency: number; calls: number }>();
    for (const r of rows) {
      const cur = byModel.get(r.model) ?? { model: r.model.split('/').pop() ?? r.model, latency: 0, calls: 0 };
      cur.latency = Math.max(cur.latency, Number(r.avg_latency_ms ?? 0));
      cur.calls += Number(r.total_calls);
      byModel.set(r.model, cur);
    }
    return Array.from(byModel.values()).sort((a, b) => b.calls - a.calls).slice(0, 10);
  }, [rows]);

  const useCases = useMemo(() => Array.from(new Set(rows.map((r) => r.use_case))), [rows]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={useCase} onValueChange={setUseCase}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Alle Use-Cases</SelectItem>
            {useCases.map((uc) => <SelectItem key={uc} value={uc}>{uc}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Calls gesamt</div><div className="text-2xl font-bold">{totals.calls.toLocaleString('de-DE')}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Erfolgsrate</div><div className="text-2xl font-bold">{totals.successRate}%</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ø Latenz</div><div className="text-2xl font-bold">{totals.avgLatency} ms</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Kosten (geschätzt)</div><div className="text-2xl font-bold">${totals.cost.toFixed(4)}</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Noch keine Metriken im gewählten Zeitraum.</CardContent></Card>
      ) : (
        <>
          {/* Latenz pro Modell */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ø Latenz pro Modell (Top 10)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="latency" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detail-Tabelle */}
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Use-Case</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modell</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Ø ms</TableHead>
                    <TableHead className="text-right">P95 ms</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Kosten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.use_case}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.provider}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.model}</TableCell>
                      <TableCell className="text-right">{r.total_calls}</TableCell>
                      <TableCell className="text-right">{r.success_rate ?? 0}%</TableCell>
                      <TableCell className="text-right">{r.avg_latency_ms ?? '–'}</TableCell>
                      <TableCell className="text-right">{r.p95_latency_ms ?? '–'}</TableCell>
                      <TableCell className="text-right text-xs">{(Number(r.total_prompt_tokens) + Number(r.total_completion_tokens)).toLocaleString('de-DE')}</TableCell>
                      <TableCell className="text-right">${Number(r.total_cost_usd ?? 0).toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}