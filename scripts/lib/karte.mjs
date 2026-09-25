/**
 * Gestaltung der Bildkarten — gemeinsam fuer die Karten (erzeuge-karten.mjs)
 * und die Einstiegskarte im Video (nimm-demo-auf.mjs).
 *
 * Eine Stelle, damit Karte und Video gleich aussehen. Zwei Kopien laufen
 * auseinander, und dann wirkt eine Kampagne zusammengewuerfelt.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Eine ruhige Farbe je Motiv. Drei verschiedene, damit sie sich im Test
 * unterscheiden lassen — und keine davon ein Verlauf.
 */
export const FARBEN = {
  M2: { grund: '#F3EDE4', schrift: '#1C1917', akzent: '#1C1917' },
  M3: { grund: '#3B82F6', schrift: '#FFFFFF', akzent: '#FFFFFF' },
  M5: { grund: '#111827', schrift: '#FFFFFF', akzent: '#34D399' },
};
export const STANDARD = { grund: '#F3EDE4', schrift: '#1C1917', akzent: '#1C1917' };

export const FORMATE = [
  // Feed: keine Ueberdeckung, der Schriftzug sitzt unten links in der Ecke.
  //
  // 9:16: Meta legt oben das Profil (etwa 14 % der Hoehe) und unten
  // Beschriftung und Knopf (bis zu 35 %) ueber das Bild. Text UND Schriftzug
  // muessen dazwischen liegen — also von 270 bis 1248 px. Der Schriftzug
  // folgt dem Text deshalb in festem Abstand, statt in einer Ecke zu stehen:
  // Bei einem langen Satz wuerde er sonst in den Text laufen.
  { name: 'feed-4x5', breite: 1080, hoehe: 1350, oben: 110, unten: 110, rand: 100, maxText: 880, marke: 70 },
  { name: 'story-9x16', breite: 1080, hoehe: 1920, oben: 270, unten: 672, rand: 100, maxText: 840, markeImFluss: true },
];

/** Nach Saetzen trennen: Jeder Satz beginnt auf einer neuen Zeile. */
function saetze(text) {
  return text.split(/(?<=[.?])\s+/).map((s) => s.trim()).filter(Boolean);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function seite(motiv, format) {
  const f = FARBEN[motiv.id] ?? STANDARD;
  const teile = saetze(motiv.ueberschrift);
  // Der letzte Satz traegt die Wendung („Jetzt hat sie einen Kurs."). Er darf
  // eine eigene Farbe haben — sonst bleibt alles in einer.
  const zeilen = teile
    .map((s, i) => `<span class="${i === teile.length - 1 && teile.length > 1 ? 'wendung' : ''}">${escape(s)}</span>`)
    .join('<br>');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    html, body { margin: 0; }
    body {
      width: ${format.breite}px; height: ${format.hoehe}px; box-sizing: border-box;
      padding: ${format.oben}px ${format.rand}px ${format.unten}px;
      background: ${f.grund}; color: ${f.schrift};
      font-family: 'Liberation Sans', Arial, Helvetica, sans-serif;
      display: flex; flex-direction: column; justify-content: center;
      position: relative; overflow: hidden;
    }
    h1 {
      margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12;
      hyphens: manual; overflow-wrap: normal;
    }
    .wendung { color: ${f.akzent}; }
    .marke {
      font-size: 38px; font-weight: 700; letter-spacing: -0.01em; opacity: 0.6;
      ${format.markeImFluss
        ? 'margin-top: 72px;'
        : `position: absolute; left: ${format.rand}px; bottom: ${format.marke}px;`}
    }
  </style></head><body>
    <h1 id="satz">${zeilen}</h1>
    <div class="marke">LernZeit</div>
  </body></html>`;
}

/**
 * Schriftgroesse so waehlen, dass der Satz in den Kasten passt, ohne dass
 * ein Wort ueber den Rand ragt. Groesser ist besser — auf dem Handy wird
 * die Karte klein gezeigt.
 */
export async function passeSchriftAn(page, format) {
  return page.evaluate(({ maxText, breite, rand }) => {
    const h1 = document.getElementById('satz');
    const innen = breite - 2 * rand;
    for (let px = 124; px >= 56; px -= 2) {
      h1.style.fontSize = `${px}px`;
      if (h1.scrollWidth <= innen && h1.offsetHeight <= maxText) return px;
    }
    return 56;
  }, format);
}

/**
 * Chromium starten. In der Cloud-Umgebung liegt ein vorinstallierter, auf
 * einem normalen Rechner reicht `npx playwright install chromium`.
 */
export function starteBrowser(args = []) {
  const vorinstalliert = '/opt/pw-browsers/chromium';
  const pfad = process.env.CHROMIUM_PATH || (existsSync(vorinstalliert) ? vorinstalliert : undefined);
  return chromium.launch({ args, ...(pfad ? { executablePath: pfad } : {}) });
}

/** Rendert eine Karte fuer ein Motiv in einem Format als PNG. Gibt die Schriftgroesse zurueck. */
export async function rendereKarte(browser, motiv, format, datei) {
  const page = await browser.newPage({ viewport: { width: format.breite, height: format.hoehe } });
  await page.setContent(seite(motiv, format), { waitUntil: 'load' });
  const px = await passeSchriftAn(page, format);
  await page.screenshot({ path: datei });
  await page.close();
  return px;
}
