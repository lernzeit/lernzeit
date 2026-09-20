import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { screenTimeSupportedPlatform } from '@/services/screenTime/plugin';
import { gleicheFreigabenAb } from '@/services/screenTime/release';

/**
 * Löst genehmigte Bildschirmzeit auf dem Gerät des Kindes ein.
 *
 * ── Die Lücke, die dieser Haken schließt ─────────────────────────────────
 *
 * Bis hierher endete die Kette beim Status „approved“: Das Kind stellte eine
 * Anfrage, ein Elternteil genehmigte sie — und auf dem Telefon geschah
 * nichts. Die Sperre konnte zugehen, aber nicht wieder auf. Wer alles gebaut
 * hat außer dem Weg zurück, hat ein Schloss ohne Schlüssel gebaut.
 *
 * ── Warum das Gerät holt, statt dass der Server schiebt ──────────────────
 *
 * ManagedSettings kennt keinen Fernzugriff. Die Sperre lebt in einer App
 * Group auf dem Telefon des Kindes; aufheben kann sie nur Code, der dort
 * läuft. Der Server kann deshalb nur eine Zeile hinlegen, und LernZeit holt
 * sie ab, sobald es läuft.
 *
 * ── Wann geholt wird ─────────────────────────────────────────────────────
 *
 *   beim Start          das Kind öffnet die App, nachdem genehmigt wurde
 *   bei Realtime        die Genehmigung kommt, während die App offen ist
 *   beim Zurückkehren   die App lag im Hintergrund, als genehmigt wurde
 *
 * Der letzte Fall ist der häufigste: Das Kind fragt, legt das Telefon weg,
 * und die Eltern entscheiden später.
 *
 * Was beim Abgleich passiert, steht in `services/screenTime/release.ts` —
 * dort ohne React und damit prüfbar.
 */
export function useScreenTimeRelease(childId: string | undefined, enabled: boolean) {
  // Verhindert, dass Start, Realtime und Rückkehr aus dem Hintergrund
  // gleichzeitig dieselbe Genehmigung einlösen. Der eindeutige Index in der
  // Datenbank fängt das ebenfalls ab — aber ein Aufruf, der gar nicht erst
  // losläuft, ist der ruhigere Weg.
  const laeuft = useRef(false);

  const abgleichen = useCallback(async () => {
    if (!childId || !enabled || !screenTimeSupportedPlatform()) return;
    if (laeuft.current) return;
    laeuft.current = true;
    try {
      await gleicheFreigabenAb(childId);
    } catch {
      /* Kein Netz, kein Plugin, kein Gerät — beim nächsten Anlauf erneut.
         Ein Fehler hier darf dem Kind nichts anzeigen: Es hat nichts falsch
         gemacht und kann nichts tun. */
    } finally {
      laeuft.current = false;
    }
  }, [childId, enabled]);

  useEffect(() => {
    if (!childId || !enabled || !screenTimeSupportedPlatform()) return;

    void abgleichen();

    const kanal = supabase
      .channel(`screen-time-release-${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'screen_time_requests',
          filter: `child_id=eq.${childId}`,
        },
        () => { void abgleichen(); },
      )
      .subscribe();

    let abmelden: (() => void) | undefined;
    void import('@capacitor/app')
      .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void abgleichen();
      }))
      .then((handle) => { abmelden = () => { void handle.remove(); }; })
      .catch(() => { /* Kein Capacitor — dann gibt es auch keinen Wechsel. */ });

    return () => {
      supabase.removeChannel(kanal);
      abmelden?.();
    };
  }, [childId, enabled, abgleichen]);
}
