/**
 * Liest den Trichterbericht: eine Zeile je Tag, eine Spalte je Stufe.
 *
 *   npm run trichter          letzte 14 Tage
 *   npm run trichter -- 30    letzte 30 Tage
 *
 * Braucht SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY. Die Funktion
 * `funnel_report` ist absichtlich nur fuer `service_role` freigegeben: Sie
 * zaehlt ueber alle Konten hinweg und geht deshalb niemanden an, der bloss
 * ein Konto hat.
 *
 * ── Wozu ─────────────────────────────────────────────────────────────────
 *
 * Waehrend des Werbetests taeglich ablesen, wie viele Leute ankommen und an
 * welcher Stelle sie aufhoeren. Ohne das endet der Test mit einer Gesamtzahl
 * und ohne Erklaerung.
 *
 * ── Was hier NICHT herauskommt ───────────────────────────────────────────
 *
 * Solange die einzigen Konten Testkonten des Betreibers sind, beschreibt
 * jede Zeile das Verhalten des Betreibers. Aussagekraft bekommt der Bericht
 * erst mit fremdem Zulauf. Siehe docs/verkaufstest.md, Abschnitt 2.1.
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.');
  console.error('Ohne sie kann der Bericht nicht gelesen werden — er ist nur fuer service_role freigegeben.');
  process.exit(1);
}

const tage = Number.parseInt(process.argv[2] ?? '14', 10);
if (!Number.isFinite(tage) || tage < 1 || tage > 365) {
  console.error('Ungueltige Tageszahl. Erlaubt ist 1 bis 365.');
  process.exit(1);
}

const antwort = await fetch(`${url}/rest/v1/rpc/funnel_report`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_tage: tage }),
});

if (!antwort.ok) {
  console.error(`funnel_report antwortete ${antwort.status}: ${await antwort.text()}`);
  process.exit(1);
}

const zeilen = await antwort.json();

/**
 * Die Spalten in der Reihenfolge des Trichters — von "jemand sieht die Seite"
 * bis "jemand zahlt". Die kurzen Ueberschriften halten die Tabelle in einem
 * normalen Terminalfenster lesbar.
 */
const spalten = [
  ['tag', 'Tag', 10],
  ['besucher_zielseite', 'Seite', 6],
  ['formular_geoeffnet', 'Formular', 8],
  ['elternkonten', 'Eltern', 6],
  ['einladungscodes', 'Code', 5],
  ['kinder_verknuepft', 'Kind', 5],
  ['erste_lernsitzung', '1. Lernen', 9],
  ['bezahlschranke', 'Schranke', 8],
  ['bezahlvorgang', 'Bezahlen', 8],
  ['abos', 'Abo', 4],
];

const zeile = (werte) =>
  spalten.map(([, , breite], i) => String(werte[i]).padStart(breite)).join('  ');

console.log('');
console.log(zeile(spalten.map(([, ueberschrift]) => ueberschrift)));
console.log(spalten.map(([, , breite]) => '─'.repeat(breite)).join('  '));

for (const z of zeilen) {
  console.log(zeile(spalten.map(([schluessel]) => z[schluessel] ?? 0)));
}

// Summen darunter: Waehrend eines 14-Tage-Tests ist die Gesamtzahl die Zahl,
// an der die Schwellen aus docs/verkaufstest.md haengen.
const summe = (schluessel) => zeilen.reduce((s, z) => s + Number(z[schluessel] ?? 0), 0);
console.log(spalten.map(([, , breite]) => '─'.repeat(breite)).join('  '));
console.log(zeile(spalten.map(([schluessel], i) => (i === 0 ? 'Summe' : summe(schluessel)))));

const eltern = summe('elternkonten');
const kinder = summe('kinder_verknuepft');
const lernen = summe('erste_lernsitzung');

console.log('');
console.log(`Elternkonten: ${eltern} · davon Kind verknuepft: ${kinder} · davon erste Lernsitzung: ${lernen}`);
console.log('');
console.log('Kosten je Registrierung = ausgegebenes Werbebudget / Elternkonten.');
console.log('Die Schwellen dazu stehen in docs/verkaufstest.md, Phase 2.');
console.log('');
