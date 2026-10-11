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
const falten = await laden('src/lib/falten.ts');
const weihnachten = await laden('src/lib/weihnachten.ts');
const hefte = await laden('src/lib/hefte.ts');
const sql = await readFile('supabase/migrations/20261011200000_klecksi_reise.sql', 'utf8');
// Neuere Fassungen von avatar_preis und sticker_waehlen, Adventskalender
const sqlAdvent = await readFile('supabase/migrations/20261011230000_weihnachten_advent.sql', 'utf8');

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
pruefe('Seite 1 Papierflieger, Seite 9 wieder', [reise.faltungFuer(1), reise.faltungFuer(9)], ['papierflieger', 'papierflieger']);

// Reihenfolge der Faltungen wie in runde_belohnen
const sqlFaltungen = [...sql.match(/v_faltungen text\[\] := array\[([^\]]+)\]/s)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Faltungen wie in der Datenbank', [...reise.FALTUNGEN], sqlFaltungen);
// Preise wie in avatar_preis
const preisSql = sqlAdvent.match(/function public\.avatar_preis[\s\S]*?\$\$;/)[0];
const sqlPreise = Object.fromEntries([...preisSql.matchAll(/when '([a-z_]+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
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
pruefe('Seite fertig: Faltung im Satz', klecksi.rundenSatz({ richtig: 3, gesamt: 5, geschafft: true, faltung: 'katze' }).satz,
  'Seite fertig! Ich falte dir eine Katze.');

// Jede Faltung hat eine Anleitung, jeder Schritt laesst Papier uebrig
pruefe('Anleitung fuer jede Faltung', reise.FALTUNGEN.filter((f) => !falten.MODELLE[f]), []);
for (const [id, m] of Object.entries(falten.MODELLE)) {
  let ok = true;
  for (let i = 0; i <= m.schritte.length; i++) {
    const z = falten.zustandNach(m, i);
    const flaeche = z.flaechen.reduce((s, f) => s + falten.flaecheninhalt(f.pts), 0);
    if (!(flaeche > 500) || z.flaechen.some((f) => f.pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1])))) ok = false;
  }
  pruefe(`Faltanleitung ${id}: jeder Schritt gueltig`, ok, true);
}

// Weihnachtszeit und Adventskalender (gleiche Regeln wie in der Datenbank)
const tag = (t) => new Date(`${t}T12:00:00+01:00`);
pruefe('Weihnachtszeit 30.11. nein, 1.12. ja, 6.1. ja, 7.1. nein',
  ['2026-11-30', '2026-12-01', '2027-01-06', '2027-01-07'].map((t) => weihnachten.istWeihnachtszeit(tag(t))), [false, true, true, false]);
pruefe('Berliner Datum: 30.11. 23:30 UTC ist schon der 1.12.', weihnachten.istWeihnachtszeit(new Date('2026-11-30T23:30:00Z')), true);
pruefe('Tuerchen offen bis: 3.12. → 3, 28.12. → 24, 5.1. → 24, Oktober → 0',
  ['2026-12-03', '2026-12-28', '2027-01-05', '2026-10-11'].map((t) => weihnachten.adventOffenBis(tag(t))), [3, 24, 24, 0]);
pruefe('Kalenderjahr im Januar: Dezember davor', weihnachten.adventJahr(tag('2027-01-03')), 2026);
const sqlAdventSticker = [...sqlAdvent.match(/function public\.advent_sticker[\s\S]*?array\[([^\]]+)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Tuerchen-Sticker wie in der Datenbank', [...weihnachten.ADVENT_STICKER], sqlAdventSticker);
pruefe('Tuerchen 13 wie Tuerchen 1', weihnachten.adventSticker(13), weihnachten.adventSticker(1));
pruefe('Figuren hinter Tuerchen 6 und 24', [6, 24, 7].map(weihnachten.adventAvatar), ['weihnachtsmann', 'tannenbaum', null]);
pruefe('Tuerchen-Figuren haben einen Preis', [weihnachten.adventAvatar(6), weihnachten.adventAvatar(24)].every((a) => feder.AVATAR_PREIS[a] > 0), true);
const katalogSql = (name) => [...sqlAdvent.match(new RegExp(`${name} text\\[\\] := array\\[([^\\]]+)\\]`))[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Sticker-Katalog wie in sticker_waehlen', Object.keys(hefte.STICKER).sort(), [...katalogSql('v_katalog'), ...katalogSql('v_weihnachten')].sort());
pruefe('Weihnachts-Sticker wie in sticker_waehlen', hefte.WEIHNACHTS_STICKER, katalogSql('v_weihnachten'));
pruefe('Ausserhalb der Weihnachtszeit keine Weihnachts-Sticker zur Wahl',
  hefte.stickerZurWahl(false).some((id) => hefte.WEIHNACHTS_STICKER.includes(id)), false);
pruefe('In der Weihnachtszeit die weihnachtlichen zuerst', hefte.stickerZurWahl(true).slice(0, 12), hefte.WEIHNACHTS_STICKER);
const f1 = weihnachten.adventFaecher(['math', 'german', 'english']);
pruefe('5 Faecher, jedes der 3 dabei, keines doppelt hintereinander',
  [f1.length, new Set(f1).size, f1.every((f, i) => i === 0 || f !== f1[i - 1])], [5, 3, true]);
pruefe('Ein Fach: 5 mal dasselbe', weihnachten.adventFaecher(['math']), ['math', 'math', 'math', 'math', 'math']);
const w = (monat, t, tuerenZu = 0) => klecksi.startSaetze({ ...lage, weihnachten: { monat, tag: t, tuerenZu } });
pruefe('Satz: Tage bis Heiligabend', w(12, 3).includes('Noch 21 Tage bis Heiligabend!'), true);
pruefe('Satz: Morgen ist Heiligabend', w(12, 23).includes('Morgen ist Heiligabend!'), true);
pruefe('Satz: Tuerchen warten', w(12, 5, 2).includes('2 Türchen im Adventskalender warten auf dich.'), true);
pruefe('Satz: Neujahr', w(1, 2).includes('Frohes neues Jahr!'), true);
pruefe('Ohne Weihnachtszeit kein Weihnachtssatz', klecksi.startSaetze(lage).some((x) => /Weihnacht|Türchen|Heiligabend/.test(x)), false);

if (fehler) { console.error(`${fehler} Fehler`); process.exit(1); }
