/**
 * Prueft die Anzeige-Regeln von Kleckis Heftrand-Reise (src/lib/reise.ts,
 * src/lib/klecksi.ts, 11.10.2026) und dass Faltungen und Figurenpreise zu
 * den Datenbank-Funktionen passen (runde_belohnen, avatar_preis). Die
 * Vergabe selbst prueft die Datenbank; getestet per SQL mit Rollback.
 *
 *   node scripts/test-reise.mjs
 */
import * as esbuild from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-reise-'));
const laden = async (datei) => {
  const aus = join(dir, datei.replace(/\W/g, '_') + '.mjs');
  await esbuild.build({
    entryPoints: [datei], bundle: true, format: 'esm', outfile: aus, logLevel: 'error',
    alias: { '@': './src' }, external: ['react', 'react/jsx-runtime'],
  });
  return import(aus);
};
const reise = await laden('src/lib/reise.ts');
const klecksi = await laden('src/lib/klecksi.ts');
const feder = await laden('src/lib/federmaeppchen.ts');
const sql = await readFile('supabase/migrations/20261011200000_klecksi_reise.sql', 'utf8');

let fehler = 0;
const pruefe = (name, ist, soll) => {
  try { assert.deepStrictEqual(ist, soll); console.log('ok  ', name); }
  catch { fehler++; console.log('FEHLER', name, JSON.stringify(ist), '≠', JSON.stringify(soll)); }
};
const feld = (seite, feld, fach = 'math', quelle = 'runde') => ({ seite, feld, fach, quelle });

pruefe('ohne Felder: Seite 1', reise.aktuelleSeite([]), { seite: 1, felder: [] });
pruefe('6 Felder auf Seite 4', reise.aktuelleSeite([1, 2, 3, 4, 5, 6].map((f) => feld(4, f))).felder.length, 6);
pruefe('volle Seite: naechste leer', reise.aktuelleSeite(Array.from({ length: 12 }, (_, i) => feld(2, i + 1))), { seite: 3, felder: [] });
pruefe('Faecher, haeufigstes zuerst',
  reise.faecherAufSeite([feld(1, 1, 'english'), feld(1, 2, 'math'), feld(1, 3, 'math')]),
  [{ fach: 'math', anzahl: 2 }, { fach: 'english', anzahl: 1 }]);
pruefe('Seite 1 Papierflieger, Seite 11 wieder', [reise.faltungFuer(1), reise.faltungFuer(11)], ['papierflieger', 'papierflieger']);

// Reihenfolge der Faltungen wie in runde_belohnen
const sqlFaltungen = [...sql.match(/v_faltungen text\[\] := array\[([^\]]+)\]/s)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Faltungen wie in der Datenbank', [...reise.FALTUNGEN], sqlFaltungen);
// Preise wie in avatar_preis
const sqlPreise = Object.fromEntries([...sql.matchAll(/when '([a-z_]+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
pruefe('Figurenpreise wie in der Datenbank', feder.AVATAR_PREIS, sqlPreise);
pruefe('8 Figuren frei', Object.values(feder.AVATAR_PREIS).filter((p) => p === 0).length, 8);

const lage = { name: 'Mia', felderGemalt: 11, faltung: 'papierschiff', faecherAufSeite: 2, berichtigung: 3, lernplanFach: 'Englisch' };
const saetze = klecksi.startSaetze(lage);
pruefe('Satz: 1 Feld bis zur Faltung', saetze[1], 'Noch 1 Feld, dann falte ich dir ein Papierschiff.');
pruefe('Satz: bunte Seite', saetze.includes('Noch ein Fach, dann wird die Seite bunt!'), true);
pruefe('Satz: Lernplan doppelt', saetze.includes('Dein Lernplan in Englisch zählt doppelt.'), true);
pruefe('Satz: Berichtigung', saetze.includes('3 kleine Kleckse warten in der Berichtigung.'), true);
pruefe('Runde 2/5: Mut', klecksi.rundenSatz({ richtig: 2, gesamt: 5, geschafft: false }).stimmung, 'mut');
pruefe('Runde 5/5: Jubel', klecksi.rundenSatz({ richtig: 5, gesamt: 5, geschafft: true }).stimmung, 'jubel');
pruefe('Seite fertig: Faltung im Satz', klecksi.rundenSatz({ richtig: 3, gesamt: 5, geschafft: true, faltung: 'frosch' }).satz,
  'Seite fertig! Ich falte dir einen Frosch.');

if (fehler) { console.error(`${fehler} Fehler`); process.exit(1); }
