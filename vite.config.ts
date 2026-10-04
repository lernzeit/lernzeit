import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { sichtbareArtikel } from "./src/content/ratgeber/index";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import prerender from "@prerenderer/rollup-plugin";
import PuppeteerRenderer from "@prerenderer/renderer-puppeteer";

// Marketing-Routen, die für Crawler ohne JavaScript als statisches HTML
// vorgerendert werden. Interaktive Routen (App/Login/Dashboard) bleiben
// weiterhin klassische SPA.
// Ratgeber: /ratgeber plus alle sichtbaren Artikel, automatisch aus den Daten.
const RATGEBER_ARTIKEL_ROUTES = sichtbareArtikel().map((a) => `/ratgeber/${a.slug}`);
const PRERENDER_ROUTES = ['/start', '/impressum', '/datenschutz', '/nutzungsbedingungen', '/support', '/konto-loeschen', '/faq', '/ratgeber', ...RATGEBER_ARTIKEL_ROUTES];

// Schreibt nach dem Build die Ratgeber-Routen für scripts/verify-prerender.mjs
// und ergänzt dist/sitemap.xml um /ratgeber und alle sichtbaren Artikel
// (nur wenn es mindestens einen Artikel gibt; sonst ist /ratgeber noindex).
const ratgeberBuildPlugin = (): Plugin => ({
  name: 'ratgeber-routen',
  apply: 'build',
  closeBundle() {
    const dist = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(dist)) return;
    const artikel = sichtbareArtikel();
    fs.writeFileSync(
      path.join(dist, 'ratgeber-routes.json'),
      JSON.stringify(artikel.length ? ['/ratgeber', ...RATGEBER_ARTIKEL_ROUTES] : []),
    );
    const sitemap = path.join(dist, 'sitemap.xml');
    if (artikel.length && fs.existsSync(sitemap)) {
      const eintraege = [
        `  <url>\n    <loc>https://lernzeit.app/ratgeber</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
        ...artikel.map((a) =>
          `  <url>\n    <loc>https://lernzeit.app/ratgeber/${a.slug}</loc>\n    <lastmod>${(a.aktualisiert ?? a.datum).slice(0, 10)}</lastmod>\n    <priority>0.6</priority>\n  </url>`),
      ].join('\n');
      const xml = fs.readFileSync(sitemap, 'utf8').replace('</urlset>', `${eintraege}\n</urlset>`);
      fs.writeFileSync(sitemap, xml);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    ratgeberBuildPlugin(),
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
        // Der Service Worker beantwortet sonst JEDE Navigation aus dem Cache mit
        // index.html. Für /.well-known/* ist das irreführend: Ein Aufruf von
        // /.well-known/assetlinks.json landete dadurch auf der 404-Seite der App,
        // obwohl der Server die Datei korrekt ausliefert — und liess einen
        // funktionierenden Deep-Link-Aufbau kaputt aussehen.
        //
        // Google und Apple lesen diese Dateien serverseitig und waren nie
        // betroffen; die Ausnahme dient der Nachpruefbarkeit im Browser.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/\.well-known\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ein alter Service Worker (mit Supabase-Caching) darf nicht weiterlaufen:
        // sofort aktivieren, Clients übernehmen und veraltete Caches löschen.
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Supabase (Edge Functions, REST, Auth) NIEMALS cachen – sonst
            // liefert ein alter Worker immer wieder dieselben Fragen aus.
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
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
    mode === 'production' && process.env.PRERENDER !== 'false' && (prerender({
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
      // Garantiere pro Route korrekte canonical/og:url-Tags, unabhängig davon,
      // ob react-helmet-async während des Prerenderings die Tags injiziert hat.
      postProcess(renderedRoute: any) {
        const site = 'https://lernzeit.app';
        const canonical = `${site}${renderedRoute.route}`;
        let html: string = renderedRoute.html || '';
        // Alle vorhandenen canonical/og:url Tags entfernen
        html = html.replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
        html = html.replace(/<meta[^>]*property=["']og:url["'][^>]*>\s*/gi, '');
        // Frische Tags direkt vor </head> einfügen
        const inject =
          `<link rel="canonical" href="${canonical}" />` +
          `<meta property="og:url" content="${canonical}" />`;
        if (/<\/head>/i.test(html)) {
          html = html.replace(/<\/head>/i, `${inject}</head>`);
        } else {
          html = inject + html;
        }
        renderedRoute.html = html;
        return renderedRoute;
      },
    }) as any),
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
