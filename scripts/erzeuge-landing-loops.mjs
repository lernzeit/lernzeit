/**
 * Erzeugt die kurzen Motion-Loops fuer die Landingpage aus
 * werbung/video/lernzeit-loops.html (Szenen "kind" und "eltern").
 *
 *   FFMPEG=/pfad/zu/ffmpeg npm run werbung:landing-loops
 *
 * Ergebnis in public/videos/: loop-<szene>.mp4 (720 × 900, ohne Ton, nahtlos)
 * und loop-<szene>.jpg als Poster. Die Loops enthalten keinen Text ausser der
 * nachgestellten App-Oberflaeche; Aussagen stehen auf der Seite selbst.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ORDNER = resolve('werbung/video');
const ZIEL = resolve('public/videos');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
// Ausschnitt um das Handy (Quelle 1080 × 1920), Seitenverhaeltnis 4:5
const AUSSCHNITT = 'crop=1080:1350:0:300,scale=720:900:flags=lanczos';
const SZENEN = [
  { name: 'kind', poster: 2.2 },
  { name: 'eltern', poster: 1.75 },
];

const typen = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http
  .createServer((req, res) => {
    const datei = join(ORDNER, decodeURIComponent(req.url.split('?')[0]));
    if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': typen[extname(datei)] || 'application/octet-stream' });
    res.end(readFileSync(datei));
  })
  .listen(0);
const port = server.address().port;

mkdirSync(ZIEL, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
try {
  for (const { name, poster } of SZENEN) {
    const bilder = mkdtempSync(join(tmpdir(), `lernzeit-loop-${name}-`));
    try {
      const seite = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
      seite.on('pageerror', (e) => { throw e; });
      await seite.goto(`http://127.0.0.1:${port}/lernzeit-loops.html?szene=${name}`);
      await seite.evaluate(() => window.bereit);
      const dauer = await seite.evaluate(() => window.DAUER);
      // t = dauer sieht aus wie t = 0, deshalb ohne das letzte Bild
      const anzahl = Math.round(dauer * FPS);
      for (let i = 0; i < anzahl; i++) {
        await seite.evaluate((t) => window.render(t), i / FPS);
        await seite.screenshot({ path: join(bilder, `f${String(i).padStart(3, '0')}.png`) });
      }
      await seite.evaluate((t) => window.render(t), poster);
      await seite.screenshot({ path: join(bilder, 'poster.png') });
      await seite.close();
      execFileSync(FFMPEG, [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-framerate', String(FPS), '-i', join(bilder, 'f%03d.png'),
        '-vf', AUSSCHNITT,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p',
        '-profile:v', 'main', '-movflags', '+faststart', '-an',
        join(ZIEL, `loop-${name}.mp4`),
      ], { stdio: 'inherit' });
      execFileSync(FFMPEG, [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', join(bilder, 'poster.png'), '-vf', AUSSCHNITT, '-q:v', '4',
        join(ZIEL, `loop-${name}.jpg`),
      ], { stdio: 'inherit' });
      console.log(`Fertig: public/videos/loop-${name}.mp4 (${dauer} s)`);
    } finally {
      rmSync(bilder, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
  server.close();
}
