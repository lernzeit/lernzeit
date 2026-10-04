import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrierungsTrichter } from '@/components/admin/RegistrierungsTrichter';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

/**
 * Marketing-Dashboard (Wunsch des Betreibers, 03.10.2026): Website-Besuche,
 * Store-Klicks, App-Erstoeffnungen und Registrierungen je Tag/Woche/Monat,
 * dazu Kanaele und Anzeigen.
 *
 * Alle Zahlen kommen aus eigenen Daten in Supabase (analytics_events,
 * profiles) ueber zwei Admin-Funktionen — siehe Migration
 * 20261003130000_marketing_dashboard_store_klicks.sql. Was die Zahlen
 * bedeuten und was nicht, steht dort und unten im Hinweis-Kasten.
 *
 * Farben: Blau/Orange aus der Referenzpalette, geprueft mit dem Palette-
 * Validator (hell und dunkel, auch fuer Farbenblindheit). Jedes Diagramm hat
 * genau eine Achse; zwei Groessen = zwei Diagramme.
 */

type Verlauf = Database['public']['Functions']['admin_marketing_verlauf']['Returns'][number];
type Kanal = Database['public']['Functions']['admin_marketing_kanalbericht']['Returns'][number];
type Raster = 'tag' | 'woche' | 'monat';

const RASTER: Record<Raster, { label: string; anzahl: number; einheit: string }> = {
  tag: { label: 'Täglich', anzahl: 30, einheit: '30 Tage' },
  woche: { label: 'Wöchentlich', anzahl: 12, einheit: '12 Wochen' },
  monat: { label: 'Monatlich', anzahl: 12, einheit: '12 Monate' },
};

const KANAL_ZEITRAUM = [7, 30, 90] as const;

const FARBE_A = 'var(--viz-1)';
const FARBE_B = 'var(--viz-2)';

function periodeLabel(iso: string, raster: Raster): string {
  const d = new Date(`${iso}T12:00:00`);
  if (raster === 'monat') return d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
  if (raster === 'woche') return `KW ${kalenderwoche(d)}`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function kalenderwoche(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - jahresanfang.getTime()) / 86400000 + 1) / 7);
}

const summe = (zeilen: Verlauf[], f: (z: Verlauf) => number) => zeilen.reduce((a, z) => a + f(z), 0);
const quote = (teil: number, ganz: number) => (ganz > 0 ? `${((teil / ganz) * 100).toFixed(1).replace('.', ',')} %` : '–');

export function MarketingPanel() {
  const [raster, setRaster] = useState<Raster>('woche');
  const [verlauf, setVerlauf] = useState<Verlauf[]>([]);
  const [kanalTage, setKanalTage] = useState<(typeof KANAL_ZEITRAUM)[number]>(30);
  const [kanaele, setKanaele] = useState<Kanal[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    // Doppelter Zeitraum: die zweite Haelfte ist der Vergleich (vorige
    // 30 Tage / 12 Wochen / 12 Monate) fuer die Kennzahlen oben.
    const [v, k] = await Promise.all([
      supabase.rpc('admin_marketing_verlauf', { p_raster: raster, p_anzahl: RASTER[raster].anzahl * 2 }),
      supabase.rpc('admin_marketing_kanalbericht', { p_tage: kanalTage }),
    ]);
    if (v.error || k.error) setFehler((v.error || k.error)?.message ?? 'Unbekannter Fehler');
    setVerlauf(v.data ?? []);
    setKanaele(k.data ?? []);
    setLaedt(false);
  }, [raster, kanalTage]);

  useEffect(() => { void laden(); }, [laden]);

  const n = RASTER[raster].anzahl;
  const aktuell = useMemo(() => verlauf.slice(-n), [verlauf, n]);
  const vorher = useMemo(() => verlauf.slice(0, Math.max(0, verlauf.length - n)), [verlauf, n]);

  const diagramm = useMemo(
    () => aktuell.map((z) => ({ ...z, label: periodeLabel(z.periode, raster) })),
    [aktuell, raster],
  );

  const kennzahlen = [
    { titel: 'Website-Besucher', wert: (z: Verlauf) => z.website_besucher },
    { titel: 'Store-Klicks', wert: (z: Verlauf) => z.store_klicks_ios + z.store_klicks_android, hinweis: 'erfasst ab 03.10.2026' },
    { titel: 'App-Erstöffnungen iOS', wert: (z: Verlauf) => z.erstoeffnungen_ios },
    { titel: 'App-Erstöffnungen Android', wert: (z: Verlauf) => z.erstoeffnungen_android },
    { titel: 'Registrierungen Eltern', wert: (z: Verlauf) => z.registrierungen_eltern },
    { titel: 'Registrierungen Kinder', wert: (z: Verlauf) => z.registrierungen_kinder },
  ];

  return (
    <div className="space-y-4 [--viz-1:#2a78d6] [--viz-2:#eb6834] dark:[--viz-1:#3987e5] dark:[--viz-2:#d95926]">
      {/* Filter in einer Reihe */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Zeitraster">
          {(Object.keys(RASTER) as Raster[]).map((r) => (
            <Button key={r} size="sm" variant={raster === r ? 'default' : 'ghost'} onClick={() => setRaster(r)} aria-pressed={raster === r}>
              {RASTER[r].label}
            </Button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">letzte {RASTER[raster].einheit}, deutsche Zeit</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void laden()} disabled={laedt}>
          {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Aktualisieren</span>
        </Button>
      </div>

      {fehler && <p className="text-sm text-destructive">Laden fehlgeschlagen: {fehler}</p>}

      {/* Kennzahlen: Summe im Zeitraum, Vergleich mit dem Zeitraum davor */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {kennzahlen.map((k) => {
          const jetzt = summe(aktuell, k.wert);
          const davor = summe(vorher, k.wert);
          const diff = davor > 0 ? Math.round(((jetzt - davor) / davor) * 100) : null;
          return (
            <Card key={k.titel}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.titel}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{jetzt.toLocaleString('de-DE')}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {diff === null ? <Minus className="h-3 w-3" /> : diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {diff === null ? 'kein Vergleich' : `${diff >= 0 ? '+' : ''}${diff} % zum Zeitraum davor`}
                </p>
                {k.hinweis && <p className="mt-0.5 text-[11px] text-muted-foreground">{k.hinweis}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Diagramme: je eine Groesse, je eine Achse */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Diagrammkarte titel="Website-Besucher" beschreibung="Verschiedene Besucher je Zeitraum; Seitenaufrufe beim Antippen">
          <LineChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster zusatz={(z) => `Seitenaufrufe: ${z.website_aufrufe}`} />} />
            <Line type="monotone" dataKey="website_besucher" name="Besucher" stroke={FARBE_A} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </Diagrammkarte>

        <Diagrammkarte titel="App-Erstöffnungen" beschreibung="Geräte, die LernZeit installiert und erstmals geöffnet haben">
          <BarChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={legendeText} />
            <Bar dataKey="erstoeffnungen_ios" name="iOS" fill={FARBE_A} radius={[4, 4, 0, 0]} />
            <Bar dataKey="erstoeffnungen_android" name="Android" fill={FARBE_B} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Diagrammkarte>

        <Diagrammkarte titel="Registrierungen" beschreibung="Neue Konten">
          <BarChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={legendeText} />
            <Bar dataKey="registrierungen_eltern" name="Eltern" fill={FARBE_A} radius={[4, 4, 0, 0]} />
            <Bar dataKey="registrierungen_kinder" name="Kinder" fill={FARBE_B} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Diagrammkarte>

        <Diagrammkarte titel="Store-Klicks auf der Website" beschreibung="„Im App Store/Play Store öffnen“ – erfasst ab 03.10.2026">
          <BarChart data={diagramm} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip content={<Hinweisfenster />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={legendeText} />
            <Bar dataKey="store_klicks_ios" name="App Store" fill={FARBE_A} radius={[4, 4, 0, 0]} />
            <Bar dataKey="store_klicks_android" name="Play Store" fill={FARBE_B} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Diagrammkarte>
      </div>

      {/* Tabellenansicht derselben Zahlen */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verlauf als Tabelle</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Zeitraum</th>
                <th className="py-2 pr-3 text-right font-medium">Besucher</th>
                <th className="py-2 pr-3 text-right font-medium">Aufrufe</th>
                <th className="py-2 pr-3 text-right font-medium">Store iOS</th>
                <th className="py-2 pr-3 text-right font-medium">Store Android</th>
                <th className="py-2 pr-3 text-right font-medium">Öffn. iOS</th>
                <th className="py-2 pr-3 text-right font-medium">Öffn. Android</th>
                <th className="py-2 pr-3 text-right font-medium">Reg. Eltern</th>
                <th className="py-2 text-right font-medium">Reg. Kinder</th>
              </tr>
            </thead>
            <tbody>
              {[...diagramm].reverse().map((z) => (
                <tr key={z.periode} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">{z.label}</td>
                  <td className="py-1.5 pr-3 text-right">{z.website_besucher}</td>
                  <td className="py-1.5 pr-3 text-right">{z.website_aufrufe}</td>
                  <td className="py-1.5 pr-3 text-right">{z.store_klicks_ios}</td>
                  <td className="py-1.5 pr-3 text-right">{z.store_klicks_android}</td>
                  <td className="py-1.5 pr-3 text-right">{z.erstoeffnungen_ios}</td>
                  <td className="py-1.5 pr-3 text-right">{z.erstoeffnungen_android}</td>
                  <td className="py-1.5 pr-3 text-right">{z.registrierungen_eltern}</td>
                  <td className="py-1.5 text-right">{z.registrierungen_kinder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <RegistrierungsTrichter />

      {/* Kanaele und Anzeigen */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <CardTitle className="text-base">Kanäle und Anzeigen</CardTitle>
              <CardDescription>Website-Besucher nach erstem Kontakt und was sie danach getan haben</CardDescription>
            </div>
            <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Zeitraum Kanäle">
              {KANAL_ZEITRAUM.map((t) => (
                <Button key={t} size="sm" variant={kanalTage === t ? 'default' : 'ghost'} onClick={() => setKanalTage(t)} aria-pressed={kanalTage === t}>
                  {t} Tage
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Kanal</th>
                <th className="py-2 pr-3 font-medium">Kampagne</th>
                <th className="py-2 pr-3 font-medium">Anzeige</th>
                <th className="py-2 pr-3 text-right font-medium">Besucher</th>
                <th className="py-2 pr-3 text-right font-medium">Store-Klicks</th>
                <th className="py-2 pr-3 text-right font-medium">Quote</th>
                <th className="py-2 pr-3 text-right font-medium">Registrieren geklickt</th>
                <th className="py-2 text-right font-medium">Demo</th>
              </tr>
            </thead>
            <tbody>
              {kanaele.map((k, i) => (
                <tr key={`${k.kanal}-${k.kampagne}-${k.anzeige}-${i}`} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">
                    <span className="font-medium">{k.kanal}</span>
                    {k.medium && <span className="ml-1 text-xs text-muted-foreground">{k.medium}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{k.kampagne || '–'}</td>
                  <td className={cn('py-1.5 pr-3 text-muted-foreground', k.anzeige && 'font-mono text-xs')}>{k.anzeige || '–'}</td>
                  <td className="py-1.5 pr-3 text-right">{k.besucher}</td>
                  <td className="py-1.5 pr-3 text-right">{k.store_klicks}</td>
                  <td className="py-1.5 pr-3 text-right">{quote(k.store_klicks, k.besucher)}</td>
                  <td className="py-1.5 pr-3 text-right">{k.registrierung_klicks}</td>
                  <td className="py-1.5 text-right">{k.demo_starts}</td>
                </tr>
              ))}
              {!laedt && kanaele.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Keine Besuche im Zeitraum</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground"><Info className="h-4 w-4" /> Was die Zahlen bedeuten</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>App-Erstöffnungen</strong> sind keine Downloads: gezählt wird ein Gerät, das LernZeit installiert <em>und</em> geöffnet hat. Eine Neuinstallation zählt erneut. Echte Download-Zahlen gibt es nur in App Store Connect und der Google Play Console.</li>
            <li><strong>Kanäle</strong> gelten nur für die Website. Wer über den Store installiert, lässt sich keinem Kanal zuordnen – die App erhebt bewusst keine Werbe-Kennung. Für Anzeigen ist darum die <strong>Quote</strong> (Store-Klicks je Besucher) der beste Erfolgswert.</li>
            <li><strong>Anzeige</strong> steht nur da, wenn die Anzeige ihre Kennung mitgibt. In Meta unter „URL-Parameter“: <code className="rounded bg-muted px-1">utm_content={'{{ad.id}}'}</code> – sonst landen alle Besuche einer Kampagne in einer Zeile.</li>
            <li>Deine eigenen Test-Besuche zählen mit.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
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

/** Legende in Textfarbe — die Farbe traegt nur der Punkt davor. */
const legendeText = (wert: string) => <span className="text-muted-foreground">{wert}</span>;

/** Tooltip in Text-Farben; die Farbe steht nur am Punkt daneben. */
function Hinweisfenster({ active, payload, label, zusatz }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string; fill?: string; dataKey: string; payload: Verlauf }>;
  label?: string;
  zusatz?: (zeile: Verlauf) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill ?? p.stroke ?? p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">{p.value}</span>
        </p>
      ))}
      {zusatz && <p className="mt-1 text-muted-foreground">{zusatz(payload[0].payload)}</p>}
    </div>
  );
}
