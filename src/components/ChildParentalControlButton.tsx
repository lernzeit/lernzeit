import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Apple, ExternalLink, Info, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChildPlatformDialog } from '@/components/ChildPlatformDialog';
import { parentalControlsService, type ChildPlatform } from '@/services/parentalControlsService';

interface Props {
  childName: string;
  platform: ChildPlatform | null;
  onPlatformSelected: (platform: ChildPlatform) => void;
  minutes?: number;
  className?: string;
}

/**
 * Absprung-Schaltfläche pro Kind. Das Ziel richtet sich nach der Plattform des KINDES,
 * die Plattform des Elternteils entscheidet nur, ob ein Absprung möglich ist.
 * Nutzt die bestehende Logik in parentalControlsService (keine Duplikate).
 */
export function ChildParentalControlButton({
  childName,
  platform,
  onPlatformSelected,
  minutes,
  className,
}: Props) {
  const { toast } = useToast();
  const [askOpen, setAskOpen] = useState(false);
  const target = parentalControlsService.getTargetForChild(platform, childName);

  const handleOpen = async () => {
    const result = await parentalControlsService.openForChild(platform, minutes);
    if (!result.success) {
      toast({
        title: `${target.appName} konnte nicht geöffnet werden`,
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  // Plattform unbekannt → einmalig nachfragen
  if (target.kind === 'manual') {
    return (
      <div className={className}>
        <Button variant="outline" size="sm" onClick={() => setAskOpen(true)}>
          <Info className="h-4 w-4 mr-2" />
          Gerät von {childName} angeben
        </Button>
        <ChildPlatformDialog
          open={askOpen}
          onOpenChange={setAskOpen}
          childName={childName}
          onSelect={onPlatformSelected}
        />
      </div>
    );
  }

  // Kein technischer Weg (Kind iOS, Elternteil Android) oder Web → nur Hinweis
  if (!target.canOpen) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ''}`}>{target.hint}</p>
    );
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        {target.kind === 'screen_time' ? (
          <Apple className="h-4 w-4 mr-2" />
        ) : (
          <Smartphone className="h-4 w-4 mr-2" />
        )}
        {target.buttonLabel}
        <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
      </Button>
      <p className="text-xs text-muted-foreground mt-1">{target.hint}</p>
    </div>
  );
}