import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OHNE_LIMIT_MINUTEN, standText, tagSchluessel, tagesbeginn } from '@/lib/handyzeit';

const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const wann = (iso: string) => {
  const d = new Date(iso);
  const heute = tagSchluessel(d) === tagSchluessel();
  return heute ? `heute ${uhr(iso)}` : d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ` ${uhr(iso)}`;
};

const ZWECK: Record<string, string> = {
  pause: 'Handy geöffnet',
  ausnahmen: '„Immer erlaubt“ geändert',
  aufheben: 'Sperre aufgehoben',
  zaehlen: 'Einstellung geändert',
};

interface Stand { tag: string; genutzt: number; budget: number | null; aufgebraucht: boolean; aktualisiert: string }
interface Notfall { id: string; zweck: string; minuten: number | null; genutzt_am: string }

/**
 * Handysperre vom Eltern-Handy aus (17.10.2026): Stand der Nutzung heute,
 * Extra-Zeit, „Heute ohne Limit“ und der Notfallcode zum Vorlesen.
 * Wirksam wird alles, sobald LernZeit auf dem Kinder-Handy läuft — Apple
 * kennt keinen Fernzugriff; das Kind bekommt dafür eine Mitteilung.
 */
export function HandysperreHeute({ childId, childName }: { childId: string; childName: string }) {
  const [stand, setStand] = useState<Stand | null>(null);
  const [extraHeute, setExtraHeute] = useState(0);
  const [notfaelle, setNotfaelle] = useState<Notfall[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [hinweis, setHinweis] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [code, setCode] = useState<{ code: string; gueltig_bis: string } | null>(null);
  const [codeLaedt, setCodeLaedt] = useState(false);

  const laden = useCallback(async () => {
    const ab = tagesbeginn().toISOString();
    const woche = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [s, e, n] = await Promise.all([
      supabase.from('handyzeit_stand').select('tag, genutzt, budget, aufgebraucht, aktualisiert').eq('child_id', childId).maybeSingle(),
      supabase.from('handyzeit_extra').select('minuten').eq('child_id', childId).gte('created_at', ab),
      supabase.from('notfall_entsperrungen').select('id, zweck, minuten, genutzt_am').eq('child_id', childId)
        .gte('genutzt_am', woche).order('genutzt_am', { ascending: false }).limit(3),
    ]);
    setStand((s.data as Stand | null) ?? null);
    setExtraHeute((e.data ?? []).reduce((summe, z) => summe + (z.minuten ?? 0), 0));
    setNotfaelle((n.data as Notfall[] | null) ?? []);
  }, [childId]);

  useEffect(() => { void laden(); }, [laden]);

  const extra = async (minuten: number) => {
    setBusy(minuten); setHinweis(null);
    const { error } = await supabase.rpc('extrazeit_geben', { p_child: childId, p_minuten: minuten });
    setBusy(null);
    if (error) { setHinweis({ text: 'Ging nicht. Bitte noch mal.', fehler: true }); return; }
    setHinweis({ text: `Gilt, sobald LernZeit auf ${childName}s Handy läuft. ${childName} bekommt eine Mitteilung.` });
    void laden();
  };

  const codeZeigen = async () => {
    setCodeLaedt(true);
    const { data, error } = await supabase.rpc('notfallcode_anzeigen', { p_child: childId });
    setCodeLaedt(false);
    const zeile = Array.isArray(data) ? data[0] : null;
    if (error || !zeile) { setHinweis({ text: 'Code nicht abrufbar. Besteht eine Internetverbindung?', fehler: true }); return; }
    setCode(zeile);
  };

  const heute = stand && stand.tag === tagSchluessel() ? stand : null;
  const ohneLimit = extraHeute >= OHNE_LIMIT_MINUTEN;

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <p className="text-sm font-bold text-tinte">Heute</p>
        <p className="text-xs text-muted-foreground">
          {heute
            ? `${standText({ budget: heute.budget, genutzt: heute.genutzt, aufgebraucht: heute.aufgebraucht }) || 'zählt noch nicht'} · Stand ${uhr(heute.aktualisiert)} Uhr`
            : `Noch kein Stand von ${childName}s Handy.`}
        </p>
        {extraHeute > 0 && !ohneLimit && (
          <p className="text-xs text-muted-foreground">Heute schon extra: {extraHeute} Min.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[15, 30].map((m) => (
          <Button key={m} size="sm" variant="outline" disabled={busy !== null || ohneLimit} onClick={() => void extra(m)}>
            {busy === m && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            +{m} Min.
          </Button>
        ))}
        <Button size="sm" variant={ohneLimit ? 'default' : 'outline'} disabled={busy !== null || ohneLimit} onClick={() => void extra(OHNE_LIMIT_MINUTEN)}>
          {busy === OHNE_LIMIT_MINUTEN && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Heute ohne Limit
        </Button>
      </div>
      {ohneLimit && <p className="text-xs text-muted-foreground">Die Ruhezeit gilt weiter. Ab morgen wieder wie eingestellt.</p>}
      {hinweis && <p className={`text-xs ${hinweis.fehler ? 'text-destructive' : 'text-muted-foreground'}`}>{hinweis.text}</p>}

      <div className="border-t border-karo pt-3">
        {code ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-tinte flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />Notfallcode</p>
            <p className="text-3xl font-extrabold tracking-[0.25em] tabular text-tinte" aria-live="polite">
              {code.code.slice(0, 3)} {code.code.slice(3)}
            </p>
            <p className="text-xs text-muted-foreground">
              Gilt bis {uhr(code.gueltig_bis)} Uhr. Auf {childName}s Handy unter „Deine Handyzeit heute“ → „Notfall: Eltern-Code“ eingeben – geht auch ohne Internet.
            </p>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="px-0" disabled={codeLaedt} onClick={() => void codeZeigen()}>
            {codeLaedt ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Notfallcode zeigen
          </Button>
        )}
        {notfaelle.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {notfaelle.map((n) => (
              <li key={n.id}>Code genutzt {wann(n.genutzt_am)}: {ZWECK[n.zweck] ?? n.zweck}{n.minuten ? `, ${n.minuten} Min.` : ''}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
