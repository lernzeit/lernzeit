import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useHandysperreFreigaben } from '@/hooks/useHandysperre';

interface Anfrage {
  id: string;
  child_id: string;
  zweck: string;
  created_at: string;
}

const WAS: Record<string, string> = {
  ausnahmen: 'möchte Apps wählen, die immer offen bleiben.',
  aufheben: 'möchte die Handysperre aufheben.',
  zaehlen: 'möchte die Handysperre einrichten.',
};

/**
 * Eltern-Seite der Hürde auf dem Kinder-Handy (ParentGate.tsx): offene
 * Anfragen der letzten 15 Minuten mit „Erlauben“ / „Nein“.
 *
 * Nur für Eltern freigeschalteter Kinder (useHandysperre.ts); nur dann wird
 * auch alle 5 s nachgesehen, solange die Seite sichtbar ist.
 */
export function GeraetFreigabenKarte() {
  const freigaben = useHandysperreFreigaben();
  const [anfragen, setAnfragen] = useState<Anfrage[]>([]);
  const [namen, setNamen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const aktiv = !!freigaben && freigaben.size > 0;

  const laden = useCallback(async () => {
    const { data } = await supabase
      .from('geraet_freigaben')
      .select('id, child_id, zweck, created_at')
      .eq('status', 'offen')
      .gt('created_at', new Date(Date.now() - 15 * 60_000).toISOString())
      .order('created_at', { ascending: false });
    const liste = (data ?? []) as Anfrage[];
    setAnfragen(liste);
    const ids = [...new Set(liste.map((a) => a.child_id))];
    if (ids.length === 0) return;
    const { data: profile } = await supabase.from('profiles').select('id, name').in('id', ids);
    setNamen(Object.fromEntries((profile ?? []).map((p) => [p.id, p.name?.trim() || 'Dein Kind'])));
  }, []);

  useEffect(() => {
    if (!aktiv) return;
    void laden();
    const takt = window.setInterval(() => { if (document.visibilityState === 'visible') void laden(); }, 5000);
    const sichtbar = () => { if (document.visibilityState === 'visible') void laden(); };
    document.addEventListener('visibilitychange', sichtbar);
    return () => { window.clearInterval(takt); document.removeEventListener('visibilitychange', sichtbar); };
  }, [aktiv, laden]);

  const antworten = async (id: string, erlauben: boolean) => {
    setBusy(id);
    await supabase.rpc('geraet_freigabe_beantworten', { p_id: id, p_erlauben: erlauben });
    setBusy(null);
    void laden();
  };

  if (!aktiv || anfragen.length === 0) return null;

  return (
    <ul className="space-y-3">
      {anfragen.map((a) => (
        <li key={a.id} className="space-y-3 rounded-[24px] bg-card p-4 ring-2 ring-inset ring-primary/40">
          <p className="flex items-start gap-2 text-base font-extrabold leading-tight text-tinte">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{namen[a.child_id] ?? 'Dein Kind'}s Handy {WAS[a.zweck] ?? 'möchte die Handysperre ändern.'}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy !== null} onClick={() => void antworten(a.id, false)}>Nein</Button>
            <Button disabled={busy !== null} onClick={() => void antworten(a.id, true)}>
              {busy === a.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erlauben
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
