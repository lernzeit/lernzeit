/**
 * Erzeugt das 7-Sekunden-Erklaervideo V1 aus werbung/video/lernzeit-7s.html.
 *
 *   FFMPEG=/pfad/zu/ffmpeg npm run werbung:erklaervideo
 *
 * Ergebnis: werbung/material/V1-erklaer-7s-9x16.mp4 (1080 × 1920, 30 fps, H.264)
 *
 * Die Animation ist eine Funktion der Zeit (window.render(t)). Jedes Bild wird
 * einzeln gesetzt und aufgenommen, deshalb ruckelt nichts, egal wie schnell
 * der Rechner ist. Texte im Video stammen nur aus freigegebenen Aussagen
 * (docs/positionierung.md, Motive M1 und M3): siehe werbung/video/README.md.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ORDNER = resolve('werbung/video');
const ZIEL = resolve('werbung/material/V1-erklaer-7s-9x16.mp4');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const SEKUNDEN = 7;

const typen = { '.html': 'text/html', '.woff2': 'font/woff2' };
const server = http
  .createServer((req, res) => {
    const datei = join(ORDNER, decodeURIComponent(req.url.split('?')[0]));
    if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': typen[extname(datei)] || 'application/octet-stream' });
    res.end(readFileSync(datei));
  })
  .listen(0);
const port = server.address().port;

const bilder = mkdtempSync(join(tmpdir(), 'lernzeit-video-'));
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
try {
  const seite = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  seite.on('pageerror', (e) => { throw e; });
  await seite.goto(`http://127.0.0.1:${port}/lernzeit-7s.html`);
  await seite.evaluate(() => window.bereit);
  for (let i = 0; i < FPS * SEKUNDEN; i++) {
    await seite.evaluate((t) => window.render(t), i / FPS);
    await seite.screenshot({ path: join(bilder, `f${String(i).padStart(3, '0')}.png`) });
  }
  execFileSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(FPS), '-i', join(bilder, 'f%03d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ZIEL,
  ], { stdio: 'inherit' });
  console.log(`Fertig: ${ZIEL}`);
} finally {
  await browser.close();
  server.close();
  rmSync(bilder, { recursive: true, force: true });
}
