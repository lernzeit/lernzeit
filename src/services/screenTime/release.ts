import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ScreenTime } from '@/services/screenTime/plugin';

/**
 * Das Einlösen von Bildschirmzeit auf dem Gerät des Kindes — ohne React,
 * damit es prüfbar ist.
 *
 * Der Haken `useScreenTimeRelease` sagt nur, WANN das läuft. Was dabei
 * passiert, steht hier: Genau an dieser Stelle entscheidet sich, ob ein Kind
 * seine Minuten einmal, zweimal oder gar nicht bekommt. Diese Rechnung
 * gehört in etwas, das `node scripts/test-screen-time-release.mjs` aufrufen
 * kann.
 *
 * ── Zwei Quellen, ein Weg ────────────────────────────────────────────────
 *
 *   Grundzeit        steht dem Kind täglich zu, ohne Lernen, ohne Fragen
 *   Genehmigte Zeit  verdient und von einem Elternteil freigegeben
 *
 * Beide landen als Zeile in `screen_time_unlocks` und werden von dort auf dem
 * Gerät eingelöst. Wer die Zeile schreiben darf, entscheidet die Datenbank:
 * Dürfte das Kind selbst schreiben, wäre die ganze Sperre eine Empfehlung.
 *
 * ── Warum Datenbankfunktionen und keine Edge Function ────────────────────
 *
 * `claim_base_time()` und `claim_approved_time()` sind SECURITY DEFINER und
 * schreiben ausschließlich für `auth.uid()`. Jede prüft in EINER Anweisung,
 * ob es etwas zu erteilen gibt, und erteilt es — zwischen Prüfung und
 * Buchung passt damit kein zweiter Aufruf. Über eine Edge Function wären es
 * mehrere Schritte gewesen, mit einem Fenster dazwischen.
 */

/** So lange bleibt eine Genehmigung einlösbar — dieselbe Grenze wie in der Datenbank. */
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

/** Was eine der `claim_*`-Funktionen zurückgibt — leer heißt: nichts zu erteilen. */
interface ErteilteFreigabe {
  unlock_id: string;
  minutes: number;
  expires_at: string;
}

/**
 * Welche Genehmigungen noch nicht eingelöst sind.
 *
 * Der Abgleich läuft über `request_id`, nicht über Zeitstempel: Eine
 * Genehmigung ist genau dann verbraucht, wenn es eine Freigabezeile zu ihr
 * gibt. Alles andere — „ungefähr gleiche Minute", „ähnliche Minutenzahl" —
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
 * Die Grundzeit ist bewusst NICHT dabei. Sie wird nicht automatisch
 * gestartet, sondern vom Kind — sonst wäre sie an einem Tag, an dem das
 * Telefon nur kurz in der Hand liegt, ungenutzt verbraucht.
 */
export async function gleicheFreigabenAb(childId: string): Promise<void> {
  const status = await ScreenTime.getStatus();
  // Wird auf diesem Gerät gar nicht gesperrt, gibt es nichts zu öffnen. Die
  // Genehmigung bleibt stehen, und der Weg über die Eltern von Hand
  // funktioniert wie bisher.
  if (!status.managing) return;

  // Waehrend eines Probelaufs nichts einloesen. Eine Freigabe wuerde das
  // Telefon oeffnen, und das Elternteil prueft dann eine Lage, die es gar
  // nicht pruefen will: Alles offen sieht aus wie „die Sperre wirkt nicht".
  // Die Genehmigung bleibt stehen und wird nach dem Bestaetigen eingeloest.
  if (status.trialUntil && new Date(status.trialUntil) > new Date()) return;

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

/** Eine Genehmigung einlösen: erst in der Datenbank buchen, dann entsperren. */
export async function loeseEin(genehmigung: OffeneGenehmigung): Promise<void> {
  const { data, error } = await supabase.rpc('claim_approved_time', {
    p_request_id: genehmigung.id,
  });
  await entsperreOderNimmZurueck(data as ErteilteFreigabe[] | null, error);
}

/**
 * Die tägliche Grundzeit starten.
 *
 * Gibt die Minuten zurück, die tatsächlich freigegeben wurden — 0, wenn es
 * heute schon lief, auf 0 steht oder das Entsperren scheiterte. Der Aufrufer
 * zeigt danach den neuen Stand, statt eine Zahl zu behaupten.
 */
export async function starteGrundzeit(): Promise<number> {
  const { data, error } = await supabase.rpc('claim_base_time');
  const zeilen = data as ErteilteFreigabe[] | null;
  await entsperreOderNimmZurueck(zeilen, error);
  const erteilt = zeilen?.[0];
  if (!erteilt) return 0;

  const status = await ScreenTime.getStatus().catch(() => null);
  // Nur als erteilt melden, wenn das Gerät auch wirklich offen ist. Sonst
  // hätte das Kind eine Zahl gelesen und nichts davon gehabt.
  const offen = status?.releasedUntil ? new Date(status.releasedUntil) > new Date() : false;
  return offen ? erteilt.minutes : 0;
}

/**
 * Gemeinsamer Teil beider Wege: Ist gebucht, wird entsperrt — und schlägt das
 * fehl, wird die Buchung zurückgenommen.
 *
 * ── Die Reihenfolge und warum sie so herum ist ───────────────────────────
 *
 * Erst bucht die Datenbank (dann ist die Zeit verbraucht), danach entsperrt
 * das Gerät. Andersherum — erst entsperren, dann buchen — könnte ein
 * abgebrochener Aufruf dieselben Minuten zweimal gutschreiben, und weil
 * `releaseFor` eine laufende Freigabe VERLÄNGERT, würden aus 15 Minuten
 * schnell 60.
 *
 * Scheitert das Entsperren, wird die Buchung zurückgenommen. Die Minuten
 * bleiben dem Kind damit erhalten: Es hat gelernt oder sie standen ihm zu,
 * also darf es sie nicht verlieren, nur weil ein Aufruf schiefging.
 */
async function entsperreOderNimmZurueck(
  zeilen: ErteilteFreigabe[] | null,
  error: unknown,
): Promise<void> {
  // Leeres Ergebnis heißt: nichts zu erteilen — abgelehnt, zu alt, schon
  // eingelöst oder heute schon gelaufen. Kein Fehler für das Kind.
  if (error || !zeilen || zeilen.length === 0) return;

  const erteilt = zeilen[0];

  try {
    const ergebnis = await ScreenTime.releaseFor({ minutes: erteilt.minutes });
    if (ergebnis.cancelled) throw new Error('Freigabe abgebrochen');

    // Ohne diese Meldung passiert das Wichtigste unsichtbar: Das Telefon geht
    // auf, und das Kind erfährt es erst, wenn es eine App ausprobiert.
    const bis = ergebnis.releasedUntil
      ? new Date(ergebnis.releasedUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : null;
    toast.success(`${erteilt.minutes} Minuten sind freigegeben`, {
      description: bis ? `Dein Handy ist bis ${bis} Uhr offen.` : undefined,
    });
  } catch {
    await supabase.rpc('revoke_unlock', { p_unlock_id: erteilt.unlock_id });
  }
}
