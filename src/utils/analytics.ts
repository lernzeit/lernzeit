/**
 * Lightweight analytics wrapper.
 * Forwards events to window.gtag / window.dataLayer if present, otherwise logs.
 * Safe to call in any environment (no-ops on SSR).
 */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  try {
    if (typeof window === 'undefined') return;
    const payload = { event: name, ...props };
    const w = window as any;
    if (typeof w.gtag === 'function') {
      w.gtag('event', name, props);
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(payload);
    }
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.info('[analytics]', name, props);
    }
  } catch {
    /* never let analytics break the app */
  }
}