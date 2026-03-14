import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACq7in7UFvgQNiS8';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

type TurnstileStatus = 'loading' | 'ready' | 'error';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      execute: (widgetId: string) => void;
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
        if (window.turnstile) {
          clearInterval(check);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(check);
        reject(new Error('Turnstile load timeout'));
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check);
          resolve();
        }
      }, 50);

      setTimeout(() => {
        clearInterval(check);
        reject(new Error('Turnstile init timeout'));
      }, 5000);
    };
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });
}

function waitForElement(id: string, timeout = 5000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const el = document.getElementById(id);
    if (el) {
      resolve(el);
      return;
    }

    const observer = new MutationObserver(() => {
      const nextEl = document.getElementById(id);
      if (nextEl) {
        observer.disconnect();
        resolve(nextEl);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element #${id} not found`));
    }, timeout);
  });
}

export function useTurnstile(containerId: string) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>('loading');
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const tokenResolverRef = useRef<((value: string | null) => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      try {
        setStatus('loading');

        const [, container] = await Promise.all([
          loadTurnstileScript(),
          waitForElement(containerId),
        ]);

        if (cancelled || !window.turnstile) return;

        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // no-op
          }
        }

        container.innerHTML = '';

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => {
            if (!mountedRef.current) return;
            setToken(t);
            setStatus('ready');
            if (tokenResolverRef.current) {
              tokenResolverRef.current(t);
              tokenResolverRef.current = null;
            }
          },
          'expired-callback': () => {
            if (!mountedRef.current) return;
            setToken(null);
          },
          'error-callback': () => {
            if (!mountedRef.current) return;
            setToken(null);
            setStatus('error');
            if (tokenResolverRef.current) {
              tokenResolverRef.current(null);
              tokenResolverRef.current = null;
            }
          },
          theme: 'auto',
          size: 'flexible',
        });

        setStatus('ready');
      } catch (err) {
        console.warn('[Turnstile] Init error:', err);
        if (!mountedRef.current) return;
        setStatus('error');
      }
    };

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // no-op
        }
        widgetIdRef.current = null;
      }

      if (tokenResolverRef.current) {
        tokenResolverRef.current(null);
        tokenResolverRef.current = null;
      }
    };
  }, [containerId]);

  const resetWidget = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // no-op
      }
    }
  }, []);

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (token) return token;

    if (!widgetIdRef.current || !window.turnstile?.execute) {
      return null;
    }

    return new Promise((resolve) => {
      tokenResolverRef.current = resolve;
      try {
        window.turnstile?.execute(widgetIdRef.current as string);
      } catch {
        tokenResolverRef.current = null;
        resolve(null);
      }

      setTimeout(() => {
        if (tokenResolverRef.current) {
          tokenResolverRef.current(null);
          tokenResolverRef.current = null;
        }
      }, 8000);
    });
  }, [token]);

  return { token, status, ensureToken, resetWidget };
}
