/**
 * Erzeugt die Bildkarten fuer die Motive im Format „Text auf Farbe".
 *
 *   npm run werbung:karten
 *
 * Quelle ist AUSSCHLIESSLICH werbung/motive.json, und daraus nur Motive mit
 * Status `freigegeben` und `format_vorschlag: "text-auf-farbe"`. Eine Karte
 * kann damit nie einen Text zeigen, der nicht freigegeben ist — auch nicht
 * aus Versehen. Wird ein Motiv geaendert, wird die Karte neu erzeugt, statt
 * von Hand nachgezogen.
 *
 * ── Warum so schlicht ────────────────────────────────────────────────────
 *
 * docs/verkaufstest.md, 4.1: Das Bild verraet eine KI-Anzeige, nicht der
 * Text. Generierte Familien am Kuechentisch erkennt jeder sofort. Text auf
 * einer einzigen Farbe sieht dagegen aus wie ein Beitrag und nicht wie eine
 * Anzeige. Deshalb hier: eine Farbe, eine Schrift, der Satz, ein kleiner
 * Schriftzug. Kein Verlauf, keine Illustration, kein Foto.
 *
 * ── Formate ──────────────────────────────────────────────────────────────
 *
 *   feed-4x5    1080 × 1350   Feed auf Instagram und Facebook
 *   story-9x16  1080 × 1920   Stories und Reels
 *
 * Bei 9:16 legt Meta oben das Profil und unten Beschriftung und Knopf ueber
 * das Bild. Der Text sitzt deshalb im mittleren Bereich, der Schriftzug
 * oberhalb der unteren Ueberdeckung.
 *
 * Braucht Chromium. Auf einem normalen Rechner reicht `npx playwright
 * install chromium`; in der Cloud-Umgebung wird der vorinstallierte
 * verwendet.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { FORMATE, rendereKarte, starteBrowser } from './lib/karte.mjs';

const ZIEL = 'werbung/material';

const bestand = JSON.parse(await readFile('werbung/motive.json', 'utf8'));
const motive = bestand.motive.filter((m) => m.status === 'freigegeben' && m.format_vorschlag === 'text-auf-farbe');
if (motive.length === 0) {
  console.log('Kein freigegebenes Motiv im Format „text-auf-farbe".');
  process.exit(0);
}

await mkdir(ZIEL, { recursive: true });
const browser = await starteBrowser();
for (const motiv of motive) {
  for (const format of FORMATE) {
    const datei = `${ZIEL}/${motiv.id}-${format.name}.png`;
    const px = await rendereKarte(browser, motiv, format, datei);
    console.log(`${datei}  (${px} px)  „${motiv.ueberschrift}"`);
  }
}
await browser.close();
