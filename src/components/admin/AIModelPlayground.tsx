import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RECOMMENDED_MODELS, PROVIDER_LABELS, type ProviderId } from '@/lib/modelCatalog';
import { Loader2, Play, Trophy, CheckCircle2, XCircle, Zap, Sparkles } from 'lucide-react';

type UseCaseId = 'question_generator' | 'validate_answer' | 'ai_explain' | 'ai_tutor' | 'analyze_feedback' | 'learning_plan' | 'custom';

interface Preset {
  id: UseCaseId;
  label: string;
  system: string;
  prompt: string;
}

const PRESETS: Preset[] = [
  {
    id: 'question_generator',
    label: 'Frage erstellen (Klasse 3, Mathematik)',
    system: 'Du bist ein Lehrer, der altersgerechte Mathe-Aufgaben für deutsche Grundschüler erstellt. Antworte ausschließlich mit gültigem JSON.',
    prompt: `Erstelle EINE Multiple-Choice-Aufgabe für Klasse 3 zum Thema "Schriftliche Addition im ZR 1000".
Format (JSON):
{"question":"...","options":["A","B","C","D"],"correct_answer":"...","hint":"..."}
Sprache: Deutsch. Keine Markdown-Formatierung.`,
  },
  {
    id: 'validate_answer',
    label: 'Antwort validieren (Tippfehler-Toleranz)',
    system: 'Du bewertest, ob die Schülerantwort sachlich korrekt ist. Tippfehler sind erlaubt.',
    prompt: `Frage: "Wie heißt die Hauptstadt von Frankreich?"
Korrekte Antwort: "Paris"
Schülerantwort: "Pariss"

Antworte NUR mit JSON: {"is_correct": true|false, "reason": "kurz, max 10 Wörter"}`,
  },
  {
    id: 'ai_explain',
    label: 'Erklärung für Kind (Klasse 2)',
    system: 'Du erklärst einem 7-jährigen Kind in einfachen Worten. Max 12 Wörter pro Satz, kein Markdown, freundlich.',
    prompt: `Aufgabe: 7 + 5 = ?
Korrekte Antwort: 12
Antwort des Kindes: 11

Erkläre dem Kind freundlich (max. 2 Sätze, max. 10–12 Wörter pro Satz), warum 12 richtig ist.`,
  },
  {
    id: 'ai_tutor',
    label: 'KI-Tutor (Hilfe geben, nicht Lösung)',
    system: 'Du bist ein geduldiger Lerncoach für deutsche Grundschüler. Gib Hilfestellungen, niemals direkt die Lösung.',
    prompt: `Klasse 3: Das Kind soll 24 ÷ 6 berechnen und ist unsicher.
Gib EINEN hilfreichen Tipp (1–2 Sätze) ohne die Lösung zu verraten.`,
  },
  {
    id: 'analyze_feedback',
    label: 'Feedback analysieren & Regel ableiten',
    system: 'Du analysierst Nutzer-Feedback zu KI-generierten Lernfragen und leitest präzise Verbesserungsregeln ab.',
    prompt: `5 Eltern haben sich beschwert, dass Mathe-Aufgaben für Klasse 1 zu lange Wortanweisungen haben.
Beispiele:
- "Wie viele Äpfel bleiben übrig, wenn Anna von ihren ursprünglich 8 Äpfeln 3 an ihren Bruder Tim verschenkt?"
- "Berechne die Summe der beiden folgenden natürlichen Zahlen: 4 und 5."

Leite EINE konkrete, kurze Regel (max 25 Wörter) ab, die in den System-Prompt integriert werden kann. Antworte NUR mit der Regel, ohne Einleitung.`,
  },
  {
    id: 'learning_plan',
    label: 'Lernplan generieren (5 Tage)',
    system: 'Du erstellst strukturierte 5-Tages-Lernpläne für deutsche Schüler.',
    prompt: `Erstelle einen 5-Tage-Lernplan für ein Kind in Klasse 4 zur Vorbereitung auf einen Mathe-Test über "Schriftliche Division".
Format JSON-Array: [{"day":1,"topic":"...","tasks":["...","..."],"duration_min":20}, ...]`,
  },
  { id: 'custom', label: 'Eigener Prompt', system: '', prompt: '' },
];

interface RunResult {
  model: string;
  provider: ProviderId;
  native_model: string;
  ok: boolean;
  status: number | null;
  latency_ms: number;
  output?: string;
  error?: string;
  judge_score?: number;
  judge_reason?: string;
}

export function AIModelPlayground() {
  const [presetId, setPresetId] = useState<UseCaseId>('question_generator');
  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId)!, [presetId]);
  const [system, setSystem] = useState(preset.system);
  const [prompt, setPrompt] = useState(preset.prompt);
  const [enableJudge, setEnableJudge] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const { toast } = useToast();

  // Default candidate selection: all free + a few cheap ones
  const initialSelection = useMemo(() => {
    const out: Array<{ key: string; model: string; provider: ProviderId }> = [];
    for (const m of RECOMMENDED_MODELS) {
      for (const p of m.available_on) {
        out.push({ key: `${m.id}__${p}`, model: m.id, provider: p });
      }
    }
    return out;
  }, []);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    return new Set([
      'openrouter/free__openrouter',
      'google/gemma-3-12b-it__openrouter',
      'google/gemini-2.5-flash-lite__gemini_direct',
      'google/gemini-2.5-flash__gemini_direct',
    ]);
  });

  function applyPreset(id: UseCaseId) {
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id)!;
    setSystem(p.system);
    setPrompt(p.prompt);
    setResults([]);
  }

  function toggle(key: string) {
    setSelectedKeys((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function selectFree() {
    const keys = new Set<string>();
    for (const m of RECOMMENDED_MODELS) {
      if (m.input_price_per_1m === 0 && m.output_price_per_1m === 0) {
        for (const p of m.available_on) keys.add(`${m.id}__${p}`);
      }
    }
    setSelectedKeys(keys);
  }

  async function run() {
    if (!prompt.trim()) {
      toast({ title: 'Prompt fehlt', variant: 'destructive' });
      return;
    }
    const candidates = initialSelection.filter((c) => selectedKeys.has(c.key)).map(({ model, provider }) => ({ model, provider }));
    if (candidates.length === 0) {
      toast({ title: 'Mindestens 1 Modell auswählen', variant: 'destructive' });
      return;
    }
    if (candidates.length > 8) {
      toast({ title: 'Maximal 8 Modelle gleichzeitig', variant: 'destructive' });
      return;
    }
    setRunning(true);
    setResults([]);
    const { data, error } = await supabase.functions.invoke('ai-model-benchmark', {
      body: {
        use_case: presetId,
        prompt,
        system: system || undefined,
        candidates,
        judge: enableJudge,
      },
    });
    setRunning(false);
    if (error) {
      toast({ title: 'Benchmark fehlgeschlagen', description: error.message, variant: 'destructive' });
      return;
    }
    if (!data?.success) {
      toast({ title: 'Fehler', description: data?.error ?? 'Unbekannt', variant: 'destructive' });
      return;
    }
    setResults(data.results as RunResult[]);
  }

  const winner = results.find((r) => r.ok && r.judge_score !== undefined);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            KI-Modell Playground & Benchmark
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Teste mehrere Modelle parallel an einem realen Use-Case-Prompt. Optional bewertet ein KI-Juror (Gemini 2.5 Pro) die Qualität jeder Antwort von 1–10.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Use-Case Preset</label>
            <Select value={presetId} onValueChange={(v) => applyPreset(v as UseCaseId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System & Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">System-Prompt (optional)</label>
            <Textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={2} className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">User-Prompt</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} className="font-mono text-xs" />
          </div>

          {/* Candidates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Modelle auswählen ({selectedKeys.size}/8)
              </label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectFree}>
                  <Zap className="w-3 h-3 mr-1" /> Nur kostenlose
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedKeys(new Set())}>Leeren</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-72 overflow-y-auto border rounded-md p-2 bg-muted/20">
              {initialSelection.map((c) => {
                const m = RECOMMENDED_MODELS.find((x) => x.id === c.model)!;
                const isFree = m.input_price_per_1m === 0 && m.output_price_per_1m === 0;
                return (
                  <label key={c.key} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedKeys.has(c.key)} onCheckedChange={() => toggle(c.key)} />
                    <span className="flex-1 truncate">{m.label}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{PROVIDER_LABELS[c.provider]}</Badge>
                    {isFree ? <Badge className="text-[10px] h-4 px-1 bg-green-600">FREE</Badge>
                     : <span className="text-[10px] text-muted-foreground">${m.input_price_per_1m}</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Judge toggle */}
          <div className="flex items-center justify-between p-2 border rounded bg-muted/20">
            <div>
              <div className="text-sm font-medium">KI-Juror aktivieren</div>
              <div className="text-xs text-muted-foreground">Gemini 2.5 Pro bewertet die Outputs (1–10) und erstellt ein Ranking.</div>
            </div>
            <Switch checked={enableJudge} onCheckedChange={setEnableJudge} />
          </div>

          <Button onClick={run} disabled={running} className="w-full">
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? 'Läuft… (kann bis zu 60s dauern)' : `${selectedKeys.size} Modell${selectedKeys.size === 1 ? '' : 'e'} testen`}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ergebnisse
              {winner && (
                <Badge className="ml-2">
                  Sieger: {RECOMMENDED_MODELS.find((m) => m.id === winner.model)?.label ?? winner.model}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => {
              const info = RECOMMENDED_MODELS.find((m) => m.id === r.model);
              return (
                <div key={i} className={`border rounded-md p-3 ${i === 0 && r.ok ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-muted/10'}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    <span className="font-medium text-sm">{info?.label ?? r.model}</span>
                    <Badge variant="outline" className="text-[10px]">{PROVIDER_LABELS[r.provider]}</Badge>
                    <span className="text-xs text-muted-foreground">{r.latency_ms}ms</span>
                    {r.status && <Badge variant={r.ok ? 'default' : 'destructive'} className="text-[10px]">HTTP {r.status}</Badge>}
                    {r.judge_score !== undefined && (
                      <Badge className={`ml-auto text-xs ${r.judge_score >= 8 ? 'bg-green-600' : r.judge_score >= 5 ? 'bg-yellow-600' : 'bg-destructive'}`}>
                        Juror: {r.judge_score}/10
                      </Badge>
                    )}
                  </div>
                  {r.judge_reason && <div className="text-xs text-muted-foreground italic mb-1">Juror: {r.judge_reason}</div>}
                  {r.output && (
                    <pre className="text-xs whitespace-pre-wrap break-words bg-background/60 border rounded p-2 max-h-60 overflow-y-auto font-mono">{r.output}</pre>
                  )}
                  {r.error && <div className="text-xs text-destructive break-all">{r.error.slice(0, 300)}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}