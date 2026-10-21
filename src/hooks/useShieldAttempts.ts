import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimePendingRequests, screenTimeSupportedPlatform } from '@/services/screenTime/plugin';
import { SUPABASE_ANON_KEY, SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';

/**
 * Holt die Drücke auf „Eltern fragen“ vom Sperrbildschirm ab und macht sie
 * sichtbar.
 *
 * Warum es diesen Umweg gibt: Apples ShieldAction-Erweiterung darf keine App
 * öffnen und hat keinen angemeldeten Zugang zur Datenbank. Sie kann den Druck
 * nur in der App Group vermerken. Erst LernZeit selbst kann ihn weitergeben —
 * beim nächsten Start auf dem Gerät des Kindes.
 *
 * Die Eltern bekommen pro Bitte eine Mitteilung (Trigger
 * `shield_attempts_eltern_fragen`); die Kachel „Gesperrte Apps wurden
 * angetippt“ auf „Heute“ ist seit 21.10.2026 weg (kein Mehrwert).
 */

/**
 * Kindgerät: gemerkte Drücke abholen und speichern.
 *
 * Läuft einmal beim Start. Das Abholen LEERT die Liste im Gerät — schlägt das
 * Schreiben danach fehl, sind die Zeitpunkte verloren. Deshalb wird der
 * Fehler zwar geschluckt (ein Anzeigefehler darf die App nicht blockieren),
 * aber der eindeutige Index in der Datenbank sorgt dafür, dass ein erneuter
 * Versuch mit denselben Zeitpunkten keine Dubletten erzeugt.
 */
export function useSyncShieldAttempts(childId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!childId || !enabled) return;
    let abgebrochen = false;

    const abholen = async () => {
      try {
        const { requestedAt } = await screenTimePendingRequests();
        if (abgebrochen || requestedAt.length === 0) return;

        await supabase.from('shield_attempts').upsert(
          requestedAt.map((zeitpunkt) => ({ child_id: childId, attempted_at: zeitpunkt })),
          { onConflict: 'child_id,attempted_at', ignoreDuplicates: true },
        );
      } catch {
        /* Kein Sperrbildschirm auf dieser Plattform, oder das Schreiben ging
           schief. Beides ist kein Grund, dem Kind einen Fehler zu zeigen. */
      }
    };

    // Zugang für „Eltern fragen“ direkt vom Sperrbildschirm (Funktion
    // eltern-fragen). Ältere Builds kennen die Methode nicht: dann nichts.
    const zugangAblegen = async () => {
      if (!screenTimeSupportedPlatform()) return;
      try {
        const { data: schluessel, error } = await supabase.rpc('sperre_anfrage_schluessel_holen');
        if (abgebrochen || error || typeof schluessel !== 'string') return;
        await ScreenTime.setAnfrageZugang({
          url: `${SUPABASE_PROJECT_URL}/functions/v1/eltern-fragen`,
          apikey: SUPABASE_ANON_KEY,
          schluessel,
        });
      } catch {
        /* älterer Build oder kein Netz: beim nächsten Start erneut */
      }
    };

    void abholen();
    void zugangAblegen();
    return () => { abgebrochen = true; };
  }, [childId, enabled]);
}
