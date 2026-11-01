/**
 * Fünf Hochformat-Bilder (1080 × 1920) der echten App für einen Werbeclip (Auftrag vom 01.11.2026).
 *
 *   npm run build && CHROMIUM=… node scripts/nimm-clip-screenshots.mjs <Zielordner>
 *
 * Die App kommt aus dem Build, die Daten aus scripts/lib/supabase-attrappe.mjs (Beispielfamilie Mia/Anna,
 * kein Zugriff auf die echte Datenbank, kein Konto). Gerechnet wird mit einem Mittwoch (28.10.2026),
 * damit das Tageslimit der Werktage gilt (30 Minuten, Standard) statt das vom Wochenende.
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { KIND, ELTERN, RUNDE, beispieldaten, offeneAnfrage, beantworte } from './lib/supabase-attrappe.mjs';

const ZIEL = process.argv[2] || 'screenshots';
const ADRESSE = 'http://127.0.0.1:4177';
const MITTWOCH = Date.parse('2026-10-28T13:00:00Z'); // 14:00 Berliner Zeit
await mkdir(ZIEL, { recursive: true });
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4177', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function anmelden(rolle, anpassen) {
  const id = rolle === 'child' ? KIND : ELTERN;
  const echt = Date.now;
  Date.now = () => MITTWOCH; // Beispieldaten „von heute“ (und die Anfrage) liegen am Mittwoch
  const d = beispieldaten();
  d.profiles = d.profiles.map((p) => (p.id === KIND ? { ...p, grade: 4 } : p));
  anpassen?.(d);
  Date.now = echt;
  d.ich = id;
  d.nutzer = {
    id, aud: 'authenticated', role: 'authenticated', email: rolle === 'child' ? 'mia@example.org' : 'anna@example.org',
    email_confirmed_at: '2026-09-01T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { role: rolle }, created_at: '2026-09-01T10:00:00Z',
  };
  const sitzung = { access_token: 'aufnahme', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(MITTWOCH / 1000) + 36000, refresh_token: 'aufnahme', user: d.nutzer };
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  await ctx.clock.install({ time: MITTWOCH }); // Uhr startet am Mittwoch und läuft dann normal weiter
  await ctx.addInitScript(([s, nutzerId]) => {
    localStorage.setItem('sb-fsmgynpdfxkaiiuguqyr-auth-token', JSON.stringify(s));
    localStorage.setItem(`lernzeit_onboarding_${nutzerId}`, 'true');
    localStorage.setItem(`lernzeit_role_confirmed_${nutzerId}`, 'true');
    localStorage.setItem(`premiumReferralIntroShown:${nutzerId}`, '1');
    localStorage.setItem('referralBannerDismissed', '1');
    sessionStorage.setItem('lernzeit_app_hinweis_zu', '1');
  }, [sitzung, id]);
  await ctx.route(/supabase\.co/, (r) => beantworte(r, d));
  await ctx.route(/onesignal|googletagmanager|google-analytics|google\.com|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.routeWebSocket(/realtime/, () => { /* nie verbinden */ });
  await page.goto(`${ADRESSE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2800);
  return { page, ctx };
}
const bild = (page, datei) => page.screenshot({ path: join(ZIEL, datei) });
const text = (page) => page.evaluate(() => document.body.innerText);

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${ADRESSE}/start`)).ok) break; } catch { /* noch nicht */ }
    if (i > 40) throw new Error('Die Vorschau startet nicht.');
    await new Promise((r) => setTimeout(r, 500));
  }

  // Kind: Startbildschirm (Zeitkonto), Erfolge, Antrag
  {
    const { page, ctx } = await anmelden('child');
    await bild(page, '02_kind_zeitkonto.png');
    console.log('--- 02 Text ---\n' + (await text(page)).slice(0, 500));
    await page.getByRole('button', { name: /Min\. anfragen/ }).click();
    await page.getByLabel(/Nachricht an deine Eltern/).fill('Mathe ist fertig 🙂');
    await page.waitForTimeout(600);
    await bild(page, '03_kind_antrag.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.getByText('Deine Erfolge', { exact: false }).first().evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 24));
    await page.waitForTimeout(700);
    await bild(page, '05_streak.png');
    await ctx.close();
  }

  // Kind: Aufgabe, richtig beantwortet, Rückmeldung sichtbar
  {
    const { page, ctx } = await anmelden('child');
    await page.getByRole('button', { name: 'Lernen starten' }).click();
    await page.getByText('Mathe', { exact: true }).first().click();
    const t = await page.locator('h1.frage-text').innerText({ timeout: 15000 });
    const f = RUNDE.find((x) => x.text === t.trim());
    await page.waitForTimeout(3200); // nicht „Blitzschnell“
    await page.getByRole('button', { name: f.richtig, exact: true }).first().click();
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await page.waitForTimeout(1100);
    await bild(page, '01_kind_aufgabe_richtig.png');
    console.log('--- 01 Text ---\n' + (await text(page)).slice(0, 400));
    await ctx.close();
  }

  // Eltern: offene Anfrage mit „Genehmigen“
  {
    const { page, ctx } = await anmelden('parent', (d) => { d.screen_time_requests = [offeneAnfrage(8, 'Mathe ist fertig 🙂')]; });
    await bild(page, '04_eltern_freigabe.png');
    console.log('--- 04 Text ---\n' + (await text(page)).slice(0, 500));
    await ctx.close();
  }
} finally {
  await browser.close();
  vorschau.kill();
}
