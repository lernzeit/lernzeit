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

const { track } = await import(bundle);
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

/* --- Anzeigenklicks -------------------------------------------------- */
/*
 * Vorgabe der Kanzlei vom 21.09.2026: vor der Einwilligung KEINE eigene
 * Werbe-Zwischenablage — weder im localStorage noch im Arbeitsspeicher.
 * Gelesen wird erst danach, und zwar aus der Adresszeile dieses Augenblicks.
 *
 * Diese Faelle pruefen genau das: dass beim Ankommen nichts entsteht, dass
 * die Kennung verloren ist, wenn sie zum Zeitpunkt der Einwilligung nicht
 * mehr in der Adresse steht, und dass Meta nirgends mehr auftaucht.
 */

const { setWerbeEinwilligung, captureAttribution, getAttribution } = await import(bundle);

zuruecksetzen(); speicher.clear();
besuche('?gclid=abc123&gbraid=def456&utm_campaign=test');
captureAttribution();
pruefe(klickZeilen.length === 0, 'Beim Ankommen wird nichts verbucht');
pruefe(
  !JSON.stringify([...speicher.values()]).includes('abc123'),
  'Die Klick-Kennung landet nirgends im Geraetespeicher',
);
pruefe(
  getAttribution().utm_campaign === 'test' && !getAttribution().gclid,
  'utm bleibt gespeichert, gclid nicht',
);

zuruecksetzen(); rolle = 'parent'; sitzung = 'eltern-9';
setWerbeEinwilligung(false);
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(klickZeilen.length === 0, 'Ohne Einwilligung wird auch bei Eltern nichts gespeichert');

zuruecksetzen();
setWerbeEinwilligung(true);
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(klickZeilen.length === 1, 'Mit Einwilligung wird bei der Eltern-Registrierung verbucht');
pruefe(klickZeilen[0]?.user_id === 'eltern-9', 'Die Zeile haengt direkt am Elternkonto');
pruefe(klickZeilen[0]?.gclid === 'abc123', 'gclid kommt aus der Adresszeile');
pruefe(klickZeilen[0]?.gbraid === 'def456', 'gbraid ebenso — nicht nur gclid');
pruefe(!('fbclid' in (klickZeilen[0] ?? {})), 'Meta ist abgeschaltet: kein fbclid in der Zeile');
pruefe(!('anonymous_id' in (klickZeilen[0] ?? {})), 'Keine anonyme Kennung mehr');

zuruecksetzen();
await track('page_view', {});
await warte();
pruefe(klickZeilen.length === 0, 'Ein zweites Ereignis verbucht nicht noch einmal');

/* Der Preis der Vorgabe, hier ausdruecklich festgehalten. */
zuruecksetzen(); speicher.clear();
besuche('?gclid=nur-auf-der-landeseite');
captureAttribution();
besuche('?auth=true');
rolle = 'parent'; sitzung = 'eltern-11';
setWerbeEinwilligung(true);
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(
  klickZeilen.length === 0,
  'Ist die Kennung aus der Adresse verschwunden, wird nichts verbucht (gewollt)',
);

zuruecksetzen(); speicher.clear();
besuche('?gclid=kind-klick');
rolle = 'child'; sitzung = 'kind-9';
setWerbeEinwilligung(true);
await track('sign_up_completed', { role: 'child' });
await warte();
pruefe(klickZeilen.length === 0, 'Kinderkonto: nichts gespeichert, auch mit Einwilligung');

zuruecksetzen(); speicher.clear();
besuche('?fbclid=meta-klick');
rolle = 'parent'; sitzung = 'eltern-12';
setWerbeEinwilligung(true);
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(klickZeilen.length === 0, 'Ein reiner Meta-Klick erzeugt keine Zeile');

zuruecksetzen(); speicher.clear();
besuche('');
rolle = 'parent'; sitzung = 'eltern-10';
await track('sign_up_completed', { role: 'parent' });
await warte();
pruefe(klickZeilen.length === 0, 'Ohne Anzeigenklick wird nichts verbucht');

setWerbeEinwilligung(false);

await rm(dir, { recursive: true, force: true });
console.log(fehler === 0 ? '\nAlle Faelle bestanden.' : `\n${fehler} FEHLGESCHLAGEN`);
process.exit(fehler ? 1 : 0);
