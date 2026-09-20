import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, LockOpen, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
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
 * ── Warum sie hier und nicht im Eltern-Dashboard steht ───────────────────
 *
 * Ein ApplicationToken ist gerätegebunden. Welche Apps gesperrt werden, lässt
 * sich nur auf dem Gerät auswählen, auf dem sie liegen — also auf dem des
 * Kindes. Ein Schalter im Dashboard der Eltern könnte technisch gar nichts
 * bewirken.
 *
 * Deshalb: Das Elternteil nimmt das Gerät des Kindes in die Hand, öffnet
 * diese Ansicht und weist sich aus. Apple fragt beim ERSTEN Zustimmen selbst
 * nach der Bildschirmzeit-Kennung; für alles danach steht der ParentGate
 * davor, weil Apple nicht noch einmal fragt.
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
      setStatus(await ScreenTime.getStatus());
    } catch {
      /* Zustand nicht lesbar — die Ansicht bleibt beim leeren Stand. */
    }
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  const fuehreAus = async (name: string, fn: () => Promise<ShieldStatus | unknown>) => {
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
            Apps sperren
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
              Apps sperren
            </span>
            {status.managing && (
              <Badge variant="secondary" className="font-normal">
                {freigabeLaeuft ? 'gerade freigegeben' : 'aktiv'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Diese Einrichtung nimmt ein Elternteil vor — auf diesem Gerät, weil die
            Auswahl der Apps nur hier möglich ist.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!zugestimmt ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Beim ersten Einrichten fragt iOS nach der Bildschirmzeit-Kennung
                oder der Apple-ID eines Elternteils. Danach lassen sich Apps
                auswählen, die gesperrt werden, bis Zeit verdient wurde.
              </p>
              <Button
                className="w-full"
                disabled={busy !== null}
                onClick={() => void fuehreAus('Einrichten', () => ScreenTime.requestAuthorization())}
              >
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
                <dt className="text-muted-foreground">Gesperrte Auswahl</dt>
                <dd>
                  {status.shieldedCount === 0
                    ? 'noch nichts ausgewählt'
                    : `${status.shieldedCount} ${status.shieldedCount === 1 ? 'Eintrag' : 'Einträge'}`}
                </dd>
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
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() =>
                    mitElternfreigabe(
                      'Du änderst gleich, welche Apps gesperrt werden.',
                      () => void fuehreAus('Apps auswählen', () => ScreenTime.pickShieldedApps()),
                    )}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {status.shieldedCount === 0 ? 'Apps auswählen' : 'Auswahl ändern'}
                </Button>

                {status.shieldedCount > 0 && !status.managing && (
                  <Button
                    disabled={busy !== null}
                    onClick={() => void fuehreAus('Sperre aktivieren', () => ScreenTime.applyShield())}
                  >
                    {busy === 'Sperre aktivieren'
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Sperre aktivieren
                  </Button>
                )}

                {status.managing && (
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
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Welche Apps ausgewählt wurden, sieht LernZeit nicht — Apple gibt nur
                eine Anzahl heraus. Läuft verdiente Zeit ab, schnappt die Sperre von
                selbst wieder zu, auch wenn LernZeit geschlossen ist.
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
