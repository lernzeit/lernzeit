/**
 * Prueft, welcher Lernplan-Tag dran ist (src/lib/lernplan.ts, 04.10.2026):
 * Start beim ersten Oeffnen durch das Kind, Vorspringen wenn der Test naeher
 * ist als das Planende, Testtag = letzter Tag.
 *
 *   node scripts/test-lernplan.mjs
 */
process.env.TZ = 'Europe/Berlin';

import * as esbuild from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-lernplan-'));
const bundle = join(dir, 'lernplan.mjs');
await esbuild.build({ entryPoints: ['src/lib/lernplan.ts'], bundle: true, format: 'esm', outfile: bundle, logLevel: 'error' });
const { planTagAm } = await import(bundle);

const plan = (o) => ({ created_at: '2026-09-30T19:00:00Z', test_date: null, plan_data: [1, 2, 3, 4, 5], ...o });
const am = (s) => new Date(`${s}T15:00:00`);
let fehler = 0;
const pruefe = (name, ist, soll) => {
  try { assert.deepStrictEqual(ist, soll); console.log('ok  ', name); }
  catch { fehler++; console.log('FEHLER', name, JSON.stringify(ist), '≠', JSON.stringify(soll)); }
};

pruefe('abends erstellt, nicht geöffnet: am nächsten Tag Tag 1', planTagAm(plan({}), am('2026-10-01')).tag, 1);
pruefe('geöffnet am 1.10., am 3.10. Tag 3', planTagAm(plan({ gestartet_am: '2026-10-01' }), am('2026-10-03')).tag, 3);
pruefe('nach Tag 5 fertig', planTagAm(plan({ gestartet_am: '2026-10-01' }), am('2026-10-07')), { anzahl: 5, tag: 5, fertig: true, gestartet: true });
pruefe('Test in 3 Tagen, 5 Tage Plan: springt auf Tag 3', planTagAm(plan({ gestartet_am: '2026-10-04', test_date: '2026-10-07' }), am('2026-10-04')).tag, 3);
pruefe('… am Tag vor dem Test Tag 5', planTagAm(plan({ gestartet_am: '2026-10-04', test_date: '2026-10-07' }), am('2026-10-06')).tag, 5);
pruefe('Testtag selbst: letzter Tag', planTagAm(plan({ gestartet_am: '2026-10-04', test_date: '2026-10-07' }), am('2026-10-07')).tag, 5);
pruefe('Test weit weg: normal weiterzählen', planTagAm(plan({ gestartet_am: '2026-10-04', test_date: '2026-10-16' }), am('2026-10-05')).tag, 2);
pruefe('nicht geöffnet, Test übermorgen: Tag 4', planTagAm(plan({ test_date: '2026-10-06' }), am('2026-10-04')).tag, 4);

if (fehler) { console.error(`${fehler} Fehler`); process.exit(1); }
