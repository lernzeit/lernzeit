/**
 * Nimmt echte Bildschirme der eingeloggten App fuer die Startseite auf:
 * Kind fragt Bildschirmzeit an, Eltern geben frei, Regeln, Lernanalyse.
 *
 *   npm run build && FFMPEG=/pfad/zu/ffmpeg npm run werbung:app-bilder
 *
 * Ergebnis in public/landing/ (je 600 px breit, WebP):
 *   kind-start      Startbildschirm des Kindes (Klecksi, Zeit, Lernplan)
 *   kind-start.mp4 / .webm  Klecksi winkt, huepft, die Reise am Heftrand
 *   kind-verdient   "Heute verdient" mit dem Knopf "Bildschirmzeit anfragen"
 *   anfragen        Dialog "Bildschirmzeit anfragen" mit Nachricht
 *   eltern-anfrage  Anfrage von Mia mit Genehmigen / Ablehnen
 *   eltern-regeln   Zeitlimits und Sekunden pro Fach
 *   eltern-analyse  Lernanalyse
 *
 * Es ist die echte App aus dem Build, nur mit Beispieldaten: Jeder Aufruf an
 * Supabase wird abgefangen und aus scripts/lib/supabase-attrappe.mjs
 * beantwortet (Familie mit Mia, Klasse 3, und Anna). Kein Aufruf erreicht die
 * echte Datenbank, es entsteht kein Konto, nichts landet in analytics_events.
 * Name, Nachricht und Zahlen sind Beispiele.
 *
 * Handy-Layout 390 × 844 (iPhone 14) mit doppelter Pixeldichte.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { KIND, ELTERN, beispieldaten, offeneAnfrage, beantworte } from './lib/supabase-attrappe.mjs';

const ZIEL = 'public/landing';
const ADRESSE = 'http://127.0.0.1:4173';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const NACHRICHT = 'Mathe ist fertig 🙂';

const arbeit = await mkdtemp(join(tmpdir(), 'lernzeit-app-bilder-'));
await mkdir(ZIEL, { recursive: true });
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

/**
 * Meldet die Rolle mit Beispieldaten an und oeffnet das Dashboard. `film`:
 * Handy-Layout mit zoom 2 auf 780 × 1688 (der Screencast liefert CSS-Pixel,
 * wie in nimm-landing-auf.mjs).
 */
async function anmelden(rolle, anpassen, film = false) {
  const id = rolle === 'child' ? KIND : ELTERN;
  const d = beispieldaten();
  anpassen?.(d);
  d.ich = id;
  d.nutzer = {
    id, aud: 'authenticated', role: 'authenticated', email: rolle === 'child' ? 'mia@example.org' : 'anna@example.org',
    email_confirmed_at: '2026-09-01T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { role: rolle }, created_at: '2026-09-01T10:00:00Z',
  };
  const sitzung = { access_token: 'aufnahme', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'aufnahme', user: d.nutzer };
  const ctx = await browser.newContext(film
    ? { viewport: { width: 780, height: 1688 }, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  if (film) {
    await ctx.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2'; });
    });
  }
  await ctx.addInitScript(([s, nutzerId]) => {
    localStorage.setItem('sb-fsmgynpdfxkaiiuguqyr-auth-token', JSON.stringify(s));
    // Einmalige Hinweise ueberspringen, die ein neues Konto zuerst sieht
    localStorage.setItem(`lernzeit_onboarding_${nutzerId}`, 'true');
    localStorage.setItem(`lernzeit_role_confirmed_${nutzerId}`, 'true');
    localStorage.setItem(`premiumReferralIntroShown:${nutzerId}`, '1');
    localStorage.setItem('referralBannerDismissed', '1');
  }, [sitzung, id]);
  await ctx.route(/supabase\.co/, (r) => beantworte(r, d));
  await ctx.route(/onesignal|googletagmanager|google-analytics|google\.com|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.routeWebSocket(/realtime/, () => { /* nie verbinden */ });
  page.on('pageerror', (e) => console.warn('Seitenfehler:', e.message));
  await page.goto(`${ADRESSE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  return { page, ctx };
}

/** Scrollt so, dass der Text `abstand` px unter der Oberkante steht. */
async function oben(page, text, abstand = 12) {
  await page.getByText(text, { exact: false }).first().evaluate((el, a) => {
    window.scrollBy(0, el.getBoundingClientRect().top - a);
  }, abstand);
  await page.waitForTimeout(500);
}
const bild = (page, name) => page.screenshot({ path: join(arbeit, `${name}.png`) });

/** Weich scrollen (wie ein Daumen), damit es im Video ruhig aussieht */
const gleiten = (page, ziel, ms) => page.evaluate(([y, dauer]) => new Promise((fertig) => {
  const start = window.scrollY;
  const t0 = performance.now();
  const schritt = (jetzt) => {
    const t = Math.min(1, (jetzt - t0) / dauer);
    const w = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    window.scrollTo(0, start + (y - start) * w);
    if (t < 1) requestAnimationFrame(schritt); else fertig();
  };
  requestAnimationFrame(schritt);
}), [ziel, ms]);

/** Nimmt waehrend `ablauf` ein Video der Seite auf und schreibt name.mp4/.webm/.webp nach ZIEL. */
async function film(ctx, page, name, ablauf) {
  const bilder = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    bilder.push({ t: f.metadata.timestamp, daten: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* zu */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 780, maxHeight: 1688 });
  await page.waitForTimeout(300);
  const anfang = Date.now() / 1000;
  await ablauf();
  const ende = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  const ab = Math.max(0, bilder.findLastIndex((b) => b.t <= anfang));
  const auswahl = bilder.slice(ab).filter((b) => b.t <= ende);
  if (auswahl.length < 10) throw new Error(`${name}: nur ${auswahl.length} Bilder aufgenommen.`);
  auswahl[0] = { ...auswahl[0], t: anfang };
  const liste = [];
  for (let i = 0; i < auswahl.length; i++) {
    const datei = join(arbeit, `${name}-${String(i).padStart(5, '0')}.jpg`);
    await writeFile(datei, Buffer.from(auswahl[i].daten, 'base64'));
    const bis = i + 1 < auswahl.length ? auswahl[i + 1].t : ende;
    liste.push(`file '${datei}'`, `duration ${Math.max(0.001, bis - auswahl[i].t).toFixed(3)}`);
  }
  liste.push(liste.at(-2));
  await writeFile(join(arbeit, `${name}.txt`), liste.join('\n') + '\n');
  const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  const vf = 'fps=30,scale=600:-2:flags=lanczos,format=yuv420p';
  ff(['-f', 'concat', '-safe', '0', '-i', join(arbeit, `${name}.txt`), '-vf', vf, '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'main', '-movflags', '+faststart', join(ZIEL, `${name}.mp4`)]);
  ff(['-f', 'concat', '-safe', '0', '-i', join(arbeit, `${name}.txt`), '-vf', vf, '-an',
    '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', join(ZIEL, `${name}.webm`)]);
  console.log(`${name}: Video ${(ende - anfang).toFixed(1)} s aus ${auswahl.length} Bildern`);
}

/**
 * Bildschirm, der mit `text` oben beginnt — auch wenn die Seite dafuer zu
 * kurz ist: ganze Seite aufnehmen, ab dort 390 × 844 ausschneiden, unten mit
 * der Hintergrundfarbe auffuellen.
 */
async function ausschnitt(page, name, text, abstand = 14) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  // `text` darf auch ein Locator sein (z. B. ein Abschnitt mit aria-label)
  const ziel = typeof text === 'string' ? page.getByText(text, { exact: false }).first() : text;
  const y = await ziel.evaluate((el, a) => Math.max(0, el.getBoundingClientRect().top + window.scrollY - a), abstand);
  const ganz = join(arbeit, `${name}-ganz.png`);
  await page.screenshot({ path: ganz, fullPage: true });
  const oben = Math.round(y * 2);
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', ganz,
    '-vf', `crop=780:'min(ih-${oben},1688)':0:${oben},pad=780:1688:0:0:color=0xF8F9FE`, join(arbeit, `${name}.png`)], { stdio: 'inherit' });
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${ADRESSE}/start`)).ok) break; } catch { /* noch nicht */ }
    if (i > 30) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');
    await new Promise((r) => setTimeout(r, 500));
  }

  // Kind: Video vom Start mit Klecksi (winkt beim ersten Start des Tages,
  // huepft beim Antippen, dann die Reise am Heftrand)
  {
    const { page, ctx } = await anmelden('child', undefined, true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await film(ctx, page, 'kind-start', async () => {
      await page.waitForTimeout(3200);
      await page.getByRole('button', { name: 'Klecksi antippen' }).click();
      await page.waitForTimeout(2200);
      const reise = await page.getByRole('heading', { name: /Heftrand-Reise/ }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await gleiten(page, reise - 30, 1400);
      await page.waitForTimeout(3200);
      await gleiten(page, 0, 1200);
      await page.waitForTimeout(800);
    });
    await ctx.close();
  }

  // Kind: Startbildschirm, verdiente Zeit mit Knopf, Anfrage-Dialog
  {
    const { page, ctx } = await anmelden('child');
    // Klecksi winkt beim Laden; danach steht er still
    await page.waitForTimeout(2500);
    await bild(page, 'kind-start');
    await ausschnitt(page, 'kind-verdient', page.getByRole('region', { name: 'Deine Bildschirmzeit heute' }), 20);
    await page.getByRole('button', { name: /Min\. anfragen/ }).click();
    await page.getByLabel(/Nachricht an deine Eltern/).fill(NACHRICHT);
    await page.waitForTimeout(500);
    await bild(page, 'anfragen');
    await ctx.close();
  }

  // Eltern: Dashboard, Anfrage, Regeln, Lernanalyse. Ohne LernZeit-Handysperre:
  // Die gibt es vorerst nur fuer freigeschaltete Testkinder (CLAUDE.md).
  {
    const { page, ctx } = await anmelden('parent', (d) => {
      d.screen_time_requests = [offeneAnfrage(8, NACHRICHT)];
    });
    // Seit dem App-Redesign: "Heute" mit der Anfrage oben, Kind-Details in Bereichen
    await bild(page, 'eltern-anfrage');
    await page.getByRole('tab', { name: 'Kinder' }).click();
    await page.waitForTimeout(1000);
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole('tab', { name: 'Regeln' }).click();
    await page.waitForTimeout(1500);
    await oben(page, 'Bildschirmzeit am Tag', 16);
    await bild(page, 'eltern-regeln');
    await page.getByRole('tab', { name: 'Übersicht' }).click();
    await page.waitForTimeout(1500);
    await oben(page, 'Gesamtübersicht', 16);
    await bild(page, 'eltern-analyse');
    await ctx.close();
  }

  for (const name of ['kind-start', 'kind-verdient', 'anfragen', 'eltern-anfrage', 'eltern-regeln', 'eltern-analyse']) {
    execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(arbeit, `${name}.png`),
      '-vf', 'scale=600:-2:flags=lanczos', '-quality', '86', join(ZIEL, `${name}.webp`)], { stdio: 'inherit' });
  }
  console.log(`Fertig: ${ZIEL}`);
} finally {
  await browser.close();
  vorschau.kill();
  await rm(arbeit, { recursive: true, force: true });
}
