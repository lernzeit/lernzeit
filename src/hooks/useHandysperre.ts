import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimeSupportedPlatform } from '@/services/screenTime/plugin';

/**
 * LernZeit-Handysperre nur für freigeschaltete Kinder (10.10.2026).
 *
 * Die eigene Sperre ist noch nicht fertig (Zeit läuft nach Uhr statt nach
 * Nutzung, kein Ruhezeit-Fenster, keine App-Limits). Bis dahin sehen nur Kinder
 * aus `handysperre_freigaben` (und deren Eltern) Einrichtung, Freiminuten und
 * Hinweise; alle anderen den Weg über Apples Bildschirmzeit. Ein
 * Datenbank-Schalter, weil das Testgerät die Store-App nutzt (kein TestFlight).
 */

let zwischenspeicher: { zeit: number; ids: Set<string> } | null = null;
let laufend: Promise<Set<string> | null> | null = null;

/** Freigeschaltete Kinder, die der Angemeldete sehen darf. null = unbekannt (Fehler). */
async function freigabenLaden(): Promise<Set<string> | null> {
  if (zwischenspeicher && Date.now() - zwischenspeicher.zeit < 5 * 60_000) return zwischenspeicher.ids;
  if (!laufend) {
    laufend = (async () => {
      const { data, error } = await supabase.from('handysperre_freigaben').select('child_id');
      if (error) return null;
      const ids = new Set((data ?? []).map((zeile) => zeile.child_id as string));
      zwischenspeicher = { zeit: Date.now(), ids };
      return ids;
    })().finally(() => { laufend = null; });
  }
  return laufend;
}

/**
 * Menge der freigeschalteten Kinder. `null`, solange geladen wird oder wenn
 * das Laden scheiterte — Aufrufer zeigen dann nichts von der Sperre an und
 * schalten auch nichts ab.
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
 * Kind-Gerät: Ist das Kind NICHT freigeschaltet, aber LernZeit sperrt hier
 * noch (eingerichtet vor dem 10.10.2026), wird die Sperre einmal aufgehoben.
 * Sonst bliebe das Telefon zu, ohne dass jemand die Einstellungen sieht.
 * Nur, wenn die Freigaben sicher geladen sind — bei einem Netzfehler bleibt
 * alles, wie es ist.
 */
export function useHandysperreAbschalten(childId: string | undefined, istKind: boolean, freigaben: Set<string> | null) {
  const erledigt = useRef(false);
  useEffect(() => {
    if (!childId || !istKind || freigaben === null || erledigt.current) return;
    if (freigaben.has(childId) || !screenTimeSupportedPlatform()) return;
    erledigt.current = true;
    void (async () => {
      try {
        const status = await ScreenTime.getStatus();
        if (!status.managing) return;
        await ScreenTime.stopManaging();
        await supabase.rpc('set_screen_time_managed', { ist_verwaltet: false });
      } catch {
        erledigt.current = false; // beim nächsten Start erneut
      }
    })();
  }, [childId, istKind, freigaben]);
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
