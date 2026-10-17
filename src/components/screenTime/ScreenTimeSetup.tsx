import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hourglass, KeyRound, Loader2, LockOpen, ShieldCheck, SlidersHorizontal, Smartphone, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ScreenTime, kannTagesbudget, screenTimeAvailability } from '@/services/screenTime/plugin';
import { EMPTY_STATUS, type ScreenTimeAvailability, type ShieldStatus } from '@/services/screenTime/types';
import { ParentGate, type GeraetFreigabeZweck } from '@/components/screenTime/ParentGate';
import { gleicheTagesbudgetAb, istOffen, offenText } from '@/services/screenTime/release';
import { hatNotfallSchluessel, notfallSchluesselHolen } from '@/services/screenTime/notfall';
import { standText } from '@/lib/handyzeit';
import { Capacitor } from '@capacitor/core';
import { SoGehtEs } from '@/components/SoGehtEs';
import { appleAblehnung, endgeraetVon, nachFehler, sperreNichtMoeglich, type SperreGrund } from '@/lib/geraeteAnleitung';

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
  const [gateZweck, setGateZweck] = useState<GeraetFreigabeZweck>('ausnahmen');
  const [nachGate, setNachGate] = useState<(() => void) | null>(null);
  // Apples Begruendung, falls die Zustimmung scheitert. Bleibt stehen, bis
  // es neu versucht wird — damit man sie abfotografieren kann.
  const [ablehnung, setAblehnung] = useState<string | null>(null);
  const [hatCode, setHatCode] = useState<boolean | null>(null);

  const laden = useCallback(async () => {
    const verfuegbar = await screenTimeAvailability();
    setAvailability(verfuegbar);
    if (!verfuegbar.available) return;
    try {
      const neuerStand = await ScreenTime.getStatus();
      setStatus(neuerStand);
      setHatCode(await hatNotfallSchluessel());
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
      toast.error(`${name} hat nicht geklappt`, { description: nachFehler(e) });
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
      const { authorization, reason } = await ScreenTime.requestAuthorization();
      if (authorization !== 'approved') {
        setAblehnung(reason ?? null);
        await laden();
        return;
      }
      const stand = await ScreenTime.getStatus();
      if (!kannTagesbudget(stand)) {
        // Älterer nativer Teil: Probelauf wie bisher.
        await ScreenTime.applyShield({ shieldAll: true, trialMinutes: PROBELAUF_MINUTEN });
        return;
      }
      // Tagesbudget (17.10.2026): Ohne „Was zählt als Handyzeit?“ kann
      // nichts gezählt werden — deshalb Pflichtschritt direkt danach. Kein
      // Probelauf mehr: Auf Klaras Handy (10.10.2026) blieb LernZeit unter
      // der Sperre offen, und die Freiminuten des Tages sind sofort da.
      const auswahl = await ScreenTime.pickCountedApps();
      if (auswahl.cancelled || auswahl.count === 0) {
        toast.message('Noch ein Schritt', { description: '„Was zählt als Handyzeit?“ wählen, sonst kann LernZeit nichts zählen.' });
        return;
      }
      await ScreenTime.applyShield({ shieldAll: true });
      await gleicheTagesbudgetAb(childId);
      await notfallSchluesselHolen().catch(() => false);
    } catch (e) {
      toast.error('Einrichten hat nicht geklappt', { description: nachFehler(e) });
    } finally {
      setBusy(null);
      await laden();
    }
  };

  /** Öffnet die Eltern-Hürde und führt die Aktion erst danach aus. */
  const mitElternfreigabe = (zweck: GeraetFreigabeZweck, aktion: () => void) => {
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

  // Statt eines Schalters, der nichts bewirkt: was das Elternteil tun muss, damit
  // es geht. Der Text haengt vom Geraet ab (lib/geraeteAnleitung.ts).
  if (!availability.available) {
    const anleitung = sperreNichtMoeglich(
      availability.reason as SperreGrund | undefined,
      endgeraetVon(Capacitor.getPlatform(), navigator.userAgent || '', navigator.maxTouchPoints || 0),
    );
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Handy sperren
          </CardTitle>
          <CardDescription>{anleitung.text}</CardDescription>
        </CardHeader>
        <CardContent>
          <SoGehtEs schritte={anleitung.schritte} links={Capacitor.isNativePlatform() ? [] : anleitung.links} />
        </CardContent>
      </Card>
    );
  }

  const zugestimmt = status.authorization === 'approved';
  const freigabeLaeuft = istOffen(status);
  const budgetModus = kannTagesbudget(status);
  // Neuer Build (10.10.2026): kennt „Was zählt als Handyzeit?“ und Ruhezeit
  const kannNutzung = 'zaehltNutzung' in status;
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
          <CardDescription>Ohne Bestätigung löst sich die Sperre von selbst.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ol className="text-sm space-y-1 list-decimal pl-5">
            <li>Andere App öffnen: gesperrt?</li>
            <li>LernZeit öffnen: geht?</li>
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
                {status.ruhezeit ? 'Ruhezeit' : freigabeLaeuft ? 'frei' : budgetModus ? (status.aufgebraucht ? 'zu' : 'offen') : 'aktiv'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Telefon und LernZeit bleiben immer offen.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!zugestimmt ? (
            <>
              <p className="text-sm text-muted-foreground">
                iOS fragt gleich nach der Bildschirmzeit-Kennung. Danach „Was zählt als Handyzeit?“: „Alle Apps &amp; Kategorien“ wählen, LernZeit abwählen.
              </p>
              <Button className="w-full" disabled={busy !== null} onClick={() => void einrichten()}>
                {busy === 'Einrichten'
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sperre einrichten
              </Button>
              {ablehnung ? (
                <div className="text-sm leading-relaxed space-y-1">
                  <p className="text-tinte">{appleAblehnung(ablehnung)}</p>
                  {/* Der Rohtext bleibt sichtbar: Er ist das, was bei einer
                      Rueckfrage weiterhilft. */}
                  <p className="text-xs text-muted-foreground break-all">Apple: {ablehnung}</p>
                </div>
              ) : status.authorization === 'denied' && (
                <p className="text-sm text-tinte leading-relaxed">
                  Erteile die Berechtigung wieder: Einstellungen → Bildschirmzeit.
                  Danach hier noch einmal „Sperre einrichten“ antippen.
                </p>
              )}
            </>
          ) : (
            <>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Gesperrt</dt>
                <dd>{beschreibeSperre(status)}</dd>
                {freigabeLaeuft && (
                  <>
                    <dt className="text-muted-foreground">Frei</dt>
                    <dd>{offenText(status)}</dd>
                  </>
                )}
                {budgetModus ? (
                  <>
                    <dt className="text-muted-foreground">Heute</dt>
                    <dd>{status.tagesbudget != null
                      ? standText({ budget: status.tagesbudget, genutzt: status.genutzt ?? 0, aufgebraucht: Boolean(status.aufgebraucht) })
                      : <span className="text-destructive">zählt nicht – „Was zählt als Handyzeit?“ wählen</span>}</dd>
                    <dt className="text-muted-foreground">Notfallcode</dt>
                    <dd>{hatCode ? 'bereit' : 'fehlt noch'}</dd>
                  </>
                ) : kannNutzung && (
                  <>
                    <dt className="text-muted-foreground">Zeit zählt</dt>
                    <dd>{status.zaehltNutzung ? 'nur bei Nutzung' : 'nach Uhr'}</dd>
                  </>
                )}
              </dl>

              <div className="grid gap-2">
                {!status.managing && (
                  <Button
                    disabled={busy !== null}
                    onClick={() => void fuehreAus('Sperre aktivieren', async () => {
                      await ScreenTime.applyShield({ shieldAll: true });
                      if (budgetModus) await gleicheTagesbudgetAb(childId);
                    })}
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
                          'ausnahmen',
                          () => void fuehreAus('Immer erlaubt', () => ScreenTime.pickShieldedApps()),
                        )}
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Immer erlaubt{status.shieldedCount > 0 ? ` (${status.shieldedCount})` : ''}
                    </Button>

                    {kannNutzung && (
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          mitElternfreigabe(
                            'zaehlen',
                            () => void fuehreAus('Handyzeit wählen', async () => {
                              await ScreenTime.pickCountedApps();
                              if (budgetModus) await gleicheTagesbudgetAb(childId);
                            }),
                          )}
                      >
                        <Hourglass className="h-4 w-4 mr-2" />
                        Was zählt als Handyzeit?
                      </Button>
                    )}

                    {budgetModus && hatCode === false && (
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          mitElternfreigabe(
                            'zaehlen',
                            () => void fuehreAus('Notfallcode', async () => {
                              if (!(await notfallSchluesselHolen())) throw new Error('Bitte noch einmal auf dem Eltern-Handy erlauben.');
                            }),
                          )}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Notfallcode einrichten
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy !== null}
                      onClick={() =>
                        mitElternfreigabe(
                          'aufheben',
                          () => void fuehreAus('Sperre aufheben', () => ScreenTime.stopManaging()),
                        )}
                    >
                      <LockOpen className="h-4 w-4 mr-2" />
                      Sperre aufheben
                    </Button>
                  </>
                )}
              </div>

              {kannNutzung && !status.zaehltNutzung && (
                <p className="text-xs text-muted-foreground">
                  Tipp „Handyzeit“: „Alle Apps &amp; Kategorien“ wählen, LernZeit abwählen.
                </p>
              )}
              {budgetModus && (
                <p className="text-xs text-muted-foreground">
                  Freiminuten, Ruhezeit und Extra-Zeit stellst du auf deinem Handy ein: Kinder → Regeln.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ParentGate
        open={gateOffen}
        onOpenChange={setGateOffen}
        childId={childId}
        zweck={gateZweck}
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
    return `alle Apps außer ${status.shieldedCount} immer erlaubten`;
  }

  if (status.shieldedCount === 0) return 'nichts — es ist nichts ausgewählt';
  return status.shieldedCount === 1 ? 'ein ausgewählter Eintrag' : `${status.shieldedCount} ausgewählte Einträge`;
}
