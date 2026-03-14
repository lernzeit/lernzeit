import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACq7in7UFvgQNiS8';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Turnstile load timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error('Turnstile init timeout')); }, 5000);
    };
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });
}

function waitForElement(id: string, timeout = 5000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const el = document.getElementById(id);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const el = document.getElementById(id);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error(`Element #${id} not found`)); }, timeout);
  });
}

export function useTurnstile(containerId: string) {
  const [token, setToken] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      try {
        // Wait for both script AND container to be ready
        const [, container] = await Promise.all([
          loadTurnstileScript(),
          waitForElement(containerId),
        ]);

        if (cancelled || !window.turnstile) return;

        // Clear any previous widget
        if (widgetIdRef.current) {
          try { window.turnstile.remove(widgetIdRef.current); } catch {}
        }
        container.innerHTML = '';

        console.log('[Turnstile] Rendering widget into', containerId);

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => {
            console.log('[Turnstile] Token received');
            if (mountedRef.current) setToken(t);
          },
          'expired-callback': () => {
            console.log('[Turnstile] Token expired');
            if (mountedRef.current) setToken(null);
          },
          'error-callback': (err: unknown) => {
            console.warn('[Turnstile] Error callback:', err);
            if (mountedRef.current) setToken(null);
          },
          theme: 'auto',
          size: 'flexible',
        });

        console.log('[Turnstile] Widget rendered, id:', widgetIdRef.current);
      } catch (err) {
        console.warn('[Turnstile] Init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [containerId]);

  const resetWidget = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch {}
    }
  }, []);

  return { token, resetWidget };
}
