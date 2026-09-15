/**
 * Fuehrt die Tests der Edge Functions aus — ohne Deno.
 *
 *   npm run test:edge
 *
 * Hintergrund: Die Edge Functions sind Deno-Code, und Deno ist in dieser
 * Umgebung nicht installiert. Die Testdateien lagen deshalb da, ohne dass
 * irgendetwas sie ausfuehrte. Ein Test, den niemand startet, ist eine
 * Behauptung.
 *
 * Der Weg hier: esbuild buendelt die ECHTEN Quelldateien (keine Kopie, keine
 * Nachbildung) und ersetzt dabei nur die beiden Dinge, die es unter Node
 * nicht gibt — Deno.test und die Assert-Bibliothek von deno.land. Alles
 * andere laeuft unveraendert, crypto.subtle inklusive.
 */
import * as esbuild from 'esbuild';
import { readdirSync, statSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const erfordere = createRequire(import.meta.url);

const wurzel = new URL('../supabase/functions/', import.meta.url).pathname;

function findeTests(verzeichnis) {
  const treffer = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) treffer.push(...findeTests(pfad));
    else if (eintrag.endsWith('_test.ts')) treffer.push(pfad);
  }
  return treffer;
}

// Sammelt die Faelle, die Deno.test anmeldet, und fuehrt sie danach aus.
const sammler = `
globalThis.__faelle = globalThis.__faelle || [];
globalThis.Deno = globalThis.Deno || {};
globalThis.Deno.test = (a, b) => {
  const name = typeof a === 'string' ? a : a.name;
  const fn   = typeof a === 'string' ? b : (a.fn || b);
  globalThis.__faelle.push({ name, fn });
};
globalThis.Deno.env = globalThis.Deno.env || {
  get: (k) => process.env[k],
  set: (k, v) => { process.env[k] = v; },
  delete: (k) => { delete process.env[k]; },
};
`;

const assertShim = `
function fehler(nachricht) { throw new Error(nachricht); }
export function assert(bedingung, nachricht) {
  if (!bedingung) fehler(nachricht || 'assert fehlgeschlagen');
}
export function assertEquals(ist, soll, nachricht) {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a !== b) fehler((nachricht ? nachricht + ': ' : '') + 'erwartet ' + b + ', bekommen ' + a);
}
export function assertNotEquals(ist, soll, nachricht) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) {
    fehler((nachricht ? nachricht + ': ' : '') + 'beide Werte sind ' + JSON.stringify(ist));
  }
}
export function assertThrows(fn, _typ, teil) {
  let geworfen = false;
  try { fn(); } catch (e) { geworfen = true; if (teil && !String(e.message).includes(teil)) fehler('falsche Meldung: ' + e.message); }
  if (!geworfen) fehler('es wurde nichts geworfen');
}
export async function assertRejects(fn, _typ, teil) {
  let geworfen = false;
  try { await fn(); } catch (e) { geworfen = true; if (teil && !String(e.message).includes(teil)) fehler('falsche Meldung: ' + e.message); }
  if (!geworfen) fehler('es wurde nichts geworfen');
}
export function assertExists(wert, nachricht) {
  if (wert === null || wert === undefined) fehler(nachricht || 'Wert fehlt');
}
export function assertStringIncludes(ist, teil, nachricht) {
  if (!String(ist).includes(teil)) fehler((nachricht ? nachricht + ': ' : '') + '"' + teil + '" fehlt');
}
`;

// Fernmodule, die nicht die Assert-Bibliothek sind — etwa der Supabase-Client,
// den manche Quelldatei importiert. Sie werden durch einen Platzhalter
// ersetzt, der beim BENUTZEN scheitert, nicht beim Laden. So laufen Tests, die
// den Import nur mitschleppen; ein Test, der den echten Client braeuchte,
// faellt mit einer verstaendlichen Meldung auf.
//
// Bewusst CommonJS: Bei ESM muessten die benannten Exporte statisch bekannt
// sein, und die kennt hier niemand.
const fernmodulStub = `
module.exports = new Proxy(function () {}, {
  get: (_ziel, name) => {
    if (name === '__esModule') return true;
    return new Proxy(function () {}, {
      apply: () => { throw new Error('Fernmodul im Test benutzt: ' + String(name)); },
      get: () => { throw new Error('Fernmodul im Test benutzt: ' + String(name)); },
    });
  },
  apply: () => { throw new Error('Fernmodul im Test aufgerufen'); },
});
`;

const gestubbteFernmodule = new Set();
const umgebogeneFernmodule = new Set();

const shims = {
  name: 'deno-shims',
  setup(build) {
    build.onResolve({ filter: /^https:\/\/deno\.land\/.*assert/ }, () => ({ path: 'assert', namespace: 'shim' }));
    // Fernmodule werden ersetzt — bis auf die wenigen, bei denen der Test
    // sonst nichts mehr beweist.
    //
    // mathjs ist der Fall: Der Validator rechnet damit, und ein Platzhalter
    // wuerde genau die Rechnung ueberspringen, um die es geht.
    //
    // Bewusst KEINE allgemeine Regel "nimm alles, was in node_modules liegt".
    // supabase-js zieht ueber CommonJS Node-Bausteine wie `stream` nach, die
    // sich in das ESM-Buendel hier nicht aufloesen lassen — und im Test wird
    // der Client ohnehin nie benutzt.
    const lokalErlaubt = new Set(['mathjs']);
    build.onResolve({ filter: /^https:\/\// }, (args) => {
      const lokal = args.path.match(/^https:\/\/esm\.sh\/((?:@[^/@]+\/)?[^/@]+)@/)?.[1];
      if (lokal && lokalErlaubt.has(lokal) && existsSync(new URL(`../node_modules/${lokal}/package.json`, import.meta.url))) {
        umgebogeneFernmodule.add(`${args.path} -> node_modules/${lokal}`);
        // Auf den echten Pfad in node_modules aufloesen. Ein blosser
        // Paketname reicht nicht: Der Import steht in einer Datei unter
        // supabase/functions/, und von dort aus sucht esbuild ins Leere.
        return { path: erfordere.resolve(lokal) };
      }
      gestubbteFernmodule.add(args.path);
      return { path: args.path, namespace: 'fern' };
    });
    build.onLoad({ filter: /.*/, namespace: 'shim' }, () => ({ contents: assertShim, loader: 'js' }));
    build.onLoad({ filter: /.*/, namespace: 'fern' }, () => ({ contents: fernmodulStub, loader: 'js' }));
  },
};

const dateien = findeTests(wurzel);
if (dateien.length === 0) {
  console.log('Keine Testdateien gefunden.');
  process.exit(0);
}

const arbeitsordner = mkdtempSync(join(tmpdir(), 'lernzeit-edge-'));
let bestanden = 0;
const fehlgeschlagen = [];

for (const datei of dateien) {
  const kurz = relative(wurzel, datei);
  const ziel = join(arbeitsordner, kurz.replace(/[\/\\]/g, '_') + '.mjs');

  try {
    await esbuild.build({
      entryPoints: [datei],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: ziel,
      plugins: [shims],
      banner: { js: sammler },
      logLevel: 'silent',
    });
  } catch (fehler) {
    fehlgeschlagen.push({ kurz, name: '(Buendeln)', meldung: fehler.message.split('\n')[0] });
    continue;
  }

  globalThis.__faelle = [];
  await import(pathToFileURL(ziel).href);

  for (const fall of globalThis.__faelle) {
    try {
      await fall.fn();
      bestanden++;
    } catch (fehler) {
      fehlgeschlagen.push({ kurz, name: fall.name, meldung: fehler.message });
    }
  }
  console.log(`  ${kurz} — ${globalThis.__faelle.length} Faelle`);
}

rmSync(arbeitsordner, { recursive: true, force: true });

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen.length} fehlgeschlagen ` +
            `(${dateien.length} Dateien).`);

if (umgebogeneFernmodule.size) {
  console.log(`\nAuf die lokale Fassung umgebogen:`);
  for (const m of [...umgebogeneFernmodule].sort()) console.log(`  ${m}`);
}

if (gestubbteFernmodule.size) {
  console.log(`\nDurch Platzhalter ersetzt (scheitern erst beim Benutzen):`);
  for (const m of [...gestubbteFernmodule].sort()) console.log(`  ${m}`);
}

for (const f of fehlgeschlagen) {
  console.log(`\nFEHL  ${f.kurz} › ${f.name}\n      ${f.meldung}`);
}

process.exit(fehlgeschlagen.length ? 1 : 0);
