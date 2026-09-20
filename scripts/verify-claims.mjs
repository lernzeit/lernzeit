/**
 * Prueft die Behauptungen aus docs/faktenpruefung.md gegen Code und Datenbank.
 *
 *   npm run verify-claims
 *
 * Warum es das gibt: Die Faktenpruefung war eine Handarbeit vom 08.09.2026.
 * Aendert jemand einen Vorgabewert oder die Dauer der Testphase, wird ein
 * Werbetext still falsch — und niemand merkt es, bis eine Anzeige etwas
 * verspricht, das das Produkt nicht mehr haelt.
 *
 * Zwei Haelften:
 *   - Code-Pruefungen laufen immer, ohne Zugangsdaten.
 *   - Datenbank-Pruefungen brauchen SUPABASE_URL und
 *     SUPABASE_SERVICE_ROLE_KEY. Fehlen sie, werden sie als "uebersprungen"
 *     gemeldet — nicht als bestanden. Ein uebersprungener Test, der wie ein
 *     bestandener aussieht, ist schlimmer als gar keiner.
 *
 * Nicht automatisierbar und deshalb nicht enthalten: die Store-Staende
 * (Zeile 6 und 7) und der bei Stripe hinterlegte Betrag (Zeile 5, zweite
 * Haelfte). Beides braucht einen Menschen.
 */
import { readFileSync } from 'node:fs';

const ergebnisse = [];
const pruefe = (zeile, behauptung, ist, soll) => {
  const gleich = JSON.stringify(ist) === JSON.stringify(soll);
  ergebnisse.push({ zeile, behauptung, ist, soll, status: gleich ? 'ok' : 'abweichend' });
};
const ueberspringe = (zeile, behauptung, grund) =>
  ergebnisse.push({ zeile, behauptung, status: 'uebersprungen', grund });

const lies = (pfad) => readFileSync(new URL(`../${pfad}`, import.meta.url), 'utf8');

/* ---------------------------------------------------------------- */
/* Code                                                              */
/* ---------------------------------------------------------------- */

// Zeile 5 — Preise. Was die App anzeigt, muss zu den dokumentierten Betraegen
// passen. Ob dieselben Betraege bei Stripe hinterlegt sind, kann nur ein
// Mensch im Stripe-Konto nachsehen.
const pricing = lies('src/config/pricing.ts');
pruefe(5, 'Monatspreis im Anzeigetext',
  pricing.match(/STRIPE_MONTHLY_PRICE_LABEL\s*=\s*'([^']+)'/)?.[1], '2,99 €');
pruefe(5, 'Jahrespreis im Anzeigetext',
  pricing.match(/STRIPE_YEARLY_PRICE_LABEL\s*=\s*'([^']+)'/)?.[1], '29,99 €');

// Zeile 8 — Faecher je Klassenstufe. Die Tabelle in der Faktenpruefung ist
// aus genau dieser Stelle abgeschrieben.
const generator = lies('supabase/functions/ai-question-generator/index.ts');
const block = generator.match(/SUBJECT_GRADE_CONSTRAINTS[^=]*=\s*\{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
const minimum = {};
for (const [, fach, min] of block.matchAll(/(\w+):\s*\{\s*min:\s*(\d+)/g)) minimum[fach] = Number(min);
pruefe(8, 'Fach ab Klasse', minimum, {
  math: 1, german: 1, science: 1, english: 3, geography: 5,
  history: 5, physics: 5, biology: 5, chemistry: 7, latin: 5,
});

// Zeile 1 — Testphase. Kommuniziert wird "4 Wochen", bewusst gerundet. Die
// Pruefung achtet nicht auf die Zahl selbst, sondern auf EINHEITLICHKEIT:
// Anzeige und Zielseite muessen dasselbe sagen, sonst beanstandet Google es.
const oberflaechen = [
  'src/components/auth/AuthForm.tsx',
  'src/components/landing/SetupSteps.tsx',
  'src/components/landing/HeroSection.tsx',
  'src/components/landing/PricingComparison.tsx',
  'src/components/GameCompletionScreen.tsx',
  'src/pages/Index.tsx',
  'src/pages/Start.tsx',
];
const abweichendeTestphase = oberflaechen.filter((pfad) =>
  /\b30 Tage\b[^.]{0,40}(kostenlos|gratis|testen)/i.test(lies(pfad)));
pruefe(1, 'Keine Stelle sagt "30 Tage" statt "4 Wochen"', abweichendeTestphase, []);

/* ---------------------------------------------------------------- */
/* Datenbank                                                         */
/* ---------------------------------------------------------------- */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  for (const [zeile, was] of [
    [1, 'Dauer der Testphase'], [2, 'Gueltigkeit des Einladungscodes'],
    [3, 'Sekunden je richtiger Aufgabe'], [4, 'Tagesobergrenzen'],
    [10, 'Verdiente Zeit wird nicht automatisch freigegeben'],
  ]) ueberspringe(zeile, was, 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nicht gesetzt');
} else {
  const antwort = await fetch(`${url}/rest/v1/rpc/claim_facts`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!antwort.ok) {
    ueberspringe('–', 'Datenbank-Pruefungen', `claim_facts antwortete ${antwort.status}`);
  } else {
    const f = await antwort.json();
    pruefe(1, 'Testphase in handle_new_user (Tage)', f.trial_tage, 30);
    pruefe(2, 'Einladungscode gueltig (Tage)', f.einladungscode_tage, 7);
    pruefe(3, 'Sekunden je richtiger Aufgabe', f.sekunden_je_aufgabe, 30);
    pruefe(3, 'In allen Faechern derselbe Wert', f.sekunden_je_aufgabe_uneinheitlich, false);
    pruefe(4, 'Obergrenze werktags (Minuten)', f.minuten_werktags, '30');
    pruefe(4, 'Obergrenze am Wochenende (Minuten)', f.minuten_wochenende, '60');
    // Neu seit dem 20.09.2026: Minuten, die ohne Lernen zustehen. Muss mit
    // DEFAULT_BASE_MINUTES in src/config/childSettings.ts uebereinstimmen —
    // sonst behauptet die Oberflaeche eine Zahl, die die Datenbank nicht gibt.
    pruefe(4, 'Grundzeit am Tag (Minuten)', f.grundzeit_minuten, '30');
    pruefe(10, 'Geraetesperre standardmaessig aus', f.bildschirmzeit_verwaltet, 'false');
    pruefe(10, 'Automatische Freigabe standardmaessig aus', f.bildschirmzeit_auto_freigabe, 'false');
  }
}

/* ---------------------------------------------------------------- */

const symbol = { ok: '  OK  ', abweichend: ' ABW  ', uebersprungen: ' ---  ' };
for (const e of ergebnisse) {
  let zeile = `${symbol[e.status]} Zeile ${String(e.zeile).padEnd(3)} ${e.behauptung}`;
  if (e.status === 'abweichend') zeile += `\n         erwartet: ${JSON.stringify(e.soll)}\n         gefunden: ${JSON.stringify(e.ist)}`;
  if (e.status === 'uebersprungen') zeile += ` — ${e.grund}`;
  console.log(zeile);
}

const abweichend = ergebnisse.filter((e) => e.status === 'abweichend');
const uebersprungen = ergebnisse.filter((e) => e.status === 'uebersprungen');
console.log(`\n${ergebnisse.length - abweichend.length - uebersprungen.length} bestaetigt, ` +
            `${abweichend.length} abweichend, ${uebersprungen.length} uebersprungen.`);

if (abweichend.length) {
  console.log('\nEine Abweichung heisst: docs/faktenpruefung.md und das Produkt sagen');
  console.log('Verschiedenes. Erst klaeren, welches von beidem recht hat — und dann');
  console.log('pruefen, ob ein Werbetext auf der falschen Haelfte steht.');
  process.exit(1);
}
