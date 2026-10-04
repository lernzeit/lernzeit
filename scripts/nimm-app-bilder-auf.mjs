/**
 * Nimmt echte Bildschirme der eingeloggten App fuer die Startseite auf:
 * Kind fragt Bildschirmzeit an, Eltern geben frei, Regeln, Lernanalyse.
 *
 *   npm run build && FFMPEG=/pfad/zu/ffmpeg npm run werbung:app-bilder
 *
 * Ergebnis in public/landing/ (je 600 px breit, WebP):
 *   kind-start      Startbildschirm des Kindes (Streak, Challenge)
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
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
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

/** Meldet die Rolle mit Beispieldaten an und oeffnet das Dashboard. */
async function anmelden(rolle, anpassen) {
  const id = rolle === 'child' ? KIND : ELTERN;
  const d = beispieldaten();
  anpassen?.(d);
  d.ich = id;
  d.nutzer = {
    id, aud: 'authenticated', role: 'authenticated', email: rolle === 'child' ? 'mia@example.org' : 'anna@example.org',
    email_confirmed_at: '2026-09-01T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { role: rolle }, created_at: '2026-09-01T10:00:00Z',
  };
  const sitzung = { access_token: 'aufnahme', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'aufnahme', user: d.nutzer };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
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

/**
 * Bildschirm, der mit `text` oben beginnt — auch wenn die Seite dafuer zu
 * kurz ist: ganze Seite aufnehmen, ab dort 390 × 844 ausschneiden, unten mit
 * der Hintergrundfarbe auffuellen.
 */
async function ausschnitt(page, name, text, abstand = 14) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const y = await page.getByText(text, { exact: false }).first().evaluate((el, a) => Math.max(0, el.getBoundingClientRect().top + window.scrollY - a), abstand);
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

  // Kind: Startbildschirm, verdiente Zeit mit Knopf, Anfrage-Dialog
  {
    const { page, ctx } = await anmelden('child');
    await bild(page, 'kind-start');
    await ausschnitt(page, 'kind-verdient', 'Heute verdient', 28);
    await page.getByRole('button', { name: /Bildschirmzeit anfragen/ }).click();
    await page.getByLabel(/Nachricht an deine Eltern/).fill(NACHRICHT);
    await page.waitForTimeout(500);
    await bild(page, 'anfragen');
    await ctx.close();
  }

  // Eltern: Dashboard, Anfrage, Regeln, Lernanalyse (Handysperre eingerichtet)
  {
    const { page, ctx } = await anmelden('parent', (d) => {
      d.screen_time_requests = [offeneAnfrage(8, NACHRICHT)];
      d.child_settings[0].screen_time_managed = true;
    });
    await ausschnitt(page, 'eltern-anfrage', 'Ideen-Forum', 14);
    await page.getByText('Kinder', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await oben(page, 'Bildschirmzeit-Limits', 16);
    await bild(page, 'eltern-regeln');
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
