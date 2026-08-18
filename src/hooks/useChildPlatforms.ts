import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChildPlatform } from '@/services/parentalControlsService';

export type ChildPlatformMap = Record<string, ChildPlatform | null>;

/**
 * Ermittelt die Plattform jedes verknüpften Kindes.
 * Reihenfolge (serverseitig in get_children_platforms):
 *  a) profiles.last_platform (wenn gesetzt und nicht 'web')
 *  b) neuester push_tokens.platform-Eintrag des Kindes
 *  c) sonst unbekannt (null)
 */
export function useChildPlatforms(enabled = true) {
  const [platforms, setPlatforms] = useState<ChildPlatformMap>({});
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_children_platforms');
      if (error) throw error;
      const map: ChildPlatformMap = {};
      (data ?? []).forEach((row: { child_id: string; platform: string | null }) => {
        map[row.child_id] =
          row.platform === 'android' || row.platform === 'ios' ? row.platform : null;
      });
      setPlatforms(map);
    } catch (e) {
      console.warn('[useChildPlatforms] Laden fehlgeschlagen:', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const setChildPlatform = useCallback(async (childId: string, platform: ChildPlatform) => {
    setPlatforms((prev) => ({ ...prev, [childId]: platform }));
    const { error } = await supabase.rpc('set_child_platform', {
      p_child_id: childId,
      p_platform: platform,
    });
    if (error) {
      console.warn('[useChildPlatforms] Speichern fehlgeschlagen:', error);
    }
  }, []);

  return { platforms, loading, reload: load, setChildPlatform };
}