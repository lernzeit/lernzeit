import { BookOpen, X } from 'lucide-react';
import { useAppStoreBanner } from '@/hooks/useAndroidAppBanner';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=de.lernzeit.app&utm_source=web_banner';
const APP_STORE_URL =
  'https://apps.apple.com/de/app/lernzeit-lernen-f%C3%BCr-handyzeit/id6789603688';

export function AndroidAppBanner() {
  const { platform, dismiss } = useAppStoreBanner();

  if (!platform) return null;

  const isIOS = platform === 'ios';
  const storeUrl = isIOS ? APP_STORE_URL : PLAY_STORE_URL;

  return (
    <div
      role="complementary"
      aria-label={isIOS ? 'LernZeit iOS-App verfügbar' : 'LernZeit Android-App verfügbar'}
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md shadow-sm animate-in slide-in-from-top duration-300 motion-reduce:animate-none pt-safe-top"
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hinweis schließen"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {isIOS ? 'LernZeit-App für iPhone' : 'LernZeit-App für Android'}
          </p>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            Schneller starten. App immer dabei.
          </p>
        </div>

        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isIOS ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
              <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.1 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.3 5.5c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
              <path d="M3.6 1.7C3.2 2 3 2.5 3 3.1v17.8c0 .6.2 1.1.6 1.4l10-10-10-10.6zM14.5 12.9L5.1 22.6c.3.1.7.1 1 0l11.1-6.3-2.7-3.4zM20.6 10.9l-3-1.7-3.1 3.8 3.1 3.6 3-1.7c1.1-.6 1.1-2.4 0-3zM14.5 11.1L16.2 9 5.1 2.4c-.3-.2-.7-.2-1 0l10.4 8.7z"/>
            </svg>
          )}
          {isIOS ? 'Im App Store öffnen' : 'Im Play Store öffnen'}
        </a>
      </div>
    </div>
  );
}

export default AndroidAppBanner;