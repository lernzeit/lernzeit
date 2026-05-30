import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

const APPSTORE_ID = (import.meta.env.VITE_APPSTORE_ID as string | undefined) ?? '';
const ANDROID_PACKAGE = 'app.lernzeit';

function openStore() {
  let url = '';
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      url = APPSTORE_ID
        ? `https://apps.apple.com/app/id${APPSTORE_ID}?action=write-review`
        : 'https://apps.apple.com/de/app/lernzeit';
    } else if (platform === 'android') {
      url = `market://details?id=${ANDROID_PACKAGE}`;
    } else {
      url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    }
  } catch {
    url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
}

interface RatingPromptDialogProps {
  open: boolean;
  onResponse: (response: 'rated' | 'later' | 'dismissed') => void;
}

export function RatingPromptDialog({ open, onResponse }: RatingPromptDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onResponse('later');
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Magst du LernZeit?
          </DialogTitle>
          <DialogDescription>
            Eine kurze Bewertung im App Store hilft uns enorm – und anderen Eltern, uns zu finden.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => {
              openStore();
              onResponse('rated');
            }}
          >
            <Star className="mr-2 h-4 w-4" /> Jetzt bewerten
          </Button>
          <Button variant="outline" onClick={() => onResponse('later')}>
            Später erinnern
          </Button>
          <Button variant="ghost" onClick={() => onResponse('dismissed')}>
            Nein, danke
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}