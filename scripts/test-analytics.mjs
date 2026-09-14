/**
 * Prueft die beiden Zusagen im Tracking, die nicht brechen duerfen:
 *
 *   1. Kein Event eines Kindes erreicht jemals eine Werbeplattform.
 *   2. Ein Anzeigenklick wird genau einmal erfasst, mit einem Elternkonto
 *      verknuepft — und bei einem Kinderkonto geloescht statt verknuepft.
 *
 * Warum ein eigenes Skript und kein Testframework: Das Projekt hat fuer
 * `src/` keinen Unit-Runner, nur Playwright fuer e2e. Eine Regel, an der
 * eine veroeffentlichte Datenschutzzusage haengt, sollte trotzdem
 * nachpruefbar sein, ohne dass jemand erst ein Framework einrichtet.
 *
 *   node scripts/test-analytics.mjs
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
const klickZeilen = [];
const rpcAufrufe = [];
globalThis.__sb = {
  auth: { getSession: async () => ({ data: sitzung ? { session: { user: { id: sitzung } } } : null }) },
  rpc: async (name, args) => { rpcAufrufe.push({ name, args }); return { error: null }; },
  from: (tabelle) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rolle ? { role: rolle } : null }) }) }),
    insert: (zeile) => {
      if (tabelle === 'ad_attribution') {
        klickZeilen.push(zeile);
        // Der Produktivcode haengt .then() an den Insert statt ihn zu awaiten.
        return { then: (fn) => { fn({ error: null }); return Promise.resolve({ error: null }); } };
      }
      geschrieben.push(zeile);
      return Promise.resolve({ error: null });
    },
  }),
};

const { track, captureAdClick } = await import(bundle);
const dataLayer = () => globalThis.window.dataLayer;
const zuruecksetzen = () => {
  globalThis.window.dataLayer = [];
  geschrieben.length = 0;
  klickZeilen.length = 0;
  rpcAufrufe.length = 0;
};
const besuche = (suche) => { globalThis.window.location.search = suche; };
const warte = () => new Promise((f) => setImmediate(f));

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

/* --- Anzeigenklicks ------------------------------------------------- */

zuruecksetzen(); speicher.clear();
besuche('?gbraid=abc123&utm_campaign=test');
captureAdClick();
pruefe(klickZeilen.length === 1, 'Klick mit gbraid wird erfasst');
pruefe(klickZeilen[0]?.gbraid === 'abc123', 'gbraid landet in der Zeile — nicht nur gclid');
pruefe(klickZeilen[0]?.gclid === null, 'gclid bleibt leer, wenn keins uebergeben wurde');

zuruecksetzen();
captureAdClick();
pruefe(klickZeilen.length === 0, 'Neuladen derselben Adresse legt keine zweite Zeile an');

zuruecksetzen();
besuche('?gclid=xyz789');
captureAdClick();
pruefe(klickZeilen.length === 1, 'Ein spaeterer Klick auf eine andere Anzeige zaehlt neu');

zuruecksetzen(); rolle = 'parent'; sitzung = 'eltern-9';
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(rpcAufrufe.some((r) => r.name === 'link_ad_attribution'), 'Elternkonto: Klick wird verknuepft');

zuruecksetzen();
await track('page_view', {});
await warte();
pruefe(rpcAufrufe.length === 0, 'Verknuepfung passiert nur einmal je Konto');

zuruecksetzen(); speicher.clear();
besuche('?gclid=kind-klick');
captureAdClick();
zuruecksetzen(); rolle = 'child'; sitzung = 'kind-9';
await track('sign_up_completed', { role: 'child' });
await warte();
pruefe(rpcAufrufe.some((r) => r.name === 'forget_ad_attribution'), 'Kinderkonto: Klick wird geloescht, nicht verknuepft');
pruefe(!rpcAufrufe.some((r) => r.name === 'link_ad_attribution'), 'Kinderkonto: keine Verknuepfung');

await rm(dir, { recursive: true, force: true });
console.log(fehler === 0 ? '\nAlle Faelle bestanden.' : `\n${fehler} FEHLGESCHLAGEN`);
process.exit(fehler ? 1 : 0);
