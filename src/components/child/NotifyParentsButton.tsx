import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Nachricht, die das Kind an seine Eltern schickt. Bewusst kurz gehalten:
// LernZeit laden, als Elternteil registrieren, Code erstellen.
const SHARE_MESSAGE =
  'Hallo! Ich möchte mit LernZeit lernen und mir Handyzeit verdienen. ' +
  'Bitte lade dir LernZeit (https://lernzeit.app) herunter, registriere dich als Elternteil ' +
  'und erstelle dort einen Code für mich. Den gebe ich dann in meiner App ein.';

const SHARE_URL = 'https://lernzeit.app';

interface NotifyParentsButtonProps {
  className?: string;
  variant?: 'default' | 'outline';
}

/**
 * Bringt ein Kind ohne Elternverknuepfung seine Eltern ins Spiel: Der Text wird
 * ueber den System-Teilen-Dialog geschickt, sonst in die Zwischenablage kopiert.
 */
export function NotifyParentsButton({ className, variant = 'default' }: NotifyParentsButtonProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  // Fallback: Text in die Zwischenablage legen und kurz bestätigen
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      toast({ title: 'Text kopiert – schick ihn deinen Eltern' });
    } catch {
      // Letzter Fallback für Umgebungen ohne Clipboard-API
      try {
        const textarea = document.createElement('textarea');
        textarea.value = SHARE_MESSAGE;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast({ title: 'Text kopiert – schick ihn deinen Eltern' });
      } catch {
        toast({
          title: 'Kopieren nicht möglich',
          description: 'Bitte den Text von Hand an deine Eltern schicken.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'LernZeit', text: SHARE_MESSAGE, url: SHARE_URL });
      } else {
        await copyToClipboard();
      }
    } catch (error) {
      // Abbruch durch das Kind ist kein Fehler; alles andere landet im Kopieren
      if (error instanceof Error && error.name !== 'AbortError') {
        await copyToClipboard();
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button onClick={handleShare} disabled={isSharing} className={className} variant={variant}>
      <Megaphone className="h-4 w-4 mr-2" />
      Eltern Bescheid geben
    </Button>
  );
}
