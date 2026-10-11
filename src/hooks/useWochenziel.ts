import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Lerntage dieser Woche (Montag bis Sonntag, Uhrzeit des Geraets) aus den Runden. */
export function useWochenziel(kindId?: string) {
  const [tage, setTage] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!kindId) return;
    let aktiv = true;
    const montag = new Date();
    montag.setHours(0, 0, 0, 0);
    montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7));
    supabase
      .from('game_sessions')
      .select('session_date')
      .eq('user_id', kindId)
      .gte('session_date', montag.toISOString())
      .then(({ data }) => {
        if (!aktiv) return;
        const t = new Set((data ?? []).map((z) => new Date(z.session_date as string).toLocaleDateString('sv-SE')));
        setTage(t.size);
      });
    return () => { aktiv = false; };
  }, [kindId]);
  return tage;
}
