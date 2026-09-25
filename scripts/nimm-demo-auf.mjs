/**
 * Nimmt die echte Demo als Anzeigenvideo fuer das Motiv M1 auf.
 *
 *   npm run build && FFMPEG=/pfad/zu/ffmpeg npm run werbung:video
 *
 * Ergebnis, beides H.264:
 *   werbung/material/M1-demo-9x16.mp4       1080 × 1920, Reels und Stories
 *   werbung/material/M1-demo-feed-4x5.mp4   1080 × 1350, Feed
 *
 * ── Was im Video zu sehen ist ────────────────────────────────────────────
 *
 *   1. Die Ueberschrift von M1 als Karte, so lange, dass man sie lesen kann
 *   2. Die echte Demo: fuenf Mathe-Aufgaben der 3. Klasse, alle richtig
 *   3. Das Ende der Demo: „5 von 5 richtig"
 *
 * Kein nachgestelltes Material, keine erfundene Oberflaeche. Genau das ist
 * der Punkt aus docs/verkaufstest.md 4.1: Eine Bildschirmaufnahme der echten
 * App kann nicht nach KI aussehen, weil sie keine ist.
 *
 * ── Was im Video NICHT zu sehen ist ──────────────────────────────────────
 *
 * Eine Zeitgutschrift in Sekunden. Die Demo zeigt Sterne und am Ende „In der
 * echten App wird daraus Bildschirmzeit" — die Zahl „30 Sekunden" steht nur
 * im Anzeigentext von M1. Das ist vertretbar, aber es ist so.
 *
 * ── Keine Spuren in der Produktion ───────────────────────────────────────
 *
 * Alle Aufrufe an Supabase und an Dritte werden waehrend der Aufnahme
 * abgewiesen. Die Demo faellt dann auf ihren fest eingebauten Fragenpool
 * zurueck — die Fragen sind vorhersehbar, und kein Aufnahme-Besuch landet
 * in `analytics_events` und damit im Trichterbericht.
 *
 * ── Voraussetzungen ──────────────────────────────────────────────────────
 *
 * - Eine gebaute App (`npm run build`). Die Vorschau startet das Skript
 *   selbst.
 * - Ein ffmpeg mit libx264 in der Umgebungsvariable FFMPEG (Standard:
 *   `ffmpeg` aus dem Pfad).
 *
 * ── Wie aufgenommen wird ─────────────────────────────────────────────────
 *
 * Alles in CSS-Pixeln: Playwrights Videoaufnahme wie der CDP-Screencast
 * liefern ein 360-px-Handy als 360 × 640, auch mit deviceScaleFactor 3.
 * Screenshots in voller Aufloesung schaffen nur etwa 7 Bilder pro Sekunde,
 * und --force-device-scale-factor laesst den Screencast nach zwei Sekunden
 * einfrieren (ausprobiert am 25.09.2026).
 *
 * Darum: Viewport 540 × 960 und `zoom: 1.5` auf <html>. Das Layout ist das
 * eines 360-px-Handys (540 liegt unter dem ersten Tailwind-Umbruch bei 640),
 * gerendert mit 540 Pixeln Breite. ffmpeg skaliert auf 1080 × 1920 hoch.
 * Die Bilder des Screencasts kommen nur, wenn sich etwas aendert; jedes
 * traegt seinen Zeitstempel, und ffmpeg haelt es, bis das naechste kommt.
 * Damit sitzt auch der Schnitt vor der ersten Frage auf die Hundertstel.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORMATE, rendereKarte, starteBrowser } from './lib/karte.mjs';

const ZIEL = 'werbung/material';
const ADRESSE = 'http://127.0.0.1:4173';

/** Klasse 3, Mathe — wortgleich aus src/data/demoQuestions.ts. */
const ANTWORT = {
  'Wie viel ist 7 · 6?': '42',
  'Wie viel ist 125 + 78?': '203',
  'Wie viel ist 56 : 8?': '7',
  'Wie viel ist 9 · 8?': '72',
  'Wie viel ist 300 - 145?': '155',
  'Welche Zahl gerundet auf Zehner ergibt 80?': '77',
};

/** Lesezeit fuer die Einstiegskarte: gut 18 Zeichen je Sekunde, mindestens 3 s. */
const lesezeit = (text) => Math.max(3, Math.min(5, text.length / 18));

const bestand = JSON.parse(await readFile('werbung/motive.json', 'utf8'));
const motiv = bestand.motive.find((m) => m.id === 'M1' && m.status === 'freigegeben');
if (!motiv) {
  console.error('M1 ist nicht freigegeben. Ohne Freigabe kein Video.');
  process.exit(1);
}

const arbeit = await mkdtemp(join(tmpdir(), 'lernzeit-video-'));
await mkdir(ZIEL, { recursive: true });

// ── Vorschau starten ──────────────────────────────────────────────────────
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: 'ignore',
});
const bereit = async () => {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${ADRESSE}/start`)).ok) return true; } catch { /* noch nicht */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

try {
  if (!(await bereit())) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');

  const browser = await starteBrowser();
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'de-DE',
  });
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.zoom = '1.5';
    });
  });
  const page = await context.newPage();
  await page.route(/supabase\.co/, (r) => r.abort());
  await page.route(/googletagmanager|onesignal|google-analytics|google\.com|stripe|cloudflare|turnstile/, (r) => r.abort());

  const bilder = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    bilder.push({ t: f.metadata.timestamp, daten: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Seite zu */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920 });

  // Auf jedes Zwischenziel warten, nicht nur auf das Ende. /start ist
  // vorgerendert: Der Knopf steht da, bevor React ihn uebernommen hat, und
  // ein Klick in dieser Luecke verpufft still. Darum wiederholen, bis die
  // Klassenwahl erscheint — im fertigen Video ist davon nichts zu sehen.
  await page.goto(`${ADRESSE}/start`, { waitUntil: 'networkidle' });
  for (let versuch = 1; ; versuch++) {
    await page.getByRole('button', { name: 'Demo ausprobieren' }).click();
    try {
      await page.getByText('Klasse 1 – 4').waitFor({ timeout: 3000 });
      break;
    } catch (e) {
      if (versuch === 5) throw e;
    }
  }
  await page.getByRole('button', { name: "Los geht's!" }).nth(2).click();
  await page.getByText('Mathe', { exact: true }).first().click();
  await page.waitForFunction(
    (fragen) => fragen.some((f) => document.body.innerText.includes(f)),
    Object.keys(ANTWORT),
  );
  await page.waitForTimeout(500);
  // Ab hier beginnt das Video. Alles davor — Startseite, Klassenwahl — ist
  // fuer eine Anzeige zu langsam.
  const anfang = Date.now() / 1000 - 0.3;

  for (let n = 1; n <= 5; n++) {
    const text = await page.locator('body').innerText();
    const frage = Object.keys(ANTWORT).find((f) => text.includes(f));
    if (!frage) throw new Error(`Unbekannte Frage bei Nummer ${n}. Hat sich src/data/demoQuestions.ts geaendert?\n--- Seite ---\n${text}`);
    const antwort = ANTWORT[frage];

    await page.waitForTimeout(700);
    const feld = page.getByPlaceholder(/Antwort/);
    if (await feld.count()) {
      // Sichtbar tippen, nicht einsetzen — im Video soll man es sehen.
      await feld.pressSequentially(antwort, { delay: 160 });
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: /Prüfen/ }).click();
    } else {
      await page.getByRole('button', { name: antwort, exact: true }).first().click();
      const pruefen = page.getByRole('button', { name: /Prüfen/ });
      if (await pruefen.count()) await pruefen.click();
    }
    // Die Rueckmeldung stehen lassen: „Super!", Stern, Konfetti.
    await page.waitForTimeout(1300);
    await page.getByRole('button', { name: /Weiter|Fertig/ }).first().click();
    // Maus aus dem Bild: Sonst steht sie nach dem Neuzeichnen ueber einer
    // Antwortmoeglichkeit, deren Hover-Farbe aussieht, als haette das Kind
    // sie gewaehlt (so geschehen: „9" orange bei 56 : 8).
    await page.mouse.move(1, 1);
    // Erst weiter, wenn die naechste Frage (oder das Ergebnis) steht — sonst
    // liest die Schleife noch den alten Fragetext.
    if (n < 5) {
      await page.waitForFunction(
        ([alt, fragen]) => !document.body.innerText.includes(alt)
          && fragen.some((f) => document.body.innerText.includes(f)),
        [frage, Object.keys(ANTWORT)],
      ).catch(() => { /* gleiche Frage zweimal gezogen — dann einfach weiter */ });
    }
  }

  await page.getByText(/5 von 5 richtig/).waitFor();
  await page.waitForTimeout(3500);
  const ende = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await context.close();
  await browser.close();

  // ── Bilder mit Standdauer ───────────────────────────────────────────────
  // Das letzte Bild vor dem Schnitt ist das erste des Videos.
  const ab = Math.max(0, bilder.findLastIndex((b) => b.t <= anfang));
  const auswahl = bilder.slice(ab).filter((b) => b.t <= ende);
  if (auswahl.length < 10) throw new Error(`Nur ${auswahl.length} Bilder aufgenommen — da stimmt etwas nicht.`);
  auswahl[0] = { ...auswahl[0], t: anfang };
  await mkdir(join(arbeit, 'bilder'));
  const liste = [];
  for (let i = 0; i < auswahl.length; i++) {
    const datei = join(arbeit, 'bilder', `${String(i).padStart(5, '0')}.jpg`);
    await writeFile(datei, Buffer.from(auswahl[i].daten, 'base64'));
    const bis = i + 1 < auswahl.length ? auswahl[i + 1].t : ende;
    liste.push(`file '${datei}'`, `duration ${Math.max(0.001, bis - auswahl[i].t).toFixed(3)}`);
  }
  // Eigenheit des concat-Demuxers: Das letzte Bild braucht eine zweite Zeile,
  // sonst gilt seine Dauer nicht.
  liste.push(liste.at(-2));
  const listenDatei = join(arbeit, 'bilder.txt');
  await writeFile(listenDatei, liste.join('\n') + '\n');
  const laenge = ende - anfang;

  // ── Einstiegskarten ─────────────────────────────────────────────────────
  const karten = {};
  const kartenBrowser = await starteBrowser();
  for (const format of FORMATE) {
    karten[format.name] = join(arbeit, `einstieg-${format.name}.png`);
    await rendereKarte(kartenBrowser, motiv, format, karten[format.name]);
  }
  await kartenBrowser.close();

  // ── Zusammensetzen ──────────────────────────────────────────────────────
  // Zwei Fassungen aus derselben Aufnahme. Das 9:16-Video in den Feed zu
  // geben und Meta auf 4:5 beschneiden zu lassen, geht nicht: Der Schnitt
  // kappt die erste Zeile der Einstiegskarte und oben die Kopfzeile der
  // Demo (nachgeprueft am 25.09.2026). Im Feed steht die Demo darum
  // verkleinert in der Mitte, links und rechts in der Hintergrundfarbe der
  // App (#F9F8FF), und die Karte kommt im Feed-Format.
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  const dauerKarte = lesezeit(motiv.ueberschrift).toFixed(1);
  const fassungen = [
    {
      datei: `${ZIEL}/M1-demo-9x16.mp4`,
      karte: karten['story-9x16'],
      breite: 1080, hoehe: 1920,
      demo: 'scale=1080:1920:flags=lanczos',
    },
    {
      datei: `${ZIEL}/M1-demo-feed-4x5.mp4`,
      karte: karten['feed-4x5'],
      breite: 1080, hoehe: 1350,
      demo: 'scale=-2:1350:flags=lanczos,pad=1080:1350:(ow-iw)/2:0:color=0xF9F8FF',
    },
  ];
  for (const f of fassungen) {
    await new Promise((fertig, fehler) => {
      const p = spawn(ffmpeg, [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-loop', '1', '-t', dauerKarte, '-i', f.karte,
        '-f', 'concat', '-safe', '0', '-i', listenDatei,
        // Stumme Tonspur: Manche Platzierungen erwarten eine. Musik waere eine
        // eigene Entscheidung — und eine Lizenzfrage.
        '-f', 'lavfi', '-t', '90', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-filter_complex',
        `[0:v]scale=${f.breite}:${f.hoehe},setsar=1,fps=30,format=yuv420p[a];` +
        `[1:v]${f.demo},setsar=1,fps=30,trim=duration=${laenge.toFixed(2)},format=yuv420p[b];` +
        '[a][b]concat=n=2:v=1:a=0[v]',
        '-map', '[v]', '-map', '2:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '64k', '-shortest',
        '-movflags', '+faststart',
        f.datei,
      ], { stdio: 'inherit' });
      p.on('error', fehler);
      p.on('exit', (code) => (code === 0 ? fertig() : fehler(new Error(`ffmpeg endete mit ${code}`))));
    });
    console.log(`${f.datei}  (Einstieg ${dauerKarte} s, Demo ${laenge.toFixed(1)} s aus ${auswahl.length} Bildern)`);
  }
} finally {
  vorschau.kill();
  await rm(arbeit, { recursive: true, force: true });
}
