import { createRoot } from 'react-dom/client'
import './index.css'

// Capture ?ref=CODE early and persist in localStorage (30 days)
try {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
    localStorage.setItem(
      'lernzeit_referral_code',
      JSON.stringify({ code: ref.toUpperCase(), expires: Date.now() + 30 * 86400000 })
    );
  }
} catch { /* ignore */ }

declare global {
  interface Window {
    __LERNZEIT_APP_MOUNTED__?: boolean;
  }
}

const BOOT_TIMEOUT_MS = 12000;

const showBootError = (title: string, message: string) => {
  const root = document.getElementById('root');
  if (!root) return;

  // Use DOM API + textContent to prevent XSS from error messages that may contain HTML
  root.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.setAttribute('style', 'padding:2rem;text-align:center;font-family:sans-serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;');
  const h2 = document.createElement('h2');
  h2.setAttribute('style', 'margin:0 0 0.75rem 0;');
  h2.textContent = title;
  const p = document.createElement('p');
  p.setAttribute('style', 'color:#666;margin:0 0 1.25rem 0;max-width:28rem;');
  p.textContent = message;
  const btn = document.createElement('button');
  btn.setAttribute('style', 'padding:0.5rem 1.5rem;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;');
  btn.textContent = 'Neu laden';
  btn.addEventListener('click', () => location.reload());
  wrapper.appendChild(h2);
  wrapper.appendChild(p);
  wrapper.appendChild(btn);
  root.appendChild(wrapper);
};

const isAppMounted = () => window.__LERNZEIT_APP_MOUNTED__ === true;

const markAppMounted = () => {
  window.__LERNZEIT_APP_MOUNTED__ = true;
};

// Global error handlers to prevent silent white screens on mobile
window.addEventListener('error', (event) => {
  console.error('🔴 Global error:', event.message, event.filename, event.lineno);
  if (!isAppMounted()) {
    showBootError('Ein Fehler ist aufgetreten', event.message || 'Unbekannter Fehler beim Start');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled rejection:', event.reason);
  if (!isAppMounted()) {
    const reason = event.reason instanceof Error ? event.reason.message : 'Unbekannter Promise-Fehler';
    showBootError('Ein Fehler ist aufgetreten', reason);
  }
});

// Detect if running inside Capacitor native shell
const isNativePlatform = () => {
  try {
    return typeof (window as any)?.Capacitor?.isNativePlatform === 'function'
      ? (window as any).Capacitor.isNativePlatform()
      : false;
  } catch {
    return false;
  }
};

// Only register service worker on web, NOT on native Capacitor
// Service workers conflict with Capacitor's WebView and can cause white screens
if ('serviceWorker' in navigator && !isNativePlatform()) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(registerSW, { timeout: 5000 });
  } else {
    setTimeout(registerSW, 3000);
  }
} else if (isNativePlatform()) {
  // Unregister any existing service workers on native to prevent caching issues
  navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('SW unregistered for native platform');
    }
  }).catch(() => { /* ignore */ });
}

// Detect stuck boot (e.g. import/init errors before first render)
window.setTimeout(() => {
  if (!isAppMounted()) {
    console.error('🔴 Boot timeout: app did not mount within expected time');
    showBootError(
      'App startet nicht',
      'Der Start dauert zu lange. Bitte neu laden oder App vollständig schließen und erneut öffnen.'
    );
  }
}, BOOT_TIMEOUT_MS);

const bootstrap = async () => {
  try {
    // On native platforms, init storage BEFORE importing App (which creates supabase client)
    if (isNativePlatform()) {
      const { initNativeStorage } = await import('./services/nativeStorageAdapter');
      await initNativeStorage();
      console.log('✅ Native storage initialized');

      // Wire up Universal/App Link handling (lernzeit.app/?ref=CODE)
      try {
        const { initDeepLinkHandler } = await import('./services/deepLinkHandler');
        await initDeepLinkHandler();
      } catch (e) {
        console.warn('Deep link handler init failed:', e);
      }
    }

    const { default: App } = await import('./App.tsx');
    const { HelmetProvider } = await import('react-helmet-async');
    const rootEl = document.getElementById('root');

    if (!rootEl) {
      throw new Error('Root element not found');
    }

    createRoot(rootEl).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
    markAppMounted();
  } catch (err) {
    console.error('🔴 Failed to bootstrap app:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der App';
    showBootError('App konnte nicht geladen werden', errorMessage);
  }
};

void bootstrap();
