import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info } from 'lucide-react';
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
  const geraet = endgeraetVon(
    parentalControlsService.getPlatform(),
    typeof navigator === 'undefined' ? '' : navigator.userAgent || '',
    typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
  );
  // iPhone/iPad: die LernZeit-Handysperre weiter unten („Handy sperren“), kein
  // Absprung mehr in Apples Einstellungen (22.10.2026, lib/geraeteAnleitung.ts)
  const anleitung = kindGeraetAnleitung(geraet);

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
