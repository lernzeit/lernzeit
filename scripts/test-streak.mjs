/**
 * Prueft die Streak-Rechnung (src/lib/streak.ts).
 *
 * Laeuft in deutscher Zeit, denn genau dort trat der Fehler vom 30.09.2026
 * auf: Klara hatte vier Tage hintereinander gespielt, die App zeigte 1.
 * Wie bei scripts/test-screen-time-release.mjs gibt es fuer `src/` keinen
 * Unit-Runner.
 *
 *   node scripts/test-streak.mjs
 */
process.env.TZ = 'Europe/Berlin';

import * as esbuild from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-streak-'));
const bundle = join(dir, 'streak.mjs');
await esbuild.build({
  entryPoints: ['src/lib/streak.ts'],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error',
});
const { berechneStreak, lokalerTag } = await import(bundle);

let fehler = 0;
const pruefe = (bedingung, text) => {
  console.log(`${bedingung ? 'OK   ' : 'FEHL '}${text}`);
  if (!bedingung) fehler++;
};
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Zeiten aus game_sessions, Klara, 27.-30.09.2026
const klara = berechneStreak(
  ['2026-09-27T18:44:30.166Z', '2026-09-28T17:17:54.498Z', '2026-09-29T12:45:07.278Z',
   '2026-09-30T04:39:08.950Z', '2026-09-30T18:16:14.807Z'],
  new Date('2026-09-30T19:00:00Z'),
);
pruefe(gleich(klara, { streak: 4, inaktiveTage: 0, letzterTag: '2026-09-30' }), `Klaras vier Tage ergeben 4 (${JSON.stringify(klara)})`);

const gestern = berechneStreak(['2026-09-28T10:00:00Z', '2026-09-29T10:00:00Z'], new Date('2026-09-30T10:00:00Z'));
pruefe(gestern.streak === 2 && gestern.inaktiveTage === 1, 'gestern zuletzt gespielt: Kette 2, ein Tag inaktiv');

const luecke = berechneStreak(['2026-09-26T10:00:00Z', '2026-09-28T10:00:00Z', '2026-09-29T10:00:00Z'], new Date('2026-09-29T12:00:00Z'));
pruefe(luecke.streak === 2, 'eine Luecke beendet die Kette');

// 29.09. 22:30 UTC = 30.09. 00:30 in Berlin
pruefe(lokalerTag(new Date('2026-09-29T22:30:00Z')) === '2026-09-30', '00:30 deutscher Zeit ist der neue Tag');
const mitternacht = berechneStreak(['2026-09-29T10:00:00Z', '2026-09-29T22:30:00Z'], new Date('2026-09-30T08:00:00Z'));
pruefe(gleich(mitternacht, { streak: 2, inaktiveTage: 0, letzterTag: '2026-09-30' }), 'Runde um 00:30 zaehlt zum neuen Tag');

const umstellung = berechneStreak(['2026-10-24T10:00:00Z', '2026-10-25T10:00:00Z', '2026-10-26T10:00:00Z'], new Date('2026-10-26T12:00:00Z'));
pruefe(umstellung.streak === 3, 'ueber die Zeitumstellung (25.10.2026) hinweg');

pruefe(gleich(berechneStreak([], new Date()), { streak: 0, inaktiveTage: 0, letzterTag: null }), 'keine Runden: 0');

if (fehler) {
  console.log(`\n${fehler} Fehler`);
  process.exit(1);
}
console.log('\nAlle Pruefungen bestanden.');
