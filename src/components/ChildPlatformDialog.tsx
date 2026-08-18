import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Apple, Smartphone } from 'lucide-react';
import type { ChildPlatform } from '@/services/parentalControlsService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childName: string;
  onSelect: (platform: ChildPlatform) => void;
}

/** Einmalige Rückfrage, wenn die Plattform des Kindes unbekannt ist. */
export function ChildPlatformDialog({ open, onOpenChange, childName, onSelect }: Props) {
  const choose = (platform: ChildPlatform) => {
    onSelect(platform);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Welches Gerät nutzt {childName}?</DialogTitle>
          <DialogDescription>
            Damit wir dich zur richtigen Stelle bringen: Family Link (Android) oder Apples Bildschirmzeit (iPhone/iPad).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={() => choose('ios')}>
            <Apple className="h-4 w-4 mr-2" />
            iPhone oder iPad
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => choose('android')}>
            <Smartphone className="h-4 w-4 mr-2" />
            Android
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}