import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { alsWahl, klecksiAn, type KlecksiWahl } from '@/lib/klecksiModus';

/*
 * Ist Klecksi an? Ein Stand fuer die ganze App: Kind-Start, Spiel und
 * Einstellungen laden die Wahl des Kindes (useKlecksiWahl), alle anderen
 * Stellen lesen nur (useKlecksiAn). Ohne angemeldetes Kind (Startseite,
 * Demo) ist Klecksi an.
 */
interface Stand { kindId: string | null; wahl: KlecksiWahl; klasse: number | null }

let stand: Stand = { kindId: null, wahl: null, klasse: null };
const hoerer = new Set<() => void>();
const setzeStand = (neu: Partial<Stand>) => {
  stand = { ...stand, ...neu };
  hoerer.forEach((h) => h());
};
const abo = (h: () => void) => {
  hoerer.add(h);
  return () => { hoerer.delete(h); };
};
const lesen = () => stand;
const cacheSchluessel = (id: string) => `lernzeit_klecksi_${id}`;

/** Nur lesen: Ist Klecksi gerade an? */
export function useKlecksiAn(): boolean {
  const s = useSyncExternalStore(abo, lesen, lesen);
  return klecksiAn(s.wahl, s.klasse);
}

/** Wahl des Kindes laden und aendern (null = automatisch nach Klasse). */
export function useKlecksiWahl(kindId?: string, klasse?: number | null) {
  useEffect(() => {
    if (!kindId) return;
    let gemerkt: KlecksiWahl = null;
    try { gemerkt = alsWahl(localStorage.getItem(cacheSchluessel(kindId))); } catch { /* ohne Speicher */ }
    setzeStand({ kindId, klasse: klasse ?? null, wahl: stand.kindId === kindId ? stand.wahl : gemerkt });
    let aktiv = true;
    supabase.from('profiles').select('klecksi').eq('id', kindId).maybeSingle().then(({ data, error }) => {
      if (!aktiv || error || !data) return;
      const wahl = alsWahl((data as { klecksi?: unknown }).klecksi);
      try {
        if (wahl) localStorage.setItem(cacheSchluessel(kindId), wahl);
        else localStorage.removeItem(cacheSchluessel(kindId));
      } catch { /* ohne Speicher */ }
      if (stand.kindId === kindId) setzeStand({ wahl });
    });
    return () => { aktiv = false; };
  }, [kindId, klasse]);

  const s = useSyncExternalStore(abo, lesen, lesen);
  const setzen = useCallback(async (wahl: KlecksiWahl): Promise<boolean> => {
    if (!kindId) return false;
    const { error } = await supabase.from('profiles').update({ klecksi: wahl }).eq('id', kindId);
    if (error) return false;
    try {
      if (wahl) localStorage.setItem(cacheSchluessel(kindId), wahl);
      else localStorage.removeItem(cacheSchluessel(kindId));
    } catch { /* ohne Speicher */ }
    setzeStand({ kindId, wahl });
    return true;
  }, [kindId]);

  const eigene = s.kindId === kindId;
  return {
    an: klecksiAn(eigene ? s.wahl : null, klasse ?? (eigene ? s.klasse : null)),
    wahl: eigene ? s.wahl : null,
    setzen,
  };
}
