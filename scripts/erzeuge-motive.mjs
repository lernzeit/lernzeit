/**
 * Laesst neue Motiv-Entwuerfe erzeugen und legt sie in werbung/motive.json ab.
 *
 *   npm run motive:erzeugen                    8 Entwuerfe
 *   npm run motive:erzeugen -- 5               5 Entwuerfe
 *   npm run motive:erzeugen -- 5 "Familien mit mehreren Kindern"
 *
 * Braucht SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.
 *
 * ── Was passiert ─────────────────────────────────────────────────────────
 *
 * Die FREIGEGEBENEN Motive aus werbung/motive.json gehen als Tonvorlage an
 * die Edge Function `generate-ad-motifs`. Die prueft jeden Vorschlag gegen
 * die Regeln und liefert Entwuerfe zurueck. Diese landen mit Status
 * `entwurf` im Bestand — nie mit `freigegeben`. Freigeben ist Sache des
 * Betreibers.
 *
 * Was die Regeln verworfen haben, wird nur angezeigt, nicht gespeichert:
 * Ein verworfener Text hat im Bestand nichts verloren.
 *
 * Danach empfiehlt sich `npm run motive:pruefen` — und vor allem Lesen. Die
 * Regeln fangen Zahlen und verbotene Formulierungen. Ob eine Aussage durch
 * V1 bis V9 gedeckt ist, entscheidet ein Mensch.
 */
import { readFile, writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.');
  process.exit(1);
}

const anzahl = Number.parseInt(process.argv[2] ?? '8', 10);
const thema = process.argv[3] ?? null;
if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 10) {
  console.error('Anzahl muss zwischen 1 und 10 liegen.');
  process.exit(1);
}

const pfad = 'werbung/motive.json';
const bestand = JSON.parse(await readFile(pfad, 'utf8'));
const freigegeben = bestand.motive.filter((m) => m.status === 'freigegeben');
if (freigegeben.length === 0) {
  console.error('Es gibt kein freigegebenes Motiv. Ohne Vorlage kennt das Modell den Ton nicht.');
  process.exit(1);
}

console.log(`Erzeuge ${anzahl} Entwuerfe${thema ? ` zum Thema „${thema}"` : ''} …`);

const antwort = await fetch(`${url}/functions/v1/generate-ad-motifs`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    anzahl,
    thema,
    beispiele: freigegeben.map((m) => ({ ueberschrift: m.ueberschrift, text: m.text })),
  }),
});

if (!antwort.ok) {
  console.error(`generate-ad-motifs antwortete ${antwort.status}: ${await antwort.text()}`);
  process.exit(1);
}

const ergebnis = await antwort.json();

// Naechste freie Nummer fuer Generator-Motive: G1, G2, …
const hoechste = bestand.motive
  .map((m) => /^G(\d+)$/.exec(m.id ?? '')?.[1])
  .filter(Boolean)
  .map(Number)
  .reduce((a, b) => Math.max(a, b), 0);

const datum = new Date().toISOString().slice(0, 10);
let naechste = hoechste + 1;
for (const e of ergebnis.entwuerfe) {
  bestand.motive.push({
    id: `G${naechste++}`,
    status: 'entwurf',
    herkunft: 'generator',
    erzeugt: `${datum}, ${ergebnis.modell}`,
    ueberschrift: e.ueberschrift,
    text: e.text,
    gedeckt_durch: e.gedeckt_durch,
    idee: e.idee,
  });
}

await writeFile(pfad, JSON.stringify(bestand, null, 2) + '\n');

console.log('');
console.log(`${ergebnis.geliefert} geliefert, ${ergebnis.entwuerfe.length} als Entwurf abgelegt, ${ergebnis.verworfen.length} verworfen.`);
for (const v of ergebnis.verworfen) {
  const gruende = v.befunde.filter((b) => b.schwere === 'verstoss').map((b) => `${b.regel} „${b.fundstelle}"`);
  console.log(`  verworfen: „${v.ueberschrift}" — ${v.grund}${gruende.length ? ` (${gruende.join(', ')})` : ''}`);
}
console.log('');
console.log('Als Naechstes: npm run motive:pruefen — und die Entwuerfe lesen.');
