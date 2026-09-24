/**
 * Prueft alle Werbemotive in werbung/motive.json gegen die Regeln.
 *
 *   npm run motive:pruefen
 *
 * Die Regeln selbst stehen in supabase/functions/_shared/ad-rules.ts — EINE
 * Quelle fuer die Edge Function, die Entwuerfe erzeugt, und fuer diese
 * Pruefung. Zwei Kopien liefen frueher oder spaeter auseinander, und dann
 * waere ein Entwurf beim Erzeugen gueltig und beim Pruefen nicht.
 *
 * Ergebnis:
 *   - Ein FREIGEGEBENES Motiv mit Verstoss laesst den Lauf scheitern. Das
 *     faengt den Fall ab, dass jemand einen abgenommenen Text nachtraeglich
 *     aendert und dabei eine Regel bricht.
 *   - Ein ENTWURF mit Verstoss wird gemeldet, laesst den Lauf aber nicht
 *     scheitern. Entwuerfe sind dafuer da, geprueft zu werden.
 *   - Hinweise werden immer nur gemeldet.
 *
 * Ausserdem geprueft: Jedes Motiv nennt, welche Versprechen es traegt
 * (`gedeckt_durch`), und nur solche, die es gibt. Und: Nur ein Mensch setzt
 * `freigegeben` — ein Motiv aus dem Generator mit diesem Status ist ein
 * Fehler, egal wie gut der Text ist.
 */
import * as esbuild from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-motive-'));
const bundle = join(dir, 'regeln.mjs');
await esbuild.build({
  entryPoints: ['supabase/functions/_shared/ad-rules.ts'],
  bundle: true,
  format: 'esm',
  outfile: bundle,
  logLevel: 'error',
});
const { pruefeMotiv, BELEGTE_VERSPRECHEN } = await import(bundle);

const bestand = JSON.parse(await readFile('werbung/motive.json', 'utf8'));
const motive = bestand.motive ?? [];
const bekannteVersprechen = new Set(BELEGTE_VERSPRECHEN.map((v) => v.id));
const ERLAUBTE_STATUS = new Set(['entwurf', 'freigegeben', 'verworfen']);

let fehler = 0;
let hinweise = 0;
const ids = new Set();

for (const m of motive) {
  const kopf = `${m.id ?? '(ohne id)'}  [${m.status ?? '?'}]`;
  const meldungen = [];

  // Aufbau
  if (!m.id) meldungen.push({ art: 'FEHL', text: 'keine id' });
  if (ids.has(m.id)) meldungen.push({ art: 'FEHL', text: `id ${m.id} doppelt` });
  ids.add(m.id);
  if (!ERLAUBTE_STATUS.has(m.status)) meldungen.push({ art: 'FEHL', text: `unbekannter Status „${m.status}"` });
  if (typeof m.ueberschrift !== 'string' || typeof m.text !== 'string') {
    meldungen.push({ art: 'FEHL', text: 'ueberschrift oder text fehlt' });
  }
  if (m.status === 'freigegeben' && m.herkunft === 'generator' && !m.freigegeben_am) {
    meldungen.push({ art: 'FEHL', text: 'Generator-Motiv als freigegeben markiert, ohne Freigabedatum. Freigeben darf nur ein Mensch.' });
  }
  if (m.status === 'freigegeben' && !m.freigegeben_am) {
    meldungen.push({ art: 'FEHL', text: 'freigegeben ohne freigegeben_am' });
  }

  // Deckung
  const gedeckt = Array.isArray(m.gedeckt_durch) ? m.gedeckt_durch : [];
  if (gedeckt.length === 0) meldungen.push({ art: 'FEHL', text: 'gedeckt_durch ist leer — jedes Motiv muss sagen, welche Versprechen es traegt' });
  for (const v of gedeckt) {
    if (!bekannteVersprechen.has(v)) meldungen.push({ art: 'FEHL', text: `gedeckt_durch nennt „${v}" — das gibt es nicht` });
  }

  // Regeln
  if (typeof m.ueberschrift === 'string' && typeof m.text === 'string') {
    for (const b of pruefeMotiv({ ueberschrift: m.ueberschrift, text: m.text })) {
      if (b.schwere === 'verstoss') {
        // Freigegeben + Verstoss = harter Fehler. Entwurf + Verstoss = Meldung.
        meldungen.push({ art: m.status === 'freigegeben' ? 'FEHL' : 'VERSTOSS', text: `${b.regel} „${b.fundstelle}" — ${b.erklaerung}` });
      } else {
        meldungen.push({ art: 'hinweis', text: `${b.regel} „${b.fundstelle}" — ${b.erklaerung}` });
      }
    }
  }

  const harte = meldungen.filter((x) => x.art === 'FEHL').length;
  fehler += harte;
  hinweise += meldungen.filter((x) => x.art === 'hinweis').length;

  console.log(`${harte ? 'FEHL' : 'OK  '} ${kopf}`);
  for (const x of meldungen) console.log(`       ${x.art.padEnd(8)} ${x.text}`);
}

await rm(dir, { recursive: true, force: true });

const zaehle = (s) => motive.filter((m) => m.status === s).length;
console.log('');
console.log(`${motive.length} Motive: ${zaehle('freigegeben')} freigegeben, ${zaehle('entwurf')} Entwurf, ${zaehle('verworfen')} verworfen.`);
console.log(`${fehler} Fehler, ${hinweise} Hinweise.`);
process.exit(fehler ? 1 : 0);
