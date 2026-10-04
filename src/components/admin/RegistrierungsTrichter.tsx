import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Registrierungs-Trichter (seit 04.10.2026): wo Besucher zwischen Startseite
 * und fertigem Konto aussteigen, nach Herkunft und Geraet. Daten aus
 * `admin_registrierungs_trichter` (nur Admins). Abschnitte, Formularschritte,
 * Fehler, Abbrueche und Verweildauer werden erst ab dem 04.10.2026 erfasst.
 */

interface Zeile {
  herkunft: string;
  geraet: string;
  besucher: number;
  verweildauer_median_s: number | null;
  hero: number;
  so_funktionierts: number;
  preise: number;
  faq: number;
  fusszeile: number;
  cta_demo: number;
  store_klick: number;
  formular_geoeffnet: number;
  rolle_gewaehlt: number;
  eingabe_begonnen: number;
  abgeschickt: number;
  mit_fehler: number;
  abgebrochen: number;
  registriert: number;
}

interface Bericht {
  trichter: Zeile[];
  fehler: { fehler: string; anzahl: number; besucher: number }[];
  abbruch: { schritt: string; besucher: number; sekunden_median: number | null }[];
}

const SPALTEN: { key: keyof Zeile; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'so_funktionierts', label: "So funktioniert's" },
  { key: 'preise', label: 'Preise' },
  { key: 'faq', label: 'FAQ' },
  { key: 'fusszeile', label: 'Fußzeile' },
  { key: 'cta_demo', label: 'CTA / Demo' },
  { key: 'store_klick', label: 'Store-Klick' },
  { key: 'formular_geoeffnet', label: 'Formular' },
  { key: 'rolle_gewaehlt', label: 'Rolle' },
  { key: 'eingabe_begonnen', label: 'Eingabe' },
  { key: 'abgeschickt', label: 'Abgeschickt' },
  { key: 'mit_fehler', label: 'Fehler' },
  { key: 'abgebrochen', label: 'Abbruch' },
  { key: 'registriert', label: 'Registriert' },
];

const ZEITRAUM = [7, 14, 28] as const;

type RpcAufruf = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

function prozent(teil: number, ganz: number) {
  return ganz > 0 ? `${Math.round((teil / ganz) * 100)} %` : '–';
}

export function RegistrierungsTrichter() {
  const [tage, setTage] = useState<(typeof ZEITRAUM)[number]>(7);
  const [bericht, setBericht] = useState<Bericht | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    const rpc = supabase.rpc.bind(supabase) as unknown as RpcAufruf;
    const { data, error } = await rpc('admin_registrierungs_trichter', { p_tage: tage });
    if (error) setFehler(error.message);
    setBericht((data as Bericht) ?? null);
    setLaedt(false);
  }, [tage]);

  useEffect(() => { void laden(); }, [laden]);

  const summe = useMemo(() => {
    const z = bericht?.trichter ?? [];
    const s = { besucher: 0 } as Record<string, number>;
    for (const r of z) {
      s.besucher += r.besucher;
      for (const sp of SPALTEN) s[sp.key] = (s[sp.key] ?? 0) + (r[sp.key] as number);
    }
    return s;
  }, [bericht]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <CardTitle className="text-base">Registrierungs-Trichter</CardTitle>
            <CardDescription>
              Eindeutige Besucher je Schritt, nach Herkunft und Gerät. Abschnitte, Formularschritte, Fehler,
              Abbrüche und Verweildauer werden seit 04.10.2026 erfasst.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Zeitraum Trichter">
            {ZEITRAUM.map((t) => (
              <Button key={t} size="sm" variant={tage === t ? 'default' : 'ghost'} onClick={() => setTage(t)} aria-pressed={tage === t}>
                {t} Tage
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        {fehler && <p className="text-sm text-destructive">Laden fehlgeschlagen: {fehler}</p>}
        {laedt && !bericht && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {bericht && (
          <>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Herkunft</th>
                  <th className="py-2 pr-3 font-medium">Gerät</th>
                  <th className="py-2 pr-3 text-right font-medium">Besucher</th>
                  <th className="py-2 pr-3 text-right font-medium">Verweildauer (Median)</th>
                  {SPALTEN.map((s) => (
                    <th key={s.key} className="py-2 pr-3 text-right font-medium">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bericht.trichter.map((r) => (
                  <tr key={`${r.herkunft}-${r.geraet}`} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{r.herkunft}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{r.geraet}</td>
                    <td className="py-1.5 pr-3 text-right">{r.besucher}</td>
                    <td className="py-1.5 pr-3 text-right">{r.verweildauer_median_s == null ? '–' : `${Math.round(r.verweildauer_median_s)} s`}</td>
                    {SPALTEN.map((s) => (
                      <td key={s.key} className="py-1.5 pr-3 text-right" title={prozent(r[s.key] as number, r.besucher)}>
                        {r[s.key] as number}
                      </td>
                    ))}
                  </tr>
                ))}
                {bericht.trichter.length > 0 && (
                  <tr className="border-t font-medium">
                    <td className="py-1.5 pr-3" colSpan={2}>Summe</td>
                    <td className="py-1.5 pr-3 text-right">{summe.besucher}</td>
                    <td className="py-1.5 pr-3 text-right">–</td>
                    {SPALTEN.map((s) => (
                      <td key={s.key} className="py-1.5 pr-3 text-right">
                        {summe[s.key]}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">{prozent(summe[s.key], summe.besucher)}</span>
                      </td>
                    ))}
                  </tr>
                )}
                {!laedt && bericht.trichter.length === 0 && (
                  <tr><td colSpan={SPALTEN.length + 4} className="py-4 text-center text-muted-foreground">Keine Besuche im Zeitraum</td></tr>
                )}
              </tbody>
            </table>

            <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
              <div>
                <p className="mb-1 text-sm font-medium">Fehlermeldungen im Formular</p>
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1 pr-3 font-medium">Fehler</th>
                      <th className="py-1 pr-3 text-right font-medium">Anzahl</th>
                      <th className="py-1 text-right font-medium">Besucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bericht.fehler.map((f) => (
                      <tr key={f.fehler} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono text-xs">{f.fehler}</td>
                        <td className="py-1 pr-3 text-right">{f.anzahl}</td>
                        <td className="py-1 text-right">{f.besucher}</td>
                      </tr>
                    ))}
                    {bericht.fehler.length === 0 && (
                      <tr><td colSpan={3} className="py-2 text-muted-foreground">Keine Fehler im Zeitraum</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Formular verlassen ohne Abschluss</p>
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1 pr-3 font-medium">Letzter Schritt</th>
                      <th className="py-1 pr-3 text-right font-medium">Besucher</th>
                      <th className="py-1 text-right font-medium">Zeit im Formular (Median)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bericht.abbruch.map((a) => (
                      <tr key={a.schritt} className="border-b last:border-0">
                        <td className="py-1 pr-3">{a.schritt}</td>
                        <td className="py-1 pr-3 text-right">{a.besucher}</td>
                        <td className="py-1 text-right">{a.sekunden_median == null ? '–' : `${Math.round(a.sekunden_median)} s`}</td>
                      </tr>
                    ))}
                    {bericht.abbruch.length === 0 && (
                      <tr><td colSpan={3} className="py-2 text-muted-foreground">Keine Abbrüche im Zeitraum</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Besucher sind anonyme Browser-Kennungen, keine Personen: Prüf-Crawler (z. B. von Meta) und Browser ohne
              dauerhaften Speicher zählen mit, teils doppelt. Testkonten sind ausgenommen. „Formular“ zählt auch, wer
              sich nur anmelden wollte; „Rolle“ und die Schritte danach betreffen nur die Registrierung.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
