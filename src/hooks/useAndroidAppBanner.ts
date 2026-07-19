import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lernzeit_android_banner_dismissed';
const DISMISS_DAYS = 30;

const MARKETING_ROUTES = new Set([
  '/',
  '/start',
  '/support',
  '/impressum',
  '/datenschutz',
  '/nutzungsbedingungen',
]);

export function useAndroidAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Not in native Capacitor shell
      if ((window as any).Capacitor?.isNativePlatform?.()) return;

      // Not in installed PWA
      if (window.matchMedia?.('(display-mode: standalone)').matches) return;
      if ((window.navigator as any).standalone) return;

      const ua = window.navigator.userAgent || '';
      // Android browser, not Android WebView (which contains "; wv)")
      if (!/Android/i.test(ua)) return;
      if (/; wv\)/i.test(ua)) return;

      // Only on marketing routes
      if (!MARKETING_ROUTES.has(window.location.pathname)) return;

      // Respect prior dismissal
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const until = Number(raw);
        if (Number.isFinite(until) && until > Date.now()) return;
      }

      // Delay slightly so it doesn't fight LCP
      const t = window.setTimeout(() => setVisible(true), 600);
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
    setVisible(false);
  };

  return { visible, dismiss };
}