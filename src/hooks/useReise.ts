import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { aktuelleSeite, type ReiseFeld, type ReiseSeite } from '@/lib/reise';

/** Felder und fertige Seiten der Heftrand-Reise eines Kindes (Kind selbst oder verknuepfte Eltern). */
export function useReise(kindId?: string) {
  const [felder, setFelder] = useState<ReiseFeld[]>([]);
  const [seiten, setSeiten] = useState<ReiseSeite[]>([]);
  const [geladen, setGeladen] = useState(false);

  const laden = useCallback(async () => {
    if (!kindId) return;
    const [f, s] = await Promise.all([
      supabase.from('kind_reise_felder').select('seite, feld, fach, quelle').eq('child_id', kindId)
        .order('seite', { ascending: true }).order('feld', { ascending: true }),
      supabase.from('kind_reise_seiten').select('seite, faltung, bunt, bonus_minuten, fertig_am').eq('child_id', kindId)
        .order('seite', { ascending: true }),
    ]);
    if (!f.error) setFelder((f.data ?? []) as ReiseFeld[]);
    if (!s.error) setSeiten((s.data ?? []) as ReiseSeite[]);
    setGeladen(true);
  }, [kindId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const aktuell = useMemo(() => aktuelleSeite(felder), [felder]);
  return { felder, seiten, aktuell, geladen, laden };
}
