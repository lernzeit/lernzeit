import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  initAnalytics,
  sekundenSeitErstemAufruf,
  trackBeimVerlassen,
  trackFireAndForget,
  trackPageView,
} from '@/lib/analytics';

/**
 * Wie lange ein Aufruf von `/` wartet, bevor er als `page_view` zaehlt.
 * Nicht angemeldete Besucher leitet `/` sofort auf `/start` weiter; bis
 * 04.10.2026 zaehlte das als zwei Seitenaufrufe.
 */
const WEITERLEITUNG_MS = 2000;

/** Links zu LernZeit im App Store oder bei Google Play (nicht zu anderen Apps). */
function storeZiel(href: string): 'ios' | 'android' | null {
  if (/apps\.apple\.com\/.*id6789603688/i.test(href)) return 'ios';
  if (/play\.google\.com\/store\/apps\/details\?(?:.*&)?id=de\.lernzeit\.app/i.test(href)) return 'android';
  return null;
}

/**
 * Initialisiert die Attribution (UTM/anonymous_id), sendet bei jedem
 * Routenwechsel ein `page_view` und misst seit 04.10.2026 auf der Website:
 *  - jeden Klick auf einen LernZeit-Store-Link (`app_store_click` mit Stelle:
 *    `data-stelle` am Link, sonst der umgebende `data-abschnitt`)
 *  - das Verlassen der Seite (`page_leave` mit Sekunden seit dem ersten Aufruf)
 * Rendert nichts.
 */
const AnalyticsTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    const pfad = location.pathname;
    if (pfad !== '/') {
      trackPageView(pfad);
      return;
    }
    // `/` erst zaehlen, wenn keine Weiterleitung folgt.
    const t = setTimeout(() => {
      if (window.location.pathname === '/') trackPageView('/');
    }, WEITERLEITUNG_MS);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const store = storeZiel(link.href);
      if (!store) return;
      const stelle =
        link.dataset.stelle ||
        (link.closest('[data-abschnitt]') as HTMLElement | null)?.dataset.abschnitt ||
        'sonstige';
      trackFireAndForget('app_store_click', { store, stelle });
    };

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      trackBeimVerlassen('page_leave', {
        sekunden_seit_erstem_aufruf: sekundenSeitErstemAufruf(),
        page_path: window.location.pathname,
      });
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
};

export default AnalyticsTracker;
