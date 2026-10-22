import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimeSupportedPlatform } from '@/services/screenTime/plugin';
import { HANDYSPERRE_FUER_ALLE_AB } from '@/lib/appStand';

/**
 * LernZeit-Handysperre für alle ab der App-Fassung HANDYSPERRE_FUER_ALLE_AB
 * (22.10.2026; vorher nur Kinder aus `handysperre_freigaben`, seit 10.10.2026).
 *
 * Gesteuert über die App-Version: Diese Fassung bietet die Sperre jedem Kind
 * an (Kind-Seite immer an). Ältere Fassungen prüfen weiter die Tabelle und
 * heben die Sperre bei nicht freigeschalteten Kindern auf — deshalb zeigt die
 * Eltern-Seite die Sperre nur für Kinder, deren App sie kann: in der Tabelle
 * ODER `profiles.app_stand` (meldet die Kinder-App, lib/appStand.ts) ab
 * HANDYSPERRE_FUER_ALLE_AB.
 */

let zwischenspeicher: { zeit: number; ids: Set<string> } | null = null;
let laufend: Promise<Set<string> | null> | null = null;

/** Kinder mit Handysperre, die der Angemeldete sehen darf. null = unbekannt (Fehler). */
async function freigabenLaden(): Promise<Set<string> | null> {
  if (zwischenspeicher && Date.now() - zwischenspeicher.zeit < 5 * 60_000) return zwischenspeicher.ids;
  if (!laufend) {
    laufend = (async () => {
      const [freigaben, kinder] = await Promise.all([
        supabase.from('handysperre_freigaben').select('child_id'),
        supabase.from('parent_child_relationships').select('child_id'),
      ]);
      if (freigaben.error) return null;
      const ids = new Set((freigaben.data ?? []).map((zeile) => zeile.child_id as string));
      const kinderIds = [...new Set((kinder.data ?? []).map((zeile) => zeile.child_id as string))];
      if (kinderIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, app_stand').in('id', kinderIds);
        for (const p of (data ?? []) as unknown as { id: string; app_stand: number | null }[]) {
          if ((p.app_stand ?? 0) >= HANDYSPERRE_FUER_ALLE_AB) ids.add(p.id);
        }
      }
      zwischenspeicher = { zeit: Date.now(), ids };
      return ids;
    })().finally(() => { laufend = null; });
  }
  return laufend;
}

/**
 * Eltern-Seite: Menge der Kinder, deren App die Sperre kann. `null`, solange
 * geladen wird oder wenn das Laden scheiterte — Aufrufer zeigen dann nichts
 * von der Sperre an.
 */
export function useHandysperreFreigaben(): Set<string> | null {
  const [ids, setIds] = useState<Set<string> | null>(zwischenspeicher?.ids ?? null);
  useEffect(() => {
    let aktiv = true;
    void freigabenLaden().then((ergebnis) => { if (aktiv) setIds(ergebnis); });
    return () => { aktiv = false; };
  }, []);
  return ids;
}

/**
 * Kind-Gerät: Ruhezeit aus `child_settings` an Apple weitergeben
 * (ScreenTime.setRuhezeit). Beim Start und bei jeder Rückkehr in die App —
 * aus der Ferne geht es nicht (kein Fernzugriff auf ManagedSettings).
 * Ältere Builds kennen die Ruhezeit nicht (`ruheVon` fehlt im Status): dann
 * nichts tun.
 */
export function useRuhezeitAbgleich(childId: string | undefined, aktiv: boolean) {
  useEffect(() => {
    if (!childId || !aktiv || !screenTimeSupportedPlatform()) return;
    let laeuft = false;
    const abgleichen = async () => {
      if (laeuft) return;
      laeuft = true;
      try {
        const status = await ScreenTime.getStatus();
        if (!status.managing || !('ruheVon' in status)) return;
        const { data, error } = await supabase
          .from('child_settings')
          .select('ruhezeit_von, ruhezeit_bis')
          .eq('child_id', childId)
          .maybeSingle();
        if (error) return;
        const von = data?.ruhezeit_von ?? null;
        const bis = data?.ruhezeit_bis ?? null;
        if ((status.ruheVon ?? null) === von && (status.ruheBis ?? null) === bis) return;
        await ScreenTime.setRuhezeit(von !== null && bis !== null ? { von, bis } : {});
      } catch {
        /* beim nächsten Öffnen erneut */
      } finally {
        laeuft = false;
      }
    };
    void abgleichen();
    const sichtbar = () => { if (document.visibilityState === 'visible') void abgleichen(); };
    document.addEventListener('visibilitychange', sichtbar);
    return () => document.removeEventListener('visibilitychange', sichtbar);
  }, [childId, aktiv]);
}

/**
 * Eltern-Seite: Läuft die LernZeit-Sperre auf dem Handy des Kindes? (meldet
 * das Kinder-Handy, `child_settings.screen_time_managed`). Dann gibt LernZeit
 * genehmigte Zeit selbst frei (parentalControlsService, 22.10.2026).
 */
export function useHandysperreLaeuft(childIds: string[]): Record<string, boolean> {
  const schluessel = [...new Set(childIds.filter(Boolean))].sort().join(',');
  const [stand, setStand] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!schluessel) return;
    let aktiv = true;
    void supabase.from('child_settings').select('child_id, screen_time_managed').in('child_id', schluessel.split(','))
      .then(({ data }) => {
        if (aktiv && data) setStand(Object.fromEntries(data.map((z) => [z.child_id, !!z.screen_time_managed])));
      });
    return () => { aktiv = false; };
  }, [schluessel]);
  return stand;
}
