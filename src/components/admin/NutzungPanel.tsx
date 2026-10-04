import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Info, TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { kaufaussicht, type Aussicht, type Stufe } from '@/lib/kaufaussicht';
import { cn } from '@/lib/utils';

/**
 * Nutzungs-Dashboard (Wunsch des Betreibers, 03.10.2026): Wie viele Kinder
 * und Eltern nutzen LernZeit wirklich, und welche Familien werden
 * wahrscheinlich ein Abo abschliessen?
 *
 * Daten ueber vier Admin-Funktionen, siehe Migration
 * 20261003160000_nutzung_dashboard.sql. Die Kaufaussicht ist eine offene
 * Faustregel (src/lib/kaufaussicht.ts), kein Modell.
 *
 * Testkonten: Fast alle bisherigen Konten sind Tests des Betreibers. Der
 * Schalter je Familie nimmt sie aus allen Zahlen.
 */

type Familie = Database['public']['Functions']['admin_nutzung_familien']['Returns'][number];
type Verlauf = Database['public']['Functions']['admin_nutzung_verlauf']['Returns'][number];
type Kohorte = Database['public']['Functions']['admin_nutzung_kohorten']['Returns'][number];
type MitAussicht = Familie & { aussicht: Aussicht };

const ZEITRAUM = [30, 90] as const;
const KOHORTEN_WOCHEN = 8;
const FARBE_A = 'var(--viz-1)';
const FARBE_B = 'var(--viz-2)';

const ABO_TEXT: Record<string, string> = {
  bezahlt: 'Bezahlt',
  testkauf: 'Testkauf',
  freigeschaltet: 'Freigeschaltet',
  testphase: 'Testphase',
  testphase_abgelaufen: 'Testphase vorbei',
  gekuendigt: 'Gekündigt',
  zahlung_offen: 'Zahlung offen',
  ohne: '–',
};

const STUFE_TEXT: Record<Stufe, string> = { zahlt: 'Zahlt', hoch: 'Hoch', mittel: 'Mittel', gering: 'Gering', keine: '–' };
const STUFE_RANG: Record<Stufe, number> = { hoch: 0, mittel: 1, zahlt: 2, gering: 3, keine: 4 };

type Filter = 'alle' | 'testphase' | 'aussicht' | 'zahlend' | 'ohne_kind' | 'kind_allein' | 'test';
const FILTER: { wert: Filter; text: string }[] = [
  { wert: 'alle', text: 'Alle Familien' },
  { wert: 'testphase', text: 'In Testphase' },
  { wert: 'aussicht', text: 'Aussicht hoch/mittel' },
  { wert: 'zahlend', text: 'Zahlend' },
  { wert: 'ohne_kind', text: 'Ohne Kind' },
  { wert: 'kind_allein', text: 'Kinder ohne Eltern' },
  { wert: 'test', text: 'Testkonten' },
];

function vorTagen(iso: string | null): string {
  if (!iso) return '–';
  const t = differenceInCalendarDays(new Date(), new Date(iso));
  if (t <= 0) return 'heute';
  if (t === 1) return 'gestern';
  return `vor ${t} Tagen`;
}

const datum = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const tagLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const prozent = (teil: number, ganz: number) => (ganz > 0 ? Math.round((teil / ganz) * 100) : null);

export function NutzungPanel() {
  const [ohneTest, setOhneTest] = useState(true);
  const [tage, setTage] = useState<(typeof ZEITRAUM)[number]>(30);
  const [familien, setFamilien] = useState<Familie[]>([]);
  const [verlauf, setVerlauf] = useState<Verlauf[]>([]);
  const [kohorten, setKohorten] = useState<Kohorte[]>([]);
  const [filter, setFilter] = useState<Filter>('alle');
  const [trichterTage, setTrichterTage] = useState<0 | 30 | 90>(0);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    // Doppelter Zeitraum fuer den Vergleich "7 Tage davor".
    const [f, v, k] = await Promise.all([
      supabase.rpc('admin_nutzung_familien'),
      supabase.rpc('admin_nutzung_verlauf', { p_tage: tage + 7, p_ohne_test: ohneTest }),
      supabase.rpc('admin_nutzung_kohorten', { p_wochen: KOHORTEN_WOCHEN, p_ohne_test: ohneTest }),
    ]);
    const err = f.error || v.error || k.error;
    if (err) setFehler(err.message);
    setFamilien(f.data ?? []);
    setVerlauf(v.data ?? []);
    setKohorten(k.data ?? []);
    setLaedt(false);
  }, [tage, ohneTest]);

  useEffect(() => { void laden(); }, [laden]);

  const testSetzen = async (id: string, test: boolean) => {
    setSpeichert(id);
    const { error } = await supabase.rpc('admin_testkonto_setzen', { p_user: id, p_test: test });
    setSpeichert(null);
    if (error) { setFehler(error.message); return; }
    await laden();
  };

  const alle: MitAussicht[] = useMemo(
    () => familien.map((f) => ({ ...f, aussicht: kaufaussicht(f) })),
    [familien],
  );
  const gezaehlt = useMemo(() => alle.filter((f) => !(ohneTest && f.testkonto)), [alle, ohneTest]);
  const fam = useMemo(() => gezaehlt.filter((f) => f.art === 'familie'), [gezaehlt]);

  // --- Kennzahlen ---------------------------------------------------------
  const letzter = verlauf[verlauf.length - 1];
  const vorWoche = verlauf[verlauf.length - 8];
  const inTestphase = fam.filter((f) => f.abo_status === 'testphase');
  const endetBald = inTestphase.filter((f) => f.aussicht.endetBald);
  const zahlend = fam.filter((f) => f.abo_status === 'bezahlt');
  const nachTestphase = fam.filter((f) => ['bezahlt', 'testphase_abgelaufen', 'gekuendigt'].includes(f.abo_status));
  const lernendeFamilien = fam.filter((f) => f.lerntage_14 > 0);
  const aussichtHoch = fam.filter((f) => f.aussicht.stufe === 'hoch').length;
  const aussichtMittel = fam.filter((f) => f.aussicht.stufe === 'mittel').length;

  const kennzahlen: { titel: string; wert: string; zeile?: React.ReactNode }[] = [
    {
      titel: 'Aktive Kinder (7 Tage)',
      wert: String(letzter?.kinder_aktiv_7t ?? 0),
      zeile: <Vergleich jetzt={letzter?.kinder_aktiv_7t} davor={vorWoche?.kinder_aktiv_7t} />,
    },
    {
      titel: 'Aktive Eltern (7 Tage)',
      wert: String(letzter?.eltern_aktiv_7t ?? 0),
      zeile: <Vergleich jetzt={letzter?.eltern_aktiv_7t} davor={vorWoche?.eltern_aktiv_7t} />,
    },
    {
      titel: 'Familien, die lernen',
      wert: String(lernendeFamilien.length),
      zeile: `von ${fam.length} · Kind lernte in 14 Tagen`,
    },
    {
      titel: 'In Testphase',
      wert: String(inTestphase.length),
      zeile: endetBald.length ? `${endetBald.length} enden in ≤ 7 Tagen` : 'keine endet in 7 Tagen',
    },
    {
      titel: 'Kaufaussicht hoch / mittel',
      wert: `${aussichtHoch} / ${aussichtMittel}`,
      zeile: 'Faustregel, siehe unten',
    },
    {
      titel: 'Zahlende Familien',
      wert: String(zahlend.length),
      zeile: nachTestphase.length
        ? `${zahlend.length} von ${nachTestphase.length} nach der Testphase`
        : 'noch keine Testphase beendet',
    },
  ];

  // --- Diagramme ----------------------------------------------------------
  const diagramm = useMemo(
    () => verlauf.slice(-tage).map((z) => ({ ...z, label: tagLabel(z.tag) })),
    [verlauf, tage],
  );

  // --- Trichter -----------------------------------------------------------
  const trichterBasis = fam.filter(
    (f) => trichterTage === 0 || differenceInCalendarDays(new Date(), new Date(f.registriert_am)) < trichterTage,
  );
  const trichter = [
    { text: 'Eltern registriert', n: trichterBasis.length },
    { text: 'Kind verknüpft', n: trichterBasis.filter((f) => f.kinder > 0).length },
    { text: 'Kind hat gelernt', n: trichterBasis.filter((f) => f.kinder_mit_runden > 0).length },
    { text: 'Lernt noch (letzte 14 Tage)', n: trichterBasis.filter((f) => f.lerntage_14 > 0).length },
    { text: 'Zahlt', n: trichterBasis.filter((f) => f.abo_status === 'bezahlt').length },
  ];

  // --- Liste --------------------------------------------------------------
  const liste = useMemo(() => {
    const sicht = alle.filter((f) => {
      if (filter === 'test') return f.testkonto;
      if (ohneTest && f.testkonto) return false;
      if (filter === 'kind_allein') return f.art === 'kind_allein';
      if (f.art !== 'familie') return false;
      if (filter === 'testphase') return f.abo_status === 'testphase';
      if (filter === 'aussicht') return f.aussicht.stufe === 'hoch' || f.aussicht.stufe === 'mittel';
      if (filter === 'zahlend') return f.abo_status === 'bezahlt';
      if (filter === 'ohne_kind') return f.kinder === 0;
      return true;
    });
    return sicht.sort(
      (a, b) =>
        STUFE_RANG[a.aussicht.stufe] - STUFE_RANG[b.aussicht.stufe] ||
        (b.letzte_runde ?? '').localeCompare(a.letzte_runde ?? '') ||
        b.registriert_am.localeCompare(a.registriert_am),
    );
  }, [alle, filter, ohneTest]);

  const testAnzahl = alle.filter((f) => f.testkonto).length;

  return (
    <div className="space-y-4 [--viz-1:#2a78d6] [--viz-2:#eb6834] dark:[--viz-1:#3987e5] dark:[--viz-2:#d95926]">
      {/* Filter in einer Reihe */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="ohne-test" checked={ohneTest} onCheckedChange={setOhneTest} />
          <Label htmlFor="ohne-test" className="text-sm">Testkonten ausblenden ({testAnzahl})</Label>
        </div>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void laden()} disabled={laedt}>
          {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Aktualisieren</span>
        </Button>
      </div>

      {fehler && <p className="text-sm text-destructive">Fehler: {fehler}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {kennzahlen.map((k) => (
          <Card key={k.titel}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.titel}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.wert}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.zeile}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verlauf */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Zeitraum">
          {ZEITRAUM.map((t) => (
            <Button key={t} size="sm" variant={tage === t ? 'default' : 'ghost'} onClick={() => setTage(t)} aria-pressed={tage === t}>
              {t} Tage
            </Button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">deutsche Zeit</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Diagrammkarte titel="Aktive Kinder" beschreibung="Kinder mit mindestens einer Lernrunde">
          <LineChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster zusatz={(z) => `Lernrunden: ${z.runden}`} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={legendeText} />
            <Line type="monotone" dataKey="kinder_aktiv_7t" name="in den 7 Tagen bis dahin" stroke={FARBE_A} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="kinder_aktiv" name="an diesem Tag" stroke={FARBE_B} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </Diagrammkarte>

        <Diagrammkarte titel="Aktive Eltern" beschreibung="App geöffnet oder Bildschirmzeit freigegeben">
          <LineChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={legendeText} />
            <Line type="monotone" dataKey="eltern_aktiv_7t" name="in den 7 Tagen bis dahin" stroke={FARBE_A} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="eltern_aktiv" name="an diesem Tag" stroke={FARBE_B} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </Diagrammkarte>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Trichter */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-auto">
                <CardTitle className="text-base">Vom Konto zum Abo</CardTitle>
                <CardDescription>Familien nach Registrierung – wie weit sie gekommen sind</CardDescription>
              </div>
              <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Registriert in">
                {([0, 90, 30] as const).map((t) => (
                  <Button key={t} size="sm" variant={trichterTage === t ? 'default' : 'ghost'} onClick={() => setTrichterTage(t)} aria-pressed={trichterTage === t}>
                    {t === 0 ? 'Alle' : `${t} T.`}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {trichter.map((s, i) => {
              const anteil = prozent(s.n, trichter[0].n);
              return (
                <div key={s.text}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{s.text}</span>
                    <span className="tabular-nums">
                      <span className="font-medium">{s.n}</span>
                      {i > 0 && <span className="ml-2 text-xs text-muted-foreground">{anteil === null ? '–' : `${anteil} %`}</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${anteil ?? 0}%`, background: FARBE_A }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Kohorten */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kommen Kinder wieder?</CardTitle>
            <CardDescription>Kinder nach der Woche ihrer ersten Lernrunde – Anteil, der in den Folgewochen gelernt hat</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-2 font-medium">Start</th>
                  <th className="py-1.5 pr-2 text-right font-medium">Kinder</th>
                  {Array.from({ length: KOHORTEN_WOCHEN }, (_, i) => (
                    <th key={i} className="px-0.5 py-1.5 text-center font-medium">W{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kohorten.map((k) => (
                  <tr key={k.kohorte}>
                    <td className="py-0.5 pr-2 whitespace-nowrap">{tagLabel(k.kohorte)}</td>
                    <td className="py-0.5 pr-2 text-right">{k.kinder}</td>
                    {k.aktiv.map((n, i) => {
                      const p = n === null ? null : prozent(n, k.kinder);
                      return (
                        <td key={i} className="p-0.5">
                          {p !== null && (
                            <div
                              className="relative overflow-hidden rounded py-1 text-center"
                              title={`${n} von ${k.kinder}`}
                            >
                              <div className="absolute inset-0" style={{ background: FARBE_A, opacity: 0.08 + (p / 100) * 0.6 }} />
                              <span className="relative text-foreground">{p}%</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!laedt && kohorten.length === 0 && (
                  <tr><td colSpan={KOHORTEN_WOCHEN + 2} className="py-4 text-center text-muted-foreground">Keine Kinder mit Lernrunden in den letzten {KOHORTEN_WOCHEN} Wochen</td></tr>
                )}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">W0 = Startwoche (immer 100 %), W1 = Woche danach usw. Wochen ab Montag.</p>
          </CardContent>
        </Card>
      </div>

      {/* Familien */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Familien</CardTitle>
          <CardDescription>Sortiert nach Kaufaussicht, dann nach letzter Lernrunde</CardDescription>
          <div className="flex flex-wrap gap-1.5 pt-2" role="group" aria-label="Familien filtern">
            {FILTER.map((f) => (
              <Button key={f.wert} size="sm" variant={filter === f.wert ? 'default' : 'outline'} className="h-7 px-2.5 text-xs" onClick={() => setFilter(f.wert)} aria-pressed={filter === f.wert}>
                {f.text}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Familie</th>
                <th className="py-2 pr-3 text-right font-medium">Kinder</th>
                <th className="py-2 pr-3 text-right font-medium">Lerntage 7 / 28</th>
                <th className="py-2 pr-3 font-medium">Letzte Lernrunde</th>
                <th className="py-2 pr-3 font-medium">Eltern zuletzt</th>
                <th className="py-2 pr-3 text-right font-medium">Freigaben 28 T.</th>
                <th className="py-2 pr-3 font-medium">Abo</th>
                <th className="py-2 pr-3 font-medium">Kaufaussicht</th>
                <th className="py-2 font-medium">Test</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((f) => (
                <tr key={f.id} className={cn('border-b align-top last:border-0', f.testkonto && 'text-muted-foreground')}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{f.name?.trim() || (f.art === 'kind_allein' ? 'Kind ohne Namen' : 'Ohne Namen')}</p>
                    <p className="text-xs text-muted-foreground">{f.email ?? '–'}</p>
                    <p className="text-xs text-muted-foreground">
                      seit {datum(f.registriert_am)}{f.plattform ? ` · ${f.plattform}` : ''}
                    </p>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {f.art === 'kind_allein' ? '–' : f.kinder}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.lerntage_7} / {f.lerntage_28}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{vorTagen(f.letzte_runde)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{f.art === 'kind_allein' ? '–' : vorTagen(f.eltern_zuletzt)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{f.art === 'kind_allein' ? '–' : f.freigaben_28}</td>
                  <td className="py-2 pr-3">
                    <p className="whitespace-nowrap">{ABO_TEXT[f.abo_status] ?? f.abo_status}{f.abo_quelle ? <span className="ml-1 text-xs text-muted-foreground">{f.abo_quelle}</span> : null}</p>
                    {f.abo_status === 'testphase' && f.aussicht.restTage !== null && (
                      <p className={cn('flex items-center gap-1 text-xs', f.aussicht.endetBald ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {f.aussicht.endetBald && <Clock className="h-3 w-3" />}
                        noch {f.aussicht.restTage} {f.aussicht.restTage === 1 ? 'Tag' : 'Tage'}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {f.aussicht.stufe !== 'keine' && (
                      <Badge variant={f.aussicht.stufe === 'hoch' || f.aussicht.stufe === 'zahlt' ? 'default' : f.aussicht.stufe === 'mittel' ? 'secondary' : 'outline'}>
                        {STUFE_TEXT[f.aussicht.stufe]}
                      </Badge>
                    )}
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {f.aussicht.gruende.map((g) => <li key={g}>{g}</li>)}
                    </ul>
                  </td>
                  <td className="py-2">
                    <Switch
                      checked={f.testkonto}
                      disabled={speichert === f.id || (f.testkonto && f.testkonto_grund !== 'markiert')}
                      onCheckedChange={(v) => void testSetzen(f.id, v)}
                      aria-label={`${f.name || 'Konto'} als Testkonto markieren`}
                    />
                    {f.testkonto && f.testkonto_grund !== 'markiert' && (
                      <p className="mt-1 max-w-[7rem] text-[11px] text-muted-foreground">{f.testkonto_grund}</p>
                    )}
                  </td>
                </tr>
              ))}
              {!laedt && liste.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-muted-foreground">Keine Einträge</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground"><Info className="h-4 w-4" /> Was die Zahlen bedeuten</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Aktives Kind</strong>: mindestens eine Lernrunde. <strong>Aktive Eltern</strong>: App geöffnet oder Bildschirmzeit freigegeben (App-Öffnungen der Eltern erst seit 18.08.2026 erfasst).</li>
            <li><strong>Familie</strong> = Elternkonto mit den verknüpften Kindern. Das Abo hängt am Elternkonto. Kinder ohne Elternkonto zählen bei den aktiven Kindern mit, können aber kein Abo abschließen.</li>
            <li><strong>Kaufaussicht</strong> ist eine Faustregel, kein Modell – dafür gibt es noch zu wenige echte Käufe. Punkte: Kind lernt an 5+ von 14 Tagen (+2, an 2–4 Tagen +1), Eltern geben Zeit frei (+1), Eltern an 2+ Tagen aktiv (+1), Kauf begonnen (+2). Hoch ab 4, mittel ab 2. Ohne verknüpftes Kind immer gering.</li>
            <li><strong>Bezahlt</strong> heißt: aktives Abo über App Store, Play Store oder Stripe. Käufe aus der Apple-Testumgebung zählen als <em>Testkauf</em>. Ob ein Stripe-Abo im Testmodus lief, ist hier nicht zu sehen – solche Konten bitte als Test markieren.</li>
            <li><strong>Testkonten</strong>: per Schalter markierte Konten, E-Mails auf lernzeit.app oder test.de, Admins und die Kinder dieser Konten. Sie fallen aus allen Zahlen, solange „Testkonten ausblenden“ an ist.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Vergleich({ jetzt, davor }: { jetzt?: number; davor?: number }) {
  if (jetzt === undefined || davor === undefined) return null;
  const diff = jetzt - davor;
  return (
    <span className="flex items-center gap-1">
      {diff === 0 ? <Minus className="h-3 w-3" /> : diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff === 0 ? 'wie vor 7 Tagen' : `${diff > 0 ? '+' : ''}${diff} zu vor 7 Tagen`}
    </span>
  );
}

function Diagrammkarte({ titel, beschreibung, children }: { titel: string; beschreibung: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{titel}</CardTitle>
        <CardDescription>{beschreibung}</CardDescription>
      </CardHeader>
      <CardContent className="h-56 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const legendeText = (wert: string) => <span className="text-muted-foreground">{wert}</span>;

function Hinweisfenster({ active, payload, label, zusatz }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string; dataKey: string; payload: Verlauf }>;
  label?: string;
  zusatz?: (zeile: Verlauf) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.stroke ?? p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">{p.value}</span>
        </p>
      ))}
      {zusatz && <p className="mt-1 text-muted-foreground">{zusatz(payload[0].payload)}</p>}
    </div>
  );
}
