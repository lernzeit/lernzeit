import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface MetricRow {
  use_case: string;
  model: string;
  resolved_provider: string | null;
  ttft_ms: number | null;
  total_latency_ms: number | null;
  latency_ms: number | null;
  cache_hit: boolean | null;
  aborted: boolean | null;
  success: boolean;
}

interface Aggregate {
  key: string;
  use_case: string;
  model: string;
  resolved_provider: string;
  calls: number;
  ttftP50: number | null;
  ttftP95: number | null;
  totalP50: number | null;
  totalP95: number | null;
  cacheRate: number;
  abortRate: number;
}

const RANGES = [
  { value: '1h', label: '1 Stunde', hours: 1 },
  { value: '24h', label: '24 Stunden', hours: 24 },
  { value: '7d', label: '7 Tage', hours: 24 * 7 },
];

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[idx]);
}

export function AILatencyPanel() {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range]);

  async function load() {
    setLoading(true);
    const hours = RANGES.find((r) => r.value === range)?.hours ?? 24;
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('ai_model_metrics')
      .select('use_case, model, resolved_provider, ttft_ms, total_latency_ms, latency_ms, cache_hit, aborted, success')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: 'Latenz-Daten laden fehlgeschlagen', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data ?? []) as MetricRow[]);
    }
    setLoading(false);
  }

  const aggregates = useMemo<Aggregate[]>(() => {
    const groups = new Map<string, MetricRow[]>();
    for (const r of rows) {
      const key = `${r.use_case}|${r.model}|${r.resolved_provider ?? '–'}`;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([key, list]) => {
      const [use_case, model, resolved_provider] = key.split('|');
      const ttfts = list.map((r) => r.ttft_ms).filter((v): v is number => typeof v === 'number');
      const totals = list.map((r) => r.total_latency_ms ?? r.latency_ms).filter((v): v is number => typeof v === 'number');
      return {
        key,
        use_case,
        model,
        resolved_provider,
        calls: list.length,
        ttftP50: percentile(ttfts, 50),
        ttftP95: percentile(ttfts, 95),
        totalP50: percentile(totals, 50),
        totalP95: percentile(totals, 95),
        cacheRate: Math.round((list.filter((r) => r.cache_hit).length / list.length) * 1000) / 10,
        abortRate: Math.round((list.filter((r) => r.aborted).length / list.length) * 1000) / 10,
      };
    }).sort((a, b) => b.calls - a.calls);
  }, [rows]);

  const overall = useMemo(() => {
    const ttfts = rows.map((r) => r.ttft_ms).filter((v): v is number => typeof v === 'number');
    const totals = rows.map((r) => r.total_latency_ms ?? r.latency_ms).filter((v): v is number => typeof v === 'number');
    return {
      calls: rows.length,
      ttftP50: percentile(ttfts, 50),
      ttftP95: percentile(ttfts, 95),
      totalP95: percentile(totals, 95),
      cacheRate: rows.length ? Math.round((rows.filter((r) => r.cache_hit).length / rows.length) * 1000) / 10 : 0,
      abortRate: rows.length ? Math.round((rows.filter((r) => r.aborted).length / rows.length) * 1000) / 10 : 0,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <Select value={range} onValueChange={setRange}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Calls</div><div className="text-2xl font-bold">{overall.calls}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">TTFT p50</div><div className="text-2xl font-bold">{overall.ttftP50 ?? '–'} ms</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">TTFT p95</div><div className="text-2xl font-bold">{overall.ttftP95 ?? '–'} ms</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Cache-Trefferquote</div><div className="text-2xl font-bold">{overall.cacheRate}%</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Abbruchquote</div><div className="text-2xl font-bold">{overall.abortRate}%</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : aggregates.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Noch keine Latenz-Daten im gewählten Zeitraum.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Latenz pro Use-Case & Modell</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Use-Case</TableHead>
                  <TableHead>Modell</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">TTFT p50</TableHead>
                  <TableHead className="text-right">TTFT p95</TableHead>
                  <TableHead className="text-right">Total p50</TableHead>
                  <TableHead className="text-right">Total p95</TableHead>
                  <TableHead className="text-right">Cache</TableHead>
                  <TableHead className="text-right">Abbrüche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregates.map((a) => (
                  <TableRow key={a.key}>
                    <TableCell className="text-xs">{a.use_case}</TableCell>
                    <TableCell className="font-mono text-xs">{a.model}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.resolved_provider}</Badge></TableCell>
                    <TableCell className="text-right">{a.calls}</TableCell>
                    <TableCell className="text-right">{a.ttftP50 ?? '–'}</TableCell>
                    <TableCell className="text-right">{a.ttftP95 ?? '–'}</TableCell>
                    <TableCell className="text-right">{a.totalP50 ?? '–'}</TableCell>
                    <TableCell className="text-right">{a.totalP95 ?? '–'}</TableCell>
                    <TableCell className="text-right">{a.cacheRate}%</TableCell>
                    <TableCell className="text-right">{a.abortRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
