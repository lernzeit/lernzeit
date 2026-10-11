import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { avatarPreis } from '@/lib/federmaeppchen';

/** Figuren, die das Kind mit Tinte freigeschaltet hat (freie zaehlen immer). */
export function useFreigeschaltet(kindId?: string) {
  const [figuren, setFiguren] = useState<Set<string>>(new Set());
  const [geladen, setGeladen] = useState(false);

  const laden = useCallback(async () => {
    if (!kindId) return;
    const { data } = await supabase.from('kind_freigeschaltet').select('ding').eq('child_id', kindId).eq('art', 'avatar');
    setFiguren(new Set((data ?? []).map((z) => z.ding)));
    setGeladen(true);
  }, [kindId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  /** Preis, wenn die Figur noch gesperrt ist, sonst null */
  const gesperrt = useCallback(
    (id: string): number | null => {
      const preis = avatarPreis(id);
      return preis > 0 && !figuren.has(id) ? preis : null;
    },
    [figuren],
  );

  return { figuren, gesperrt, geladen, laden };
}
