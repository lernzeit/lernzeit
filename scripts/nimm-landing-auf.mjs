/**
 * Nimmt die echte Demo fuer die Startseite auf: ein kurzes Video fuer das
 * Handy im Hero und Standbilder fuer "So funktioniert's".
 *
 *   npm run build && FFMPEG=/pfad/zu/ffmpeg npm run werbung:landing
 *
 * Ergebnis in public/landing/:
 *   demo-aufgaben.mp4 / .webm   echte Aufgaben (Klasse 3, Mathe), ohne Ton
 *   demo-aufgaben.webp          Standbild = erstes Bild des Videos
 *   fach.webp, aufgabe.webp, richtig.webp, klasse.webp   Standbilder
 *
 * Alles ist die echte App im Demo-Modus, nichts nachgestellt (siehe
 * docs/verkaufstest.md 4.1). Supabase und Dritte sind waehrend der Aufnahme
 * gesperrt, die Demo nimmt ihren eingebauten Fragenpool; kein Aufruf landet
 * in analytics_events.
 *
 * Handy-Layout 390 × 844 (iPhone 14), gerendert mit zoom 2 auf 780 × 1688,
 * weil der Screencast CSS-Pixel liefert (siehe nimm-demo-auf.mjs).
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ZIEL = 'public/landing';
const ADRESSE = 'http://127.0.0.1:4173';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const B = 780, H = 1688, ZOOM = 2;
const AUS = 600; // Breite der Ergebnisse (Handy auf der Seite ca. 300 px, also 2x)

/** Klasse 3, Mathe — wortgleich aus src/data/demoQuestions.ts. */
const ANTWORT = {
  'Wie viel ist 7 · 6?': '42',
  'Wie viel ist 125 + 78?': '203',
  'Wie viel ist 56 : 8?': '7',
  'Wie viel ist 9 · 8?': '72',
  'Wie viel ist 300 - 145?': '155',
  'Welche Zahl gerundet auf Zehner ergibt 80?': '77',
};

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

const arbeit = await mkdtemp(join(tmpdir(), 'lernzeit-landing-'));
await mkdir(ZIEL, { recursive: true });
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${ADRESSE}/start`)).ok) break; } catch { /* noch nicht */ }
    if (i > 30) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const sperren = async (page) => {
    await page.route(/supabase\.co/, (r) => r.abort());
    await page.route(/googletagmanager|onesignal|google-analytics|google\.com|stripe|cloudflare|turnstile/, (r) => r.abort());
  };
  // Von der Startseite bis zur ersten Aufgabe; `halt(name)` nimmt Standbilder unterwegs.
  const zurAufgabe = async (page, halt = async () => {}) => {
    await page.goto(`${ADRESSE}/start`, { waitUntil: 'networkidle' });
    for (let versuch = 1; ; versuch++) {
      await page.getByRole('button', { name: 'Demo ausprobieren' }).click();
      try { await page.getByText('Klasse 1 – 4').waitFor({ timeout: 3000 }); break; } catch (e) { if (versuch === 5) throw e; }
    }
    await page.waitForTimeout(600);
    await halt('klasse');
    await page.getByRole('button', { name: "Los geht's!" }).nth(2).click();
    await page.getByText('Mathe', { exact: true }).first().waitFor();
    await page.waitForTimeout(600);
    await halt('fach');
    await page.getByText('Mathe', { exact: true }).first().click();
    await page.waitForFunction((f) => f.some((x) => document.body.innerText.includes(x)), Object.keys(ANTWORT));
    await page.waitForTimeout(600);
  };

  // 1. Standbilder: ohne zoom, mit doppelter Pixeldichte (zoom verzerrt manche Raster)
  {
    const ctx = await browser.newContext({ viewport: { width: B / ZOOM, height: H / ZOOM }, deviceScaleFactor: ZOOM, isMobile: true, hasTouch: true, locale: 'de-DE' });
    const page = await ctx.newPage();
    await sperren(page);
    const standbild = (name) => page.screenshot({ path: join(arbeit, `${name}.png`) });
    await zurAufgabe(page, standbild);
    // bis zur ersten Freitext-Aufgabe, dort Eingabe und Rueckmeldung
    for (let n = 1; n <= 5; n++) {
      const text = await page.locator('body').innerText();
      const frage = Object.keys(ANTWORT).find((f) => text.includes(f));
      const feld = page.getByPlaceholder(/Antwort/);
      if (await feld.count()) {
        await feld.fill(ANTWORT[frage]);
        await page.waitForTimeout(300);
        await standbild('aufgabe');
        await page.getByRole('button', { name: /Prüfen/ }).click();
        // Konfetti und Hinweis abklingen lassen
        await page.waitForTimeout(3500);
        await standbild('richtig');
        break;
      }
      await page.getByRole('button', { name: ANTWORT[frage], exact: true }).first().click();
      const pruefen = page.getByRole('button', { name: /Prüfen/ });
      if (await pruefen.count()) await pruefen.click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /Weiter|Fertig/ }).first().click();
      await page.waitForFunction(([alt]) => !document.body.innerText.includes(alt), [frage]).catch(() => {});
      await page.waitForTimeout(500);
    }
    await ctx.close();
  }

  // 2. Video: Handy-Layout mit zoom, Screencast
  const context = await browser.newContext({ viewport: { width: B, height: H }, isMobile: true, hasTouch: true, locale: 'de-DE' });
  await context.addInitScript((z) => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = String(z); });
  }, ZOOM);
  const page = await context.newPage();
  await sperren(page);
  await zurAufgabe(page);

  // Ab hier laeuft das Video: drei Aufgaben, sichtbar getippt.
  const bilder = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    bilder.push({ t: f.metadata.timestamp, daten: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* zu */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: B, maxHeight: H });
  await page.waitForTimeout(300);
  const anfang = Date.now() / 1000;
  await page.waitForTimeout(600);

  for (let n = 1; n <= 3; n++) {
    const text = await page.locator('body').innerText();
    const frage = Object.keys(ANTWORT).find((f) => text.includes(f));
    if (!frage) throw new Error(`Unbekannte Frage bei Nummer ${n}.\n${text}`);
    const feld = page.getByPlaceholder(/Antwort/);
    if (await feld.count()) {
      await feld.pressSequentially(ANTWORT[frage], { delay: 170 });
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: /Prüfen/ }).click();
    } else {
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: ANTWORT[frage], exact: true }).first().click();
      const pruefen = page.getByRole('button', { name: /Prüfen/ });
      if (await pruefen.count()) await pruefen.click();
    }
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Weiter|Fertig/ }).first().click();
    await page.mouse.move(1, 1);
    await page.waitForFunction(
      ([alt, fragen]) => !document.body.innerText.includes(alt) && fragen.some((f) => document.body.innerText.includes(f)),
      [frage, Object.keys(ANTWORT)],
    ).catch(() => {});
    await page.waitForTimeout(n < 3 ? 500 : 900);
  }
  const ende = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await browser.close();

  // Bilder mit Standdauer zu einem Video (wie nimm-demo-auf.mjs)
  const ab = Math.max(0, bilder.findLastIndex((b) => b.t <= anfang));
  const auswahl = bilder.slice(ab).filter((b) => b.t <= ende);
  if (auswahl.length < 10) throw new Error(`Nur ${auswahl.length} Bilder aufgenommen.`);
  auswahl[0] = { ...auswahl[0], t: anfang };
  const liste = [];
  for (let i = 0; i < auswahl.length; i++) {
    const datei = join(arbeit, `b${String(i).padStart(5, '0')}.jpg`);
    await writeFile(datei, Buffer.from(auswahl[i].daten, 'base64'));
    const bis = i + 1 < auswahl.length ? auswahl[i + 1].t : ende;
    liste.push(`file '${datei}'`, `duration ${Math.max(0.001, bis - auswahl[i].t).toFixed(3)}`);
  }
  liste.push(liste.at(-2));
  await writeFile(join(arbeit, 'liste.txt'), liste.join('\n') + '\n');
  const vf = `fps=30,scale=${AUS}:-2:flags=lanczos,format=yuv420p`;
  ff(['-f', 'concat', '-safe', '0', '-i', join(arbeit, 'liste.txt'), '-vf', vf, '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'main', '-movflags', '+faststart',
    join(ZIEL, 'demo-aufgaben.mp4')]);
  ff(['-f', 'concat', '-safe', '0', '-i', join(arbeit, 'liste.txt'), '-vf', vf, '-an',
    '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1',
    join(ZIEL, 'demo-aufgaben.webm')]);
  ff(['-i', join(arbeit, 'b00000.jpg'), '-vf', `scale=${AUS}:-2:flags=lanczos`, '-quality', '86', join(ZIEL, 'demo-aufgaben.webp')]);
  for (const name of ['klasse', 'fach', 'aufgabe', 'richtig']) {
    ff(['-i', join(arbeit, `${name}.png`), '-vf', `scale=${AUS}:-2:flags=lanczos`, '-quality', '86', join(ZIEL, `${name}.webp`)]);
  }
  console.log(`Fertig: ${ZIEL} (Video ${(ende - anfang).toFixed(1)} s aus ${auswahl.length} Bildern)`);
} finally {
  vorschau.kill();
  await rm(arbeit, { recursive: true, force: true });
}
