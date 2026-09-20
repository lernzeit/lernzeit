import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LockOpen, ShieldCheck, SlidersHorizontal, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimeAvailability } from '@/services/screenTime/plugin';
import { EMPTY_STATUS, type ScreenTimeAvailability, type ShieldStatus } from '@/services/screenTime/types';
import { ParentGate } from '@/components/screenTime/ParentGate';

interface ScreenTimeSetupProps {
  /** Das Kind, auf dessen Gerät diese Ansicht läuft. */
  childId: string;
}

/**
 * Einrichtung der Gerätesperre — die Oberfläche, die ein Elternteil auf dem
 * Gerät des Kindes bedient.
 *
 * ── Ein Knopf, nicht drei ────────────────────────────────────────────────
 *
 * Die erste Fassung verlangte, dass ein Elternteil erst zustimmt, dann in
 * Apples Auswahldialog einzelne Apps antippt und danach die Sperre
 * einschaltet. Drei Schritte, von denen der mittlere der mühsamste war — und
 * der überflüssigste: Wer sein Kind von Apps fernhalten will, meint selten
 * eine bestimmte Liste, sondern „das Handy“.
 *
 * Deshalb sperrt LernZeit jetzt vorgabemäßig ALLES
 * (`ShieldSettings.ActivityCategoryPolicy.all(except:)`) und braucht dafür
 * keine Auswahl. Der Auswahldialog bleibt erreichbar, hat aber die Rolle
 * gewechselt: Er bestimmt nicht mehr, was gesperrt wird, sondern was offen
 * bleibt — die Ausnahmen.
 *
 * ── Warum sie hier und nicht im Eltern-Dashboard steht ───────────────────
 *
 * Die Sperre ist eine Einstellung des Geräts, auf dem sie greift. Ein
 * ApplicationToken ist gerätegebunden, und ManagedSettings kennt keinen
 * Fernzugriff. Ein Schalter im Dashboard der Eltern könnte technisch gar
 * nichts bewirken.
 *
 * Apple fragt beim ERSTEN Zustimmen selbst nach der Bildschirmzeit-Kennung.
 * Für alles danach steht der ParentGate davor — aber nur vor den Schritten,
 * die die Sperre LOCKERN. Sie zu aktivieren darf jeder.
 *
 * ── Was die Oberfläche bewusst nicht zeigt ───────────────────────────────
 *
 * Keine App-Namen, keine Symbole, nur Anzahlen. Die Tokens sind undurchsichtig
 * — welche Apps gewählt wurden, erfährt unser Code nicht und soll er nicht
 * erfahren.
 */
export function ScreenTimeSetup({ childId }: ScreenTimeSetupProps) {
  const [availability, setAvailability] = useState<ScreenTimeAvailability | null>(null);
  const [status, setStatus] = useState<ShieldStatus>(EMPTY_STATUS);
  const [busy, setBusy] = useState<string | null>(null);
  const [gateOffen, setGateOffen] = useState(false);
  const [gateZweck, setGateZweck] = useState('');
  const [nachGate, setNachGate] = useState<(() => void) | null>(null);

  const laden = useCallback(async () => {
    const verfuegbar = await screenTimeAvailability();
    setAvailability(verfuegbar);
    if (!verfuegbar.available) return;
    try {
      const neuerStand = await ScreenTime.getStatus();
      setStatus(neuerStand);
      await meldeStand(neuerStand.managing);
    } catch {
      /* Zustand nicht lesbar — die Ansicht bleibt beim leeren Stand. */
    }
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  const fuehreAus = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    try {
      await fn();
      await laden();
    } catch (e) {
      toast.error(`${name} hat nicht geklappt`, { description: String(e) });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Der eine Knopf: zustimmen und sofort sperren.
   *
   * Zwischen Apples Zustimmung und dem Einschalten der Sperre liegt kein
   * weiterer Schritt. Bliebe dazwischen ein Bildschirm stehen, hätte das
   * Elternteil zugestimmt und trotzdem nichts erreicht — der häufigste Weg,
   * eine Einrichtung halb fertig liegen zu lassen.
   */
  const einrichten = async () => {
    setBusy('Einrichten');
    try {
      const { authorization } = await ScreenTime.requestAuthorization();
      if (authorization !== 'approved') {
        await laden();
        return;
      }
      await ScreenTime.applyShield({ shieldAll: true });
      toast.success('Die Sperre ist aktiv.');
    } catch (e) {
      toast.error('Einrichten hat nicht geklappt', { description: String(e) });
    } finally {
      setBusy(null);
      await laden();
    }
  };

  /** Öffnet die Eltern-Hürde und führt die Aktion erst danach aus. */
  const mitElternfreigabe = (zweck: string, aktion: () => void) => {
    setGateZweck(zweck);
    setNachGate(() => aktion);
    setGateOffen(true);
  };

  if (availability === null) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerät wird geprüft …
        </CardContent>
      </Card>
    );
  }

  // Ehrliche Meldung statt eines Schalters, der nichts bewirkt.
  if (!availability.available) {
    const grund =
      availability.reason === 'os-version'
        ? 'Dafür wird mindestens iOS 16 gebraucht.'
        : availability.reason === 'entitlement-missing'
          ? 'Diese App-Fassung hat die nötige Apple-Berechtigung nicht.'
          : 'Das geht nur auf einem iPhone oder iPad, nicht im Browser und nicht auf Android.';
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Handy sperren
          </CardTitle>
          <CardDescription>{grund}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const zugestimmt = status.authorization === 'approved';
  const freigabeLaeuft = Boolean(status.releasedUntil && new Date(status.releasedUntil) > new Date());

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Handy sperren
            </span>
            {status.managing && (
              <Badge variant="secondary" className="font-normal">
                {freigabeLaeuft ? 'gerade freigegeben' : 'aktiv'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Ein Elternteil richtet das einmal auf diesem Gerät ein. Danach genügt
            eine Genehmigung — ganz ohne Apps auszuwählen.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!zugestimmt ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                iOS fragt gleich nach der Bildschirmzeit-Kennung oder der Apple-ID
                eines Elternteils. Danach sind die Apps auf diesem Gerät gesperrt,
                bis Zeit verdient und genehmigt wurde.
              </p>
              <Button className="w-full" disabled={busy !== null} onClick={() => void einrichten()}>
                {busy === 'Einrichten'
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sperre einrichten
              </Button>
              {status.authorization === 'denied' && (
                <p className="text-sm text-destructive leading-relaxed">
                  Die Berechtigung wurde abgelehnt oder später entzogen. Sie lässt sich
                  in den iOS-Einstellungen unter „Bildschirmzeit“ wieder erteilen.
                </p>
              )}
            </>
          ) : (
            <>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Gesperrt</dt>
                <dd>{beschreibeSperre(status)}</dd>
                {freigabeLaeuft && status.releasedUntil && (
                  <>
                    <dt className="text-muted-foreground">Freigegeben bis</dt>
                    <dd>
                      {new Date(status.releasedUntil).toLocaleTimeString('de-DE', {
                        hour: '2-digit', minute: '2-digit',
                      })} Uhr
                    </dd>
                  </>
                )}
              </dl>

              <div className="grid gap-2">
                {!status.managing && (
                  <Button
                    disabled={busy !== null}
                    onClick={() => void fuehreAus('Sperre aktivieren', () => ScreenTime.applyShield({ shieldAll: true }))}
                  >
                    {busy === 'Sperre aktivieren'
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Sperre aktivieren
                  </Button>
                )}

                {status.managing && (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() =>
                        mitElternfreigabe(
                          'Du wählst gleich Apps aus, die trotz Sperre offen bleiben.',
                          () => void fuehreAus('Ausnahmen wählen', () => ScreenTime.pickShieldedApps()),
                        )}
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      {status.shieldedCount === 0 ? 'Ausnahmen wählen' : 'Ausnahmen ändern'}
                    </Button>

                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy !== null}
                      onClick={() =>
                        mitElternfreigabe(
                          'Du hebst gleich die Sperre vollständig auf.',
                          () => void fuehreAus('Sperre aufheben', () => ScreenTime.stopManaging()),
                        )}
                    >
                      <LockOpen className="h-4 w-4 mr-2" />
                      Sperre aufheben
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Gesperrt ist standardmäßig alles. Einzelne Apps lassen sich als
                Ausnahme offenhalten — welche das sind, sieht LernZeit nicht, Apple
                gibt nur eine Anzahl heraus. Läuft genehmigte Zeit ab, schnappt die
                Sperre von selbst wieder zu, auch wenn LernZeit geschlossen ist.
                Rückgängig geht es hier über „Sperre aufheben“ oder in den
                iOS-Einstellungen unter „Bildschirmzeit“.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ParentGate
        open={gateOffen}
        onOpenChange={setGateOffen}
        childId={childId}
        purpose={gateZweck}
        onVerified={() => nachGate?.()}
      />
    </>
  );
}

/**
 * Meldet dem Server, ob auf diesem Gerät gesperrt wird.
 *
 * Nur dafür da, dass Eltern auf IHREM Gerät sehen können, ob die Einrichtung
 * geklappt hat. Genau das fehlte bisher: Die Sperre war gebaut, aber niemand
 * konnte von außen erkennen, ob sie steht.
 *
 * Fehler werden geschluckt. Ein Anzeigewert ist kein Grund, eine Einrichtung
 * scheitern zu lassen, die auf dem Gerät längst funktioniert.
 */
async function meldeStand(verwaltet: boolean) {
  try {
    await supabase.rpc('set_screen_time_managed', { ist_verwaltet: verwaltet });
  } catch {
    /* Ohne Netz bleibt der Serverstand alt und wird beim nächsten Öffnen
       nachgezogen. */
  }
}

/**
 * „alle Apps“ — oder ehrlich mit Ausnahmen. Die Zahl bedeutet je nach Modus
 * etwas anderes: bei `shieldAll` sind es die Ausnahmen, sonst die gesperrten
 * Einträge. Ein Satz, der beides gleich nennt, wäre falsch.
 */
function beschreibeSperre(status: ShieldStatus): string {
  if (!status.managing) return 'nichts — die Sperre ist aus';

  if (status.shieldAll) {
    if (status.shieldedCount === 0) return 'alle Apps';
    return status.shieldedCount === 1
      ? 'alle Apps bis auf eine Ausnahme'
      : `alle Apps bis auf ${status.shieldedCount} Ausnahmen`;
  }

  if (status.shieldedCount === 0) return 'nichts — es ist nichts ausgewählt';
  return status.shieldedCount === 1 ? 'ein ausgewählter Eintrag' : `${status.shieldedCount} ausgewählte Einträge`;
}
