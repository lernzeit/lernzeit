import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ScreenTime } from '@/services/screenTime/plugin';

/**
 * Das Einlösen genehmigter Bildschirmzeit auf dem Gerät des Kindes — ohne
 * React, damit es prüfbar ist.
 *
 * Der Haken `useScreenTimeRelease` sagt nur, WANN das läuft. Was dabei
 * passiert, steht hier: Genau an dieser Stelle entscheidet sich, ob ein Kind
 * seine Minuten einmal, zweimal oder gar nicht bekommt. Diese Rechnung
 * gehört in etwas, das `node scripts/test-screen-time-release.mjs` aufrufen
 * kann.
 */

/** So lange bleibt eine Genehmigung einlösbar — dieselbe Grenze wie im Server. */
export const EINLOESE_FENSTER_MS = 24 * 60 * 60 * 1000;

export interface Genehmigung {
  id: string;
  requested_minutes: number;
}

export interface Freigabe {
  id: string;
  request_id: string | null;
  expires_at: string;
}

export interface OffeneGenehmigung {
  id: string;
  minutes: number;
}

/**
 * Welche Genehmigungen noch nicht eingelöst sind.
 *
 * Der Abgleich läuft über `request_id`, nicht über Zeitstempel: Eine
 * Genehmigung ist genau dann verbraucht, wenn es eine Freigabezeile zu ihr
 * gibt. Alles andere — „ungefähr gleiche Minute“, „ähnliche Minutenzahl“ —
 * wäre ein Raten, bei dem entweder Zeit doppelt erteilt oder verschluckt
 * wird.
 */
export function offeneGenehmigungen(
  genehmigt: Genehmigung[],
  freigaben: Freigabe[],
): OffeneGenehmigung[] {
  const eingeloest = new Set(
    freigaben.map((zeile) => zeile.request_id).filter((id): id is string => Boolean(id)),
  );
  return genehmigt
    .filter((zeile) => !eingeloest.has(zeile.id))
    .map((zeile) => ({ id: zeile.id, minutes: zeile.requested_minutes }));
}

/**
 * Wie viele Minuten nachzuholen sind, wenn das Gerät eine laufende Freigabe
 * verloren hat — 0, wenn nichts nachzuholen ist.
 *
 * Der Fall: In der Datenbank steht eine Freigabe bis 16:30, auf dem Gerät ist
 * aber keine aktiv, weil die App neu installiert wurde oder der
 * DeviceActivityMonitor nach einem Neustart nicht wieder ansprang. Ohne
 * Nachlauf bliebe das Telefon zu, obwohl die Zeit bezahlt ist.
 *
 * Kennt das Gerät noch eine laufende Freigabe, wird NICHTS nachgeholt:
 * `releaseFor` verlängert, statt zu ersetzen — Nachholen würde die Zeit
 * verdoppeln.
 */
export function nachzuholendeMinuten(
  freigaben: Freigabe[],
  releasedUntil: string | null,
  jetzt: number = Date.now(),
): number {
  if (releasedUntil && new Date(releasedUntil).getTime() > jetzt) return 0;

  const spaetestesEnde = freigaben
    .map((zeile) => new Date(zeile.expires_at).getTime())
    .filter((ende) => Number.isFinite(ende) && ende > jetzt)
    .sort((a, b) => b - a)[0];

  if (!spaetestesEnde) return 0;

  // Aufrunden: Eine Restzeit von 30 Sekunden ergäbe sonst 0 Minuten, und der
  // Aufruf würde abgelehnt.
  return Math.ceil((spaetestesEnde - jetzt) / 60_000);
}

/**
 * Der eigentliche Abgleich: genehmigte Zeit holen, Telefon öffnen.
 *
 * ── Die Reihenfolge und warum sie so herum ist ───────────────────────────
 *
 * Erst bucht der Server die Freigabe (dann ist sie verbraucht), danach
 * entsperrt das Gerät. Andersherum — erst entsperren, dann buchen — könnte
 * ein abgebrochener Aufruf dieselben Minuten zweimal gutschreiben, und weil
 * `releaseFor` eine laufende Freigabe VERLÄNGERT, würden aus 15 Minuten
 * schnell 60.
 *
 * Scheitert das Entsperren, wird die Buchung zurückgenommen. Die Minuten
 * bleiben dem Kind damit erhalten: Es hat gelernt, also darf es die Zeit
 * nicht verlieren, nur weil ein Aufruf schiefging.
 */
export async function gleicheFreigabenAb(childId: string): Promise<void> {
  const status = await ScreenTime.getStatus();
  // Wird auf diesem Gerät gar nicht gesperrt, gibt es nichts zu öffnen. Die
  // Genehmigung bleibt stehen, und der Weg über die Eltern von Hand
  // funktioniert wie bisher.
  if (!status.managing) return;

  const seit = new Date(Date.now() - EINLOESE_FENSTER_MS).toISOString();

  const [{ data: genehmigt }, { data: freigaben }] = await Promise.all([
    supabase
      .from('screen_time_requests')
      .select('id, requested_minutes, responded_at')
      .eq('child_id', childId)
      .eq('status', 'approved')
      .gte('responded_at', seit)
      .order('responded_at', { ascending: true }),
    supabase
      .from('screen_time_unlocks')
      .select('id, request_id, expires_at')
      .eq('child_id', childId)
      .gte('created_at', seit),
  ]);

  const offen = offeneGenehmigungen(
    (genehmigt ?? []) as Genehmigung[],
    (freigaben ?? []) as Freigabe[],
  );

  for (const genehmigung of offen) {
    await loeseEin(genehmigung);
  }

  if (offen.length === 0) {
    const minuten = nachzuholendeMinuten((freigaben ?? []) as Freigabe[], status.releasedUntil);
    if (minuten >= 1) {
      try {
        await ScreenTime.releaseFor({ minutes: minuten });
      } catch {
        /* Beim nächsten Anlauf erneut. */
      }
    }
  }
}

/** Eine Genehmigung einlösen: erst beim Server buchen, dann entsperren. */
export async function loeseEin(genehmigung: OffeneGenehmigung): Promise<void> {
  const { data, error } = await supabase.functions.invoke('screen-time-request', {
    body: { action: 'redeem_unlock', requestId: genehmigung.id },
  });

  // Abgelehnt, zu alt oder bereits eingelöst: nichts zu tun. Kein Fehler für
  // das Kind — es sieht den Zustand ohnehin an der Anfrage selbst.
  if (error || !data?.success || data?.alreadyRedeemed || !data?.unlock) return;

  const unlock = data.unlock as { id: string; minutes: number };

  try {
    const ergebnis = await ScreenTime.releaseFor({ minutes: unlock.minutes });
    if (ergebnis.cancelled) throw new Error('Freigabe abgebrochen');

    // Ohne diese Meldung passiert das Wichtigste unsichtbar: Das Telefon geht
    // auf, und das Kind erfährt es erst, wenn es eine App ausprobiert.
    const bis = ergebnis.releasedUntil
      ? new Date(ergebnis.releasedUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : null;
    toast.success(`${unlock.minutes} Minuten sind freigegeben`, {
      description: bis ? `Dein Handy ist bis ${bis} Uhr offen.` : undefined,
    });
  } catch {
    await supabase.functions.invoke('screen-time-request', {
      body: { action: 'revoke_unlock', unlockId: unlock.id },
    });
  }
}
