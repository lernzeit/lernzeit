import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RECOMMENDED_MODELS, PROVIDER_LABELS, type ProviderId } from '@/lib/modelCatalog';
import { Loader2, ArrowUp, ArrowDown, Play, Save } from 'lucide-react';

interface ConfigRow {
  id: string;
  use_case: string;
  display_name: string;
  primary_model: string;
  provider_order: ProviderId[];
  temperature: number | null;
  is_active: boolean;
}

const ALL_PROVIDERS: ProviderId[] = ['gemini_direct', 'openrouter', 'lovable'];

export function AIModelConfigPanel() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_model_config')
      .select('id, use_case, display_name, primary_model, provider_order, temperature, is_active')
      .order('display_name');
    if (error) {
      toast({ title: 'Laden fehlgeschlagen', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []).map((r) => ({
        ...r,
        provider_order: (r.provider_order as ProviderId[]) ?? ['gemini_direct', 'openrouter', 'lovable'],
      })) as ConfigRow[]);
    }
    setLoading(false);
  }

  function update(id: string, patch: Partial<ConfigRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function moveProvider(id: string, idx: number, dir: -1 | 1) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const order = [...row.provider_order];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    update(id, { provider_order: order });
  }

  async function save(row: ConfigRow) {
    setSaving(row.id);
    const { error } = await supabase.from('ai_model_config').update({
      primary_model: row.primary_model.trim(),
      provider_order: row.provider_order,
      temperature: row.temperature,
      is_active: row.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    setSaving(null);
    if (error) toast({ title: 'Speichern fehlgeschlagen', description: error.message, variant: 'destructive' });
    else toast({ title: 'Gespeichert', description: row.display_name });
  }

  async function runTest(row: ConfigRow) {
    setTesting(row.id);
    setTestResults((r) => ({ ...r, [row.id]: '' }));
    const { data, error } = await supabase.functions.invoke('test-ai-model', {
      body: { use_case: row.use_case, model: row.primary_model },
    });
    setTesting(null);
    if (error) {
      setTestResults((r) => ({ ...r, [row.id]: `Fehler: ${error.message}` }));
      return;
    }
    if (data?.success) {
      setTestResults((r) => ({ ...r, [row.id]: `✅ ${data.provider} · ${data.latency_ms}ms · "${data.response}"` }));
    } else {
      setTestResults((r) => ({ ...r, [row.id]: `❌ ${data?.error ?? 'Fehler'}` }));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                {row.display_name}
                <Badge variant="outline" className="text-xs">{row.use_case}</Badge>
                {!row.is_active && <Badge variant="secondary">Inaktiv</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Aktiv</span>
                <Switch checked={row.is_active} onCheckedChange={(v) => update(row.id, { is_active: v })} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Modell */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Primär-Modell</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={RECOMMENDED_MODELS.find((m) => m.id === row.primary_model)?.id ?? '__custom'} onValueChange={(v) => v !== '__custom' && update(row.id, { primary_model: v })}>
                  <SelectTrigger><SelectValue placeholder="Aus Katalog wählen…" /></SelectTrigger>
                  <SelectContent>
                    {RECOMMENDED_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} · ${m.input_price_per_1m}/${m.output_price_per_1m}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom">— Eigenes Modell (Freitext) —</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={row.primary_model}
                  onChange={(e) => update(row.id, { primary_model: e.target.value })}
                  placeholder="z.B. anthropic/claude-sonnet-4"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Provider-Reihenfolge */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Provider-Reihenfolge (oben = zuerst)</label>
              <div className="space-y-1">
                {row.provider_order.map((p, idx) => (
                  <div key={p} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <span className="text-xs font-mono w-6 text-muted-foreground">{idx + 1}.</span>
                    <span className="flex-1 text-sm">{PROVIDER_LABELS[p]}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moveProvider(row.id, idx, -1)}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === row.provider_order.length - 1} onClick={() => moveProvider(row.id, idx, 1)}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {ALL_PROVIDERS.filter((p) => !row.provider_order.includes(p)).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_PROVIDERS.filter((p) => !row.provider_order.includes(p)).map((p) => (
                      <Button key={p} size="sm" variant="outline" onClick={() => update(row.id, { provider_order: [...row.provider_order, p] })}>
                        + {PROVIDER_LABELS[p]}
                      </Button>
                    ))}
                  </div>
                )}
                {row.provider_order.length > 1 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {row.provider_order.map((p, idx) => (
                      <Button key={`rm-${p}`} size="sm" variant="ghost" className="text-xs h-6 text-destructive" onClick={() => update(row.id, { provider_order: row.provider_order.filter((_, i) => i !== idx) })}>
                        − {PROVIDER_LABELS[p]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Temperatur */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Temperatur (optional)</label>
                <Input
                  type="number" min="0" max="2" step="0.1"
                  value={row.temperature ?? ''}
                  onChange={(e) => update(row.id, { temperature: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="Default"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button onClick={() => save(row)} disabled={saving === row.id} size="sm">
                {saving === row.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                Speichern
              </Button>
              <Button onClick={() => runTest(row)} disabled={testing === row.id} size="sm" variant="outline">
                {testing === row.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                Test
              </Button>
              {testResults[row.id] && (
                <span className="text-xs text-muted-foreground self-center">{testResults[row.id]}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}