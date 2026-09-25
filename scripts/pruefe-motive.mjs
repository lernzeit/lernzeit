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
 *
 * ── Abgleich mit dem Produkt ─────────────────────────────────────────────
 *
 * Die Regeln kennen feste Werte (2,99 €, 29,99 €, 30 Sekunden). Das Produkt
 * kennt sie auch — in src/config/pricing.ts und src/config/childSettings.ts.
 * Aendert sich dort ein Wert, muessen zwei Dinge auffallen:
 *
 *   - Motive, die noch den alten Wert nennen. Sonst wirbt eine Anzeige mit
 *     einem Preis, den es nicht mehr gibt.
 *   - Regeln, die den neuen Wert noch nicht kennen. Sonst blockiert die
 *     Pruefung jeden richtigen Text — und der Generator bekaeme den alten
 *     Preis als Fakt mitgeteilt.
 *
 * Deshalb liest diese Pruefung die Werte aus dem Produkt, statt sie zu
 * wiederholen. `npm run verify-claims` haelt das Produkt seinerseits gegen
 * die Datenbank; zusammen schliesst sich die Kette Datenbank → Produkt →
 * Anzeigentext.
 *
 * Nicht pruefbar von hier: ob bei Stripe derselbe Betrag hinterlegt ist.
 * Das bleibt ein Blick ins Stripe-Konto.
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

// Die Werte des Produkts. Beide Dateien haben keine Abhaengigkeiten und
// lassen sich einzeln buendeln.
const produktBundle = join(dir, 'produkt.mjs');
await esbuild.build({
  stdin: {
    contents: `
      export { STRIPE_MONTHLY_PRICE_LABEL, STRIPE_YEARLY_PRICE_LABEL } from './src/config/pricing.ts';
      export { DEFAULT_SECONDS_PER_TASK } from './src/config/childSettings.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  outfile: produktBundle,
  logLevel: 'error',
});
const produkt = await import(produktBundle);

/** „2,99 €" → „2,99". Die Regeln und die Motive vergleichen nur den Betrag. */
const betrag = (label) => String(label).replace(/[^\d,]/g, '');
const PREISE = new Set([betrag(produkt.STRIPE_MONTHLY_PRICE_LABEL), betrag(produkt.STRIPE_YEARLY_PRICE_LABEL)]);
const SEKUNDEN = String(produkt.DEFAULT_SECONDS_PER_TASK);

/** Alle Eurobetraege in einem Text, normalisiert auf „2,99". */
function eurobetraege(text) {
  const funde = [];
  for (const t of text.matchAll(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro\b)|€\s*(\d+(?:[.,]\d{1,2})?)/gi)) {
    const roh = (t[1] ?? t[2] ?? '').replace('.', ',');
    funde.push(roh.includes(',') ? roh : `${roh},00`);
  }
  return funde;
}

const bestand = JSON.parse(await readFile('werbung/motive.json', 'utf8'));
const motive = bestand.motive ?? [];
const bekannteVersprechen = new Set(BELEGTE_VERSPRECHEN.map((v) => v.id));
const ERLAUBTE_STATUS = new Set(['entwurf', 'freigegeben', 'verworfen']);

let fehler = 0;
let hinweise = 0;
const ids = new Set();

// ── Regeln gegen Produkt ─────────────────────────────────────────────────
console.log('Abgleich mit dem Produkt');
const abgleich = [];
for (const preis of PREISE) {
  const probe = pruefeMotiv({ ueberschrift: 'Probe', text: `${preis} € im Monat. 4 Wochen kostenlos testen.` });
  if (probe.some((b) => b.regel === 'V4' && b.schwere === 'verstoss')) {
    abgleich.push(`ad-rules.ts kennt den Preis ${preis} € aus pricing.ts nicht. Regeln anpassen UND generate-ad-motifs neu ausliefern.`);
  }
}
const v4 = BELEGTE_VERSPRECHEN.find((v) => v.id === 'V4')?.text ?? '';
for (const preis of PREISE) {
  if (!v4.includes(preis)) abgleich.push(`V4 in ad-rules.ts nennt ${preis} € nicht — der Generator bekaeme einen falschen Preis als Fakt.`);
}
const v2 = BELEGTE_VERSPRECHEN.find((v) => v.id === 'V2')?.text ?? '';
if (!v2.includes(`${SEKUNDEN} Sekunden`)) {
  abgleich.push(`V2 in ad-rules.ts nennt nicht ${SEKUNDEN} Sekunden (DEFAULT_SECONDS_PER_TASK).`);
}
if (abgleich.length === 0) {
  console.log(`OK   Preise ${[...PREISE].map((p) => `${p} €`).join(' / ')}, ${SEKUNDEN} Sekunden je Aufgabe — Regeln und Produkt stimmen ueberein`);
} else {
  for (const a of abgleich) console.log(`FEHL ${a}`);
  fehler += abgleich.length;
}
console.log('');

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

  // Motive gegen Produkt: Nennt ein Motiv einen Betrag oder eine
  // Sekundenzahl, die das Produkt nicht mehr hat?
  if (typeof m.text === 'string' && typeof m.ueberschrift === 'string') {
    const gesamt = `${m.ueberschrift}\n${m.text}`;
    const art = m.status === 'freigegeben' ? 'FEHL' : 'VERSTOSS';
    for (const b of eurobetraege(gesamt)) {
      if (!PREISE.has(b)) meldungen.push({ art, text: `Produkt: ${b} € steht nicht in pricing.ts` });
    }
    for (const t of gesamt.matchAll(/(\d+)\s*sek(?:unden|\.)?/gi)) {
      if (t[1] !== SEKUNDEN) meldungen.push({ art, text: `Produkt: ${t[1]} Sekunden, Standard ist ${SEKUNDEN}` });
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
