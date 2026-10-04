/**
 * Prueft die Faustregel fuer die Kaufaussicht (src/lib/kaufaussicht.ts).
 *
 *   node scripts/test-kaufaussicht.mjs
 */
import * as esbuild from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-aussicht-'));
const bundle = join(dir, 'aussicht.mjs');
await esbuild.build({
  entryPoints: ['src/lib/kaufaussicht.ts'],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error',
});
const { kaufaussicht } = await import(bundle);

let fehler = 0;
const pruefe = (bedingung, text) => {
  if (bedingung) console.log(`ok    ${text}`);
  else { fehler++; console.log(`FEHLER ${text}`); }
};

const jetzt = new Date('2026-10-03T12:00:00Z');
const basis = {
  art: 'familie', kinder: 1, lerntage_14: 0, eltern_tage_14: 0, freigaben_28: 0,
  paywall_gesehen: false, kauf_begonnen: false, abo_status: 'testphase',
  testphase_ende: '2026-10-20T12:00:00Z',
};
const a = (x) => kaufaussicht({ ...basis, ...x }, jetzt);

pruefe(a({ abo_status: 'bezahlt' }).stufe === 'zahlt', 'bezahltes Abo = zahlt');
pruefe(a({ art: 'kind_allein' }).stufe === 'keine', 'Kind ohne Eltern = keine Aussicht');
pruefe(a({ kinder: 0, lerntage_14: 9 }).stufe === 'gering', 'ohne verknuepftes Kind = gering');
pruefe(a({}).stufe === 'gering', 'Kind lernt nicht = gering');
pruefe(a({ lerntage_14: 3 }).stufe === 'gering', 'nur ab und zu lernen allein = gering (1 Punkt)');
pruefe(a({ lerntage_14: 3, freigaben_28: 1 }).stufe === 'mittel', 'ab und zu + Freigabe = mittel');
pruefe(a({ lerntage_14: 6, freigaben_28: 2, eltern_tage_14: 3 }).stufe === 'hoch', 'Schleife laeuft = hoch');
pruefe(a({ lerntage_14: 6, kauf_begonnen: true }).stufe === 'hoch', 'regelmaessig + Kauf begonnen = hoch');
pruefe(a({ lerntage_14: 6 }).gruende[0].includes('6 von 14'), 'Grund nennt die Lerntage');
pruefe(a({ testphase_ende: '2026-10-08T12:00:00Z' }).endetBald === true, 'Testphase endet in 5 Tagen = endet bald');
pruefe(a({}).endetBald === false, 'Testphase endet in 17 Tagen = nicht bald');
pruefe(a({ abo_status: 'testphase_abgelaufen', testphase_ende: null }).endetBald === false, 'abgelaufene Testphase endet nicht bald');
pruefe(a({ testphase_ende: '2026-10-08T12:00:00Z' }).restTage === 5, 'Resttage = 5');

if (fehler) {
  console.log(`\n${fehler} Fehler`);
  process.exit(1);
}
console.log('\nAlles in Ordnung');
