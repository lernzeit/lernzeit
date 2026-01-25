import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Defer service worker registration to after page is interactive
// This improves initial load performance by not blocking the main thread
if ('serviceWorker' in navigator) {
  // Use requestIdleCallback for non-critical SW registration
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  };

  // Defer until page is fully loaded and idle
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(registerSW, { timeout: 5000 });
  } else {
    // Fallback: register after a delay
    setTimeout(registerSW, 3000);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
