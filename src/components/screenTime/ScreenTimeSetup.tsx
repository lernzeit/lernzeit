import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LockOpen, ShieldCheck, SlidersHorizontal, Smartphone, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimeAvailability } from '@/services/screenTime/plugin';
import { EMPTY_STATUS, type ScreenTimeAvailability, type ShieldStatus } from '@/services/screenTime/types';
import { ParentGate } from '@/components/screenTime/ParentGate';

/**
 * Dauer des Probelaufs bei der ersten Aktivierung.
 *
 * Kurz genug, dass ein Fehlschlag nicht den Abend kostet, lang genug zum
 * Ausprobieren. iOS weist sehr kurze Überwachungsfenster ab und verlängert
 * sie dann — der angezeigte Zeitpunkt kommt deshalb vom Gerät und nicht aus
 * dieser Zahl.
 */
const PROBELAUF_MINUTEN = 10;

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
  // Apples Begruendung, falls die Zustimmung scheitert. Bleibt stehen, bis
  // es neu versucht wird — damit man sie abfotografieren kann.
  const [ablehnung, setAblehnung] = useState<string | null>(null);

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
   * Der eine Knopf: zustimmen und sofort sperren — auf Widerruf.
   *
   * Zwischen Apples Zustimmung und dem Einschalten der Sperre liegt kein
   * weiterer Schritt. Bliebe dazwischen ein Bildschirm stehen, hätte das
   * Elternteil zugestimmt und trotzdem nichts erreicht — der häufigste Weg,
   * eine Einrichtung halb fertig liegen zu lassen.
   *
   * Warum als Probelauf: Apple sagt nirgends, ob eine App, die alles sperrt,
   * sich dabei selbst mitsperrt. Wäre das so, käme das Kind nicht mehr in
   * LernZeit, um Zeit zu verdienen, und die Eltern nur noch über die
   * iOS-Einstellungen an die Sperre heran. Der Probelauf macht diese offene
   * Frage harmlos: Wer sie nicht bestätigt, bekommt sie von selbst wieder
   * los.
   */
  const einrichten = async () => {
    setBusy('Einrichten');
    setAblehnung(null);
    try {
      // Liegt die Zustimmung schon vor, nicht erneut fragen: Ein zweites
      // `.child` scheitert auf einem Geraet, das ueber die Werkbank als
      // Erwachsenengeraet zugestimmt hat — und fragt sonst unnoetig nach.
      const { authorization, reason } = status.authorization === 'approved'
        ? { authorization: 'approved' as const, reason: undefined }
        : await ScreenTime.requestAuthorization();
      if (authorization !== 'approved') {
        setAblehnung(reason ?? null);
        await laden();
        return;
      }
      await ScreenTime.applyShield({ shieldAll: true, trialMinutes: PROBELAUF_MINUTEN });
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
  const probeLaeuft = Boolean(status.trialUntil && new Date(status.trialUntil) > new Date());

  // Der Probelauf bekommt die ganze Karte. Alles andere — Ausnahmen,
  // Aufheben, Erklärungen — wäre jetzt im Weg: Es gibt genau eine Frage zu
  // beantworten, und zwar sofort.
  if (probeLaeuft && status.trialUntil) {
    const bis = new Date(status.trialUntil).toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit',
    });
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-amber-600" />
            Probelauf bis {bis} Uhr
          </CardTitle>
          <CardDescription>
            Die Sperre ist an — aber nur auf Probe. Wenn du sie nicht
            bestätigst, löst sie sich bis {bis} Uhr von selbst wieder auf.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ol className="text-sm space-y-2 list-decimal pl-5 leading-relaxed">
            <li>Schließe LernZeit und öffne eine andere App. Es sollte ein Sperrbildschirm erscheinen.</li>
            <li>Öffne LernZeit wieder. <strong>Das muss gehen</strong> — sonst kann dein Kind keine Zeit verdienen.</li>
            <li>Erst wenn beides stimmt: unten bestätigen.</li>
          </ol>

          <div className="grid gap-2">
            <Button
              disabled={busy !== null}
              onClick={() => void fuehreAus('Bestätigen', () => ScreenTime.confirmShield())}
            >
              {busy === 'Bestätigen'
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <ShieldCheck className="h-4 w-4 mr-2" />}
              Hat geklappt — dauerhaft einschalten
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy !== null}
              onClick={() => void fuehreAus('Abbrechen', () => ScreenTime.stopManaging())}
            >
              <LockOpen className="h-4 w-4 mr-2" />
              Sofort abbrechen
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Ließ sich LernZeit nicht mehr öffnen, tu nichts — warte einfach ab.
            Die Sperre fällt von allein, auch wenn du diese Seite nicht
            erreichst.
          </p>
        </CardContent>
      </Card>
    );
  }

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
              {ablehnung ? (
                <div className="text-sm text-destructive leading-relaxed space-y-1">
                  <p>{erklaereAblehnung(ablehnung)}</p>
                  {/* Der Rohtext bleibt sichtbar: Er ist das, was bei einer
                      Rueckfrage weiterhilft. */}
                  <p className="text-xs text-muted-foreground break-all">Apple: {ablehnung}</p>
                </div>
              ) : status.authorization === 'denied' && (
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
                {/* Auch hier mit Probelauf, wie beim ersten Einrichten: Ob
                    LernZeit sich beim Sperren selbst mitsperrt, ist nicht
                    geklaert. Ohne Probelauf waere ein Irrtum hier nur ueber
                    die iOS-Einstellungen zu beheben. */}
                {!status.managing && (
                  <Button
                    disabled={busy !== null}
                    onClick={() => void fuehreAus('Sperre aktivieren', () =>
                      ScreenTime.applyShield({ shieldAll: true, trialMinutes: PROBELAUF_MINUTEN }))}
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
 * Übersetzt Apples Fehler bei der Zustimmung in einen Satz für Eltern.
 *
 * Die Namen sind die Fälle von `FamilyControlsError`. Unbekanntes wird nicht
 * geraten, sondern als solches benannt — der Rohtext steht ohnehin darunter.
 */
function erklaereAblehnung(grund: string): string {
  if (grund.includes('invalidAccountType')) {
    return 'Dieses iPhone ist nicht als Gerät eines Kindes in der Apple-Familienfreigabe angemeldet. '
      + 'Apple erlaubt die Sperre nur dort: Die Apple-ID auf dem iPhone muss die eines Kindes '
      + '(unter 18) in der Familienfreigabe eines Elternteils sein.';
  }
  if (grund.includes('authorizationCanceled')) return 'Die Zustimmung wurde abgebrochen.';
  if (grund.includes('authorizationConflict')) {
    return 'Eine andere App verwaltet die Bildschirmzeit auf diesem Gerät bereits.';
  }
  if (grund.includes('restricted')) {
    return 'Bildschirmzeit ist auf diesem Gerät eingeschränkt, zum Beispiel durch ein Verwaltungsprofil.';
  }
  if (grund.includes('authenticationMethodUnavailable')) {
    return 'Apple kann die Zustimmung auf diesem Gerät nicht abfragen. Ist ein Gerätecode eingerichtet?';
  }
  if (grund.includes('networkError')) return 'Keine Verbindung zu Apple. Bitte mit Internet erneut versuchen.';
  if (grund.includes('unavailable')) {
    return 'Apple meldet die Funktion auf diesem Gerät als nicht verfügbar. '
      + 'Häufigste Ursache: Diese App-Fassung hat Apples Berechtigung „Family Controls“ nicht.';
  }
  return 'Apple hat die Zustimmung abgelehnt, aus einem Grund, den LernZeit nicht kennt.';
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
