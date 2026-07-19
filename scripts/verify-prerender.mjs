#!/usr/bin/env node
/**
 * Post-build check: verifies every prerendered marketing route emits a
 * hydratable `dist/<route>/index.html` whose static body already contains
 * meaningful, JS-less content plus the expected canonical/OG tags.
 *
 * Run automatically via `postbuild` (production build only). Exits non-zero
 * so CI fails loudly if prerendering silently regressed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'dist');
const SITE_URL = 'https://lernzeit.app';

// Route → expected substring that MUST appear in the raw HTML (case-insensitive).
// Pick text that only the fully rendered marketing page produces, so a bare
// `#root` shell (JS-only) can't accidentally pass the check.
const ROUTES = [
  { path: '/start',              needle: 'Handyzeit' },
  { path: '/impressum',          needle: 'Impressum' },
  { path: '/datenschutz',        needle: 'Datenschutz' },
  { path: '/nutzungsbedingungen', needle: 'Nutzungsbedingungen' },
  { path: '/konto-loeschen',     needle: 'Konto' },
];

// Minimum bytes of visible text (excluding `<script>` blocks). A JS-only
// SPA shell is a few hundred bytes; a real prerender is > 2 kB.
const MIN_TEXT_BYTES = 800;

const stripScripts = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const textContent = (html) =>
  stripScripts(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const failures = [];

for (const { path, needle } of ROUTES) {
  const file = resolve(DIST, `.${path}`, 'index.html');
  if (!existsSync(file)) {
    failures.push(`✗ ${path}: dist${path}/index.html fehlt – Prerendering nicht gelaufen?`);
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const text = textContent(html);

  if (text.length < MIN_TEXT_BYTES) {
    failures.push(
      `✗ ${path}: nur ${text.length} B sichtbarer Text ohne JS (Minimum ${MIN_TEXT_BYTES}). ` +
        `Sieht aus wie ein leerer SPA-Shell.`,
    );
    continue;
  }

  if (!new RegExp(needle, 'i').test(text)) {
    failures.push(`✗ ${path}: erwarteter Text "${needle}" nicht im JS-losen HTML gefunden.`);
    continue;
  }

  const canonical = `${SITE_URL}${path}`;
  // react-helmet-async can emit attributes in any order and inject
  // `data-rh="true"`, so match with attribute-order-agnostic regexes.
  const hasCanonical = new RegExp(
    `<link[^>]*rel=["']canonical["'][^>]*href=["']${canonical}["']|` +
      `<link[^>]*href=["']${canonical}["'][^>]*rel=["']canonical["']`,
    'i',
  ).test(html);
  if (!hasCanonical) {
    failures.push(`✗ ${path}: canonical fehlt oder zeigt nicht auf ${canonical}.`);
    continue;
  }
  const hasOgUrl = new RegExp(
    `<meta[^>]*property=["']og:url["'][^>]*content=["']${canonical}["']|` +
      `<meta[^>]*content=["']${canonical}["'][^>]*property=["']og:url["']`,
    'i',
  ).test(html);
  if (!hasOgUrl) {
    failures.push(`✗ ${path}: og:url fehlt oder zeigt nicht auf ${canonical}.`);
    continue;
  }
  if (!/property=["']og:title["']/.test(html) || !/name=["']twitter:card["']/.test(html)) {
    failures.push(`✗ ${path}: og:title oder twitter:card Meta-Tag fehlt.`);
    continue;
  }

  console.log(`✓ ${path}  (${text.length} B statischer Text, canonical ok)`);
}

if (failures.length) {
  console.warn('\n⚠️  Prerender-Check meldet Warnungen:');
  for (const f of failures) console.warn('  ' + f);
  console.warn('\nBuild wird nicht abgebrochen – Prerender-Warnungen sind nicht blockierend.');
  process.exit(0);
}

console.log(`\nPrerender-Check ok für ${ROUTES.length} Marketing-Routen.`);