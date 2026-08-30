import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenTime, screenTimeAvailability } from '@/services/screenTime/plugin';
import { EMPTY_STATUS, type ScreenTimeAvailability, type ShieldStatus } from '@/services/screenTime/types';

/**
 * Werkbank fuer die Geraetesperre — zum Erproben auf einem echten Geraet.
 *
 * Diese Oberflaeche ist NICHT die spaetere Eltern-Oberflaeche. Sie zeigt jeden
 * Einzelschritt roh, damit sich auf dem Geraet feststellen laesst, an welcher
 * Stelle es klemmt. Die spaetere Fassung fuehrt das Elternteil durch die
 * Einrichtung und zeigt nicht sieben Knoepfe nebeneinander.
 *
 * Sichtbar nur, wenn VITE_SCREENTIME_UI gesetzt ist — siehe Kommentar an der
 * Einbindung im ChildSettingsMenu.
 */
export function ScreenTimeTestPanel() {
  const [availability, setAvailability] = useState<ScreenTimeAvailability | null>(null);
  const [status, setStatus] = useState<ShieldStatus>(EMPTY_STATUS);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const verfuegbar = await screenTimeAvailability();
    setAvailability(verfuegbar);
    if (!verfuegbar.available) return;
    try {
      setStatus(await ScreenTime.getStatus());
    } catch (e) {
      toast.error('Status konnte nicht gelesen werden', { description: String(e) });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Jeder Aufruf einzeln gekapselt: Auf dem Geraet soll erkennbar sein, WELCHER
   * Schritt fehlschlaegt. Ein gemeinsamer try/catch um alles haette genau die
   * Information verschluckt, wegen der diese Werkbank existiert.
   */
  const run = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    try {
      const ergebnis = await fn();
      toast.success(`${name}: ok`, { description: JSON.stringify(ergebnis) });
      await refresh();
    } catch (e) {
      toast.error(`${name} fehlgeschlagen`, { description: String(e) });
    } finally {
      setBusy(null);
    }
  };

  if (availability && !availability.available) {
    const grund =
      availability.reason === 'os-version'
        ? 'Dieses Gerät braucht mindestens iOS 16.'
        : availability.reason === 'entitlement-missing'
          ? 'Das native Plugin antwortet nicht — fehlt es im Build?'
          : 'Nur auf dem iPhone oder iPad möglich. Android bietet dafür keine Schnittstelle.';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" /> Gerätesperre nicht verfügbar
          </CardTitle>
          <CardDescription>{grund}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const laufend = status.releasedUntil
    ? new Date(status.releasedUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status.releasedCount > 0 ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          Gerätesperre (Werkbank)
        </CardTitle>
        <CardDescription>
          Zum Erproben. Die Sperre schnappt derzeit nur wieder zu, solange LernZeit geöffnet ist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Berechtigung</dt>
          <dd className="font-medium">{status.authorization}</dd>
          <dt className="text-muted-foreground">LernZeit sperrt</dt>
          <dd className="font-medium">{status.managing ? 'ja' : 'nein'}</dd>
          <dt className="text-muted-foreground">Gesperrte Apps</dt>
          <dd className="font-medium">{status.shieldedCount}</dd>
          <dt className="text-muted-foreground">Gerade offen</dt>
          <dd className="font-medium">
            {status.releasedCount > 0 ? `${status.releasedCount} bis ${laufend}` : 'keine'}
          </dd>
        </dl>

        <div className="grid gap-2">
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => run('Berechtigung anfragen', () => ScreenTime.requestAuthorization())}
          >
            {busy === 'Berechtigung anfragen' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            1. Berechtigung anfragen
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null || status.authorization !== 'approved'}
            onClick={() => run('Apps auswählen', () => ScreenTime.pickShieldedApps())}
          >
            {busy === 'Apps auswählen' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            2. Apps auswählen und sperren
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null || !status.managing}
            onClick={() => run('5 Minuten freigeben', () => ScreenTime.releaseFor({ minutes: 5, mode: 'all' }))}
          >
            {busy === '5 Minuten freigeben' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            3. 5 Minuten freigeben
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null || !status.managing}
            onClick={() => run('Sofort sperren', () => ScreenTime.restoreShield())}
          >
            4. Sofort wieder sperren
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={busy !== null}
            onClick={() => run('Sperre aufheben', () => ScreenTime.stopManaging())}
          >
            Notausstieg: Sperre ganz aufheben
          </Button>
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => void refresh()}>
            Status neu lesen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
