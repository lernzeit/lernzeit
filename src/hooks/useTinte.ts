import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Stand der Tintentropfen des angemeldeten Kindes (Summe der Buchungen). */
export function useTinte(kindId?: string) {
  const [stand, setStand] = useState<number | null>(null);

  const laden = useCallback(async () => {
    if (!kindId) return;
    const { data, error } = await supabase.rpc('tinte_stand');
    if (!error && typeof data === 'number') setStand(data);
  }, [kindId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  return { stand, setStand, laden };
}
