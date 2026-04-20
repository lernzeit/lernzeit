import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ExternalLink, Smartphone, Info, AlertTriangle, Download } from 'lucide-react';
import { parentalControlsService } from '@/services/parentalControlsService';
import { useToast } from '@/hooks/use-toast';

const PLAY_STORE_FAMILY_LINK = 'https://play.google.com/store/apps/details?id=com.google.android.apps.kids.familylink';

export function ScreenTimeWidget() {
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  
  const isNative = parentalControlsService.isNativePlatform();
  const platform = parentalControlsService.getPlatform();
  const appName = parentalControlsService.getParentalControlAppName();

  const handleOpenControls = async () => {
    setOpening(true);
    try {
      const result = await parentalControlsService.openParentalControlApp();
      setNotInstalled(!!result.notInstalled);
      if (!result.success) {
        toast({
          title: 'Hinweis',
          description: result.message,
        });
      }
    } catch {
      toast({
        title: 'Fehler',
        description: 'Kindersicherung konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

  const handleInstallFamilyLink = async () => {
    const result = await parentalControlsService.openParentalControlApp();
    if (!result.success) {
      window.open(PLAY_STORE_FAMILY_LINK, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Kindersicherung
        </CardTitle>
        <CardDescription>
          Bildschirmzeit über {platform === 'android' ? 'Family Link' : platform === 'ios' ? 'Bildschirmzeit' : 'Family Link / Bildschirmzeit'} verwalten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isNative && platform === 'android' && notInstalled && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/40 bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Family Link nicht installiert</p>
                <p className="text-xs text-muted-foreground">
                  Um die Bildschirmzeit deines Kindes zu verwalten, installiere zuerst die Google Family Link App.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleInstallFamilyLink}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Im Play Store installieren
              </Button>
            </div>
          </div>
        )}

        {isNative ? (
          <Button onClick={handleOpenControls} disabled={opening} className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            {appName} öffnen
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Richte die Kindersicherung direkt auf dem Gerät deines Kindes ein:
            </p>
            <div className="grid gap-2">
              <a
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.kids.familylink"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Smartphone className="h-4 w-4" />
                Google Family Link (Android)
              </a>
              <p className="text-xs text-muted-foreground ml-6">
                Einstellungen → Digitales Wohlbefinden → Kindersicherung
              </p>
              <a
                href="https://support.apple.com/de-de/HT208982"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Smartphone className="h-4 w-4" />
                Bildschirmzeit (iPhone/iPad)
              </a>
              <p className="text-xs text-muted-foreground ml-6">
                Einstellungen → Bildschirmzeit → Beschränkungen
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Bildschirmzeit-Anfragen deiner Kinder findest du im Tab <strong>„Anfragen"</strong> weiter unten.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
