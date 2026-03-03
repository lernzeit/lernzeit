import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ExternalLink, Smartphone, Info } from 'lucide-react';
import { parentalControlsService } from '@/services/parentalControlsService';
import { useToast } from '@/hooks/use-toast';

export function ScreenTimeWidget() {
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);
  
  const isNative = parentalControlsService.isNativePlatform();
  const platform = parentalControlsService.getPlatform();
  const appName = parentalControlsService.getParentalControlAppName();

  const handleOpenControls = async () => {
    setOpening(true);
    try {
      const result = await parentalControlsService.openParentalControlApp();
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
