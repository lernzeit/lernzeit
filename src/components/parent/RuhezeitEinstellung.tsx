import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';

/** "21:00" ↔ 1260 (Minuten nach Mitternacht) */
const alsMinuten = (zeit: string) => {
  const [h, m] = zeit.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const alsZeit = (minuten: number) =>
  `${String(Math.floor(minuten / 60)).padStart(2, '0')}:${String(minuten % 60).padStart(2, '0')}`;

const VORGABE_VON = 20 * 60;
const VORGABE_BIS = 7 * 60;

/**
 * Ruhezeit der LernZeit-Handysperre (10.10.2026): täglich alles zu außer
 * „Immer erlaubt“, auch mit freier Zeit. Nur für freigeschaltete Kinder
 * (Aufrufer prüft). Speichert sofort in `child_settings`; das Kinder-Handy
 * übernimmt es beim nächsten Öffnen von LernZeit (useRuhezeitAbgleich).
 */
export function RuhezeitEinstellung({ childId }: { childId: string }) {
  const [von, setVon] = useState<number | null>(null);
  const [bis, setBis] = useState<number | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void supabase
      .from('child_settings')
      .select('ruhezeit_von, ruhezeit_bis')
      .eq('child_id', childId)
      .maybeSingle()
      .then(({ data }) => {
        if (!aktiv) return;
        setVon(data?.ruhezeit_von ?? null);
        setBis(data?.ruhezeit_bis ?? null);
        setGeladen(true);
      });
    return () => { aktiv = false; };
  }, [childId]);

  const speichern = async (neuVon: number | null, neuBis: number | null) => {
    setVon(neuVon); setBis(neuBis);
    setSpeichert(true); setFehler(false);
    const { error } = await supabase
      .from('child_settings')
      .update({ ruhezeit_von: neuVon, ruhezeit_bis: neuBis })
      .eq('child_id', childId);
    setSpeichert(false);
    setFehler(Boolean(error));
  };

  if (!geladen) return null;
  const an = von !== null && bis !== null;

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-tinte">Ruhezeit</p>
          <p className="text-xs text-muted-foreground">Handy zu, nur „Immer erlaubt“ bleibt offen</p>
        </div>
        <Switch
          checked={an}
          aria-label="Ruhezeit"
          onCheckedChange={(ein) => void (ein ? speichern(VORGABE_VON, VORGABE_BIS) : speichern(null, null))}
        />
      </div>
      {an && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="time"
            aria-label="Ruhezeit von"
            className="rounded-lg border border-karo bg-background px-2 py-1 tabular"
            value={alsZeit(von)}
            onChange={(e) => e.target.value && void speichern(alsMinuten(e.target.value), bis)}
          />
          <span>bis</span>
          <input
            type="time"
            aria-label="Ruhezeit bis"
            className="rounded-lg border border-karo bg-background px-2 py-1 tabular"
            value={alsZeit(bis)}
            onChange={(e) => e.target.value && void speichern(von, alsMinuten(e.target.value))}
          />
          <span>Uhr</span>
        </div>
      )}
      {(speichert || fehler) && (
        <p className={`text-xs ${fehler ? 'text-destructive' : 'text-muted-foreground'}`}>
          {fehler ? 'Nicht gespeichert. Bitte noch mal.' : 'Wird gespeichert …'}
        </p>
      )}
    </div>
  );
}
