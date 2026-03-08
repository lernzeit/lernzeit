import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handlers to prevent silent white screens on mobile
window.addEventListener('error', (event) => {
  console.error('🔴 Global error:', event.message, event.filename, event.lineno);
  // Show visible error on screen as last resort
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="padding:2rem;text-align:center;font-family:sans-serif;">
      <h2>Ein Fehler ist aufgetreten</h2>
      <p style="color:#666;margin:1rem 0;">${event.message || 'Unbekannter Fehler'}</p>
      <button onclick="location.reload()" style="padding:0.5rem 1.5rem;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">Neu laden</button>
    </div>`;
  }
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled rejection:', event.reason);
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

// Render with error safety
try {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  } else {
    console.error('🔴 Root element not found');
  }
} catch (err) {
  console.error('🔴 Failed to render app:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:2rem;text-align:center;font-family:sans-serif;">
      <h2>App konnte nicht geladen werden</h2>
      <button onclick="location.reload()" style="padding:0.5rem 1.5rem;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">Neu laden</button>
    </div>`;
  }
}
