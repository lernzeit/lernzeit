import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adventJahr, adventOffenBis, istWeihnachtszeit } from '@/lib/weihnachten';

export interface AdventTuer {
  tag: number;
  sticker: string;
  avatar: string | null;
}

/** Geoeffnete Tuerchen dieses Advents (nur in der Weihnachtszeit geladen) */
export function useAdvent(kindId?: string) {
  const zeit = istWeihnachtszeit();
  const [offen, setOffen] = useState<Map<number, AdventTuer>>(new Map());
  const [geladen, setGeladen] = useState(false);

  const laden = useCallback(async () => {
    if (!kindId || !zeit) return;
    const { data } = await supabase
      .from('advent_tueren')
      .select('tag, sticker, avatar')
      .eq('child_id', kindId)
      .eq('jahr', adventJahr());
    setOffen(new Map((data ?? []).map((t) => [t.tag, t])));
    setGeladen(true);
  }, [kindId, zeit]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const offenBis = zeit ? adventOffenBis() : 0;
  let tuerenZu = 0;
  for (let t = 1; t <= offenBis; t++) if (!offen.has(t)) tuerenZu++;

  return { zeit, offen, offenBis, tuerenZu, geladen, laden };
}
