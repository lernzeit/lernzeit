import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useReise } from '@/hooks/useReise';
import { FELDER_JE_SEITE } from '@/lib/reise';
import { cn } from '@/lib/utils';

const STUFEN = [0, 5, 10, 15];

/**
 * Kleckis Reise fuer Eltern (Stufe 3, 11.10.2026): Stand der Reise und
 * Extra-Minuten fuer jede fertige Seite. Die Eltern entscheiden; 0 = aus.
 * Vergeben wird beim Seitenende auf dem Server (runde_belohnen), die Minuten
 * zaehlen am selben Tag zur verdienten Zeit.
 */
export function ReiseEinstellung({ childId, parentId, childName }: { childId: string; parentId: string; childName: string }) {
  const { aktuell, seiten, geladen } = useReise(childId);
  const [bonus, setBonus] = useState<number | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void supabase.from('child_settings').select('reise_bonus_minuten').eq('child_id', childId).maybeSingle()
      .then(({ data }) => { if (aktiv) setBonus(data?.reise_bonus_minuten ?? 0); });
    return () => { aktiv = false; };
  }, [childId]);

  const speichern = async (wert: number) => {
    const vorher = bonus;
    setBonus(wert);
    setFehler(false);
    const { data: vorhanden } = await supabase.from('child_settings').select('id').eq('child_id', childId).maybeSingle();
    const { error } = vorhanden
      ? await supabase.from('child_settings').update({ reise_bonus_minuten: wert }).eq('child_id', childId)
      : await supabase.from('child_settings').insert({ parent_id: parentId, child_id: childId, reise_bonus_minuten: wert });
    if (error) { setBonus(vorher); setFehler(true); }
  };

  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {geladen
          ? `${childName} ist auf Seite ${aktuell.seite} (${aktuell.felder.length} von ${FELDER_JE_SEITE} Feldern), ${seiten.length} ${seiten.length === 1 ? 'Seite' : 'Seiten'} fertig.`
          : 'Wird geladen …'}{' '}
        Jede geschaffte Runde malt ein Feld, Lernplan und Schwerpunkt zwei.
      </p>
      <div>
        <p className="text-sm font-bold text-tinte">Extra-Minuten je fertiger Seite</p>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Extra-Minuten je fertiger Seite">
          {STUFEN.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={bonus === w}
              disabled={bonus === null}
              onClick={() => void speichern(w)}
              className={cn(
                'h-9 flex-1 rounded-full text-sm font-bold ring-1 ring-inset transition-colors',
                bonus === w ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card text-tinte ring-karo hover:bg-muted',
              )}
            >
              {w === 0 ? 'Aus' : `${w} Min.`}
            </button>
          ))}
        </div>
        {fehler && <p className="mt-2 text-xs font-semibold text-destructive">Konnte nicht gespeichert werden.</p>}
      </div>
    </div>
  );
}
