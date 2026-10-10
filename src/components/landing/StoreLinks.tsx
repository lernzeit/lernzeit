import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Smartphone } from 'lucide-react';

export const APP_STORE_URL = 'https://apps.apple.com/de/app/lernzeit-lernen-f%C3%BCr-handyzeit/id6789603688';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=de.lernzeit.app&utm_source=website';

type Geraet = 'ios' | 'android' | 'andere';

function erkenneGeraet(): Geraet {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1)) return 'ios';
  return 'andere';
}

/**
 * Links zu den Apps auf der Startseite (10.10.2026: vorher nur das Banner oben,
 * und das nur auf Handys und höchstens alle 30 Tage). iPhone sieht nur den
 * App Store, Android nur Google Play, Computer beide. In den Apps selbst nichts.
 * Klicks zählt der AnalyticsTracker zentral (data-stelle).
 */
export function StoreLinks({ stelle, dunkel = false }: { stelle: string; dunkel?: boolean }) {
  const [geraet, setGeraet] = useState<Geraet>('andere');
  useEffect(() => { setGeraet(erkenneGeraet()); }, []);
  if (Capacitor.isNativePlatform()) return null;

  const links = [
    { id: 'ios', url: APP_STORE_URL, text: 'App Store' },
    { id: 'android', url: PLAY_STORE_URL, text: 'Google Play' },
  ].filter((l) => geraet === 'andere' || l.id === geraet);

  const knopf = dunkel
    ? 'bg-white/10 text-white ring-white/30 hover:bg-white/20'
    : 'bg-white text-[var(--lp-tinte)] ring-[var(--lp-karo)] hover:bg-[var(--lp-heft)]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-[0.9375rem] ${dunkel ? 'text-white/80' : 'text-[var(--lp-leise)]'}`}>Auch als App:</span>
      {links.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          data-stelle={stelle}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold ring-1 ring-inset transition-colors ${knopf}`}
        >
          <Smartphone className="h-4 w-4" />
          {l.text}
        </a>
      ))}
    </div>
  );
}
