import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lernzeit_app_banner_dismissed';
const DISMISS_DAYS = 30;

export type BannerPlatform = 'android' | 'ios';

const MARKETING_ROUTES = new Set([
  '/',
  '/start',
  '/support',
  '/impressum',
  '/datenschutz',
  '/nutzungsbedingungen',
]);

export function useAppStoreBanner() {
  const [platform, setPlatform] = useState<BannerPlatform | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Not in native Capacitor shell
      if ((window as any).Capacitor?.isNativePlatform?.()) return;

      // Not in installed PWA
      if (window.matchMedia?.('(display-mode: standalone)').matches) return;
      if ((window.navigator as any).standalone) return;

      const ua = window.navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua) && !/; wv\)/i.test(ua);
      // iPhone/iPad (incl. iPadOS reporting as Mac with touch support)
      const isIOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);

      const detected: BannerPlatform | null = isAndroid ? 'android' : isIOS ? 'ios' : null;
      if (!detected) return;

      // Only on marketing routes
      if (!MARKETING_ROUTES.has(window.location.pathname)) return;

      // Respect prior dismissal
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const until = Number(raw);
        if (Number.isFinite(until) && until > Date.now()) return;
      }

      // Delay slightly so it doesn't fight LCP
      const t = window.setTimeout(() => setPlatform(detected), 600);
      return () => window.clearTimeout(t);
    } catch {
      /* noop */
    }
  }, []);

  const dismiss = () => {
    try {
      const until = Date.now() + DISMISS_DAYS * 86400_000;
      window.localStorage.setItem(STORAGE_KEY, String(until));
    } catch {
      /* noop */
    }
    setPlatform(null);
  };

  return { platform, visible: platform !== null, dismiss };
}

export const useAndroidAppBanner = useAppStoreBanner;