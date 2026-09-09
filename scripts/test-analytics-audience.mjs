/**
 * Prueft die eine Zusage im Tracking, die nicht brechen darf:
 * Kein Event eines Kindes erreicht jemals eine Werbeplattform.
 *
 * Warum ein eigenes Skript und kein Testframework: Das Projekt hat fuer
 * `src/` keinen Unit-Runner, nur Playwright fuer e2e. Eine Regel, an der
 * eine veroeffentlichte Datenschutzzusage haengt, sollte trotzdem
 * nachpruefbar sein, ohne dass jemand erst ein Framework einrichtet.
 *
 *   node scripts/test-analytics-audience.mjs
 */
import * as esbuild from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stubs = {
  name: 'stubs',
  setup(build) {
    build.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'stub' }));
    build.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'capacitor', namespace: 'stub' }));
    build.onResolve({ filter: /^@capacitor\/preferences$/ }, () => ({ path: 'preferences', namespace: 'stub' }));
    build.onResolve({ filter: /^@\/integrations\// }, () => ({ path: 'types', namespace: 'stub' }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({
      loader: 'js',
      contents: {
        supabase: 'export const supabase = globalThis.__sb;',
        capacitor: 'export const Capacitor = { isNativePlatform: () => false, getPlatform: () => "web" };',
        preferences: 'export const Preferences = { get: async () => ({ value: null }), set: async () => {} };',
        types: 'export {};',
      }[path],
    }));
  },
};

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-analytics-'));
const bundle = join(dir, 'analytics.mjs');
await esbuild.build({
  entryPoints: ['src/lib/analytics.ts'],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  plugins: [stubs],
  logLevel: 'error',
});

let fehler = 0;
const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK   ' : 'FEHL '}${text}`);
  if (!bedingung) fehler++;
};

const speicher = new Map();
globalThis.localStorage = {
  getItem: (k) => speicher.get(k) ?? null,
  setItem: (k, v) => speicher.set(k, v),
  removeItem: (k) => speicher.delete(k),
};
globalThis.window = { location: { pathname: '/', search: '' }, dataLayer: [] };
globalThis.document = { referrer: '' };

let rolle = 'parent';
let sitzung = 'user-1';
const geschrieben = [];
globalThis.__sb = {
  auth: { getSession: async () => ({ data: sitzung ? { session: { user: { id: sitzung } } } : null }) },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rolle ? { role: rolle } : null }) }) }),
    insert: async (zeile) => { geschrieben.push(zeile); return { error: null }; },
  }),
};

const { track } = await import(bundle);
const dataLayer = () => globalThis.window.dataLayer;
const zuruecksetzen = () => { globalThis.window.dataLayer = []; geschrieben.length = 0; };

zuruecksetzen();
await track('sign_up_completed', { role: 'child', method: 'username' });
pruefe(dataLayer().length === 0, 'Registrierung als Kind erreicht den dataLayer nicht');
pruefe(geschrieben.length === 1, 'wird aber weiterhin in analytics_events geschrieben (erste Partei, EU)');

zuruecksetzen(); rolle = 'child'; sitzung = 'kind-1';
await track('first_learning_session', {});
pruefe(dataLayer().length === 0, 'Angemeldetes Kind: kein Event nach draussen');

zuruecksetzen(); rolle = 'parent'; sitzung = 'eltern-1';
await track('subscription_purchased', { plan: 'premium' });
pruefe(dataLayer().length === 1, 'Elternkonto: Conversion geht durch');

zuruecksetzen(); rolle = 'parent'; sitzung = null;
await track('page_view', {});
pruefe(dataLayer().length === 1, 'Anonymer Besucher wird gemessen');

zuruecksetzen(); rolle = null; sitzung = 'unbekannt-1';
await track('sign_up_completed', { method: 'email' });
pruefe(dataLayer().length === 0, 'Rolle unbekannt: im Zweifel gesperrt');

zuruecksetzen(); rolle = 'parent'; sitzung = 'eltern-2';
await track('page_view', {});
const nachEltern = dataLayer().length;
zuruecksetzen(); rolle = 'child'; sitzung = 'kind-2';
await track('page_view', {});
pruefe(nachEltern === 1 && dataLayer().length === 0, 'Kontowechsel im selben Browser: Merkposten greift nicht zu weit');

zuruecksetzen(); rolle = 'parent'; sitzung = 'eltern-2';
await track('page_view', { role: 'child' });
pruefe(dataLayer().length === 0, 'Elternkonto, aber Event nennt role=child: trotzdem gesperrt');

await rm(dir, { recursive: true, force: true });
console.log(fehler === 0 ? '\nAlle Faelle bestanden.' : `\n${fehler} FEHLGESCHLAGEN`);
process.exit(fehler ? 1 : 0);
