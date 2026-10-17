import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ExternalLink, Info } from 'lucide-react';
import { SoGehtEs } from '@/components/SoGehtEs';
import { parentalControlsService } from '@/services/parentalControlsService';
import { endgeraetVon, kindGeraetAnleitung } from '@/lib/geraeteAnleitung';

/**
 * „Sperre und Freigabe“ in den Einstellungen des KINDES.
 *
 * Die Karte steht auf dem Gerät des Kindes, die Einrichtung macht aber ein
 * Elternteil: Sperre und Freigabe der Bildschirmzeit gehören in Apples
 * Bildschirmzeit bzw. Google Family Link auf genau diesem Gerät. Deshalb steht
 * hier keine Fehlermeldung („Family Link nicht installiert“), sondern was das
 * Elternteil tun muss, passend zum Gerät (iPhone/iPad, Android, Browser,
 * Computer; lib/geraeteAnleitung.ts). Frueher stand auf dem Kinder-Handy ein
 * Knopf, der die Eltern-App Family Link installieren wollte.
 */
export function ScreenTimeWidget() {
  const [opening, setOpening] = useState(false);
  const [manuell, setManuell] = useState(false);

  const geraet = endgeraetVon(
    parentalControlsService.getPlatform(),
    typeof navigator === 'undefined' ? '' : navigator.userAgent || '',
    typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
  );
  const anleitung = kindGeraetAnleitung(geraet);
  // Nur auf dem iPhone/iPad in der App lassen sich die Einstellungen öffnen
  const kannOeffnen = geraet.nativ && geraet.system === 'ios';

  const oeffnen = async () => {
    setOpening(true);
    setManuell(false);
    try {
      const result = await parentalControlsService.openParentalControlApp();
      if (!result.success) setManuell(true);
    } catch {
      setManuell(true);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Sperre und Freigabe
        </CardTitle>
        <CardDescription>{anleitung.text}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {kannOeffnen && (
          <div className="space-y-2">
            <Button onClick={oeffnen} disabled={opening} className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              Einstellungen öffnen
            </Button>
            {manuell && (
              <p className="text-sm text-tinte">
                Öffne die Einstellungen selbst und tippe auf <strong>Bildschirmzeit</strong>.
              </p>
            )}
          </div>
        )}

        {/* In den Apps keine Links aus dem Kinderbereich heraus (Apple 1.3: nur hinter einer Eltern-Hürde) */}
        <SoGehtEs titel="So richtet ihr es ein" schritte={anleitung.schritte} links={geraet.nativ ? [] : anleitung.links} />

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Hast du Zeit verdient, fragst du sie weiter unten an. Dein Elternteil gibt sie dann frei.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
