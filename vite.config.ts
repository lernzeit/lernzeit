import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import prerender from "@prerenderer/rollup-plugin";
import PuppeteerRenderer from "@prerenderer/renderer-puppeteer";

// Marketing-Routen, die für Crawler ohne JavaScript als statisches HTML
// vorgerendert werden. Interaktive Routen (App/Login/Dashboard) bleiben
// weiterhin klassische SPA.
const PRERENDER_ROUTES = ['/start', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/support'];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'app-icon-1024.png'],
      manifest: {
        name: 'LernZeit - Verdiene Dir Bildschirm-Zeit',
        short_name: 'LernZeit',
        description: 'Verdiene Handyzeit durch das Lösen von Aufgaben. Spielerisches Lernen für alle Klassenstufen.',
        theme_color: '#22d3ee',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'kids'],
        lang: 'de',
        dir: 'ltr',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'app-icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/home.png',
            sizes: '1290x2796',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Startseite'
          },
          {
            src: 'screenshots/categories.png',
            sizes: '1290x2796',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Fächerauswahl'
          }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fsmgynpdfxkaiiuguqyr\.supabase\.co/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ,
    // Prerendering nur beim Production-Build aktivieren. Wenn Puppeteer/Chromium
    // in einer restriktiven Build-Umgebung nicht verfügbar ist, kann das Feature
    // per `PRERENDER=false` deaktiviert werden.
    mode === 'production' && process.env.PRERENDER !== 'false' && prerender({
      routes: PRERENDER_ROUTES,
      renderer: new PuppeteerRenderer({
        renderAfterTime: 2000,
        headless: true,
        maxConcurrentRoutes: 2,
        // Chromium in CI-Sandboxen (Docker, Codemagic) braucht diese Flags.
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      }),
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting to reduce initial bundle size
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/sonner') || id.includes('node_modules/canvas-confetti')) {
            return 'vendor-ui-extras';
          }
        },
      },
    },
  },
}));
