/**
 * Prüft die Einwilligung und die Werbe-Tags gegen den Build (npm run build zuerst):
 *
 *   npm run test:werbemessung
 *
 * Läuft mit Beispieldaten für Supabase (scripts/lib/supabase-attrappe.mjs), ohne Netz zu Google
 * oder Meta: Deren Adressen werden abgefangen und gezählt. lernzeit.app wird auf die lokale
 * Vorschau umgeleitet, weil gemessen nur auf diesem Host wird.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ADRESSE = 'http://lernzeit.app:4173';
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--host-resolver-rules=MAP lernzeit.app 127.0.0.1'],
});

let fehler = 0;
const pruefe = (name, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'FEHL'} ${name}${info ? ` — ${info}` : ''}`); if (!ok) fehler++; };

async function seite({ tagsAn, pfad, anmelden = false }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE', serviceWorkers: 'block' });
  const anfragen = [];
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await ctx.route(/googletagmanager|connect\.facebook\.net|facebook\.com|google-analytics|doubleclick/, (r) => {
    anfragen.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await ctx.route(/supabase\.co/, (r) => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': '*' };
    if (u.pathname.endsWith('/ad_settings')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ tags_enabled: tagsAn }) });
    if (u.pathname.startsWith('/auth/v1/signup')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ id: 'x', email: 'a@example.org', user_metadata: { role: 'parent' } }) });
    if (u.pathname.startsWith('/auth/')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' });
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' });
  });
  await ctx.route(/onesignal|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}${pfad}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { page, ctx, anfragen };
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch('http://127.0.0.1:4173/start')).ok) break; } catch { /* noch nicht */ }
    if (i > 30) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');
    await new Promise((r) => setTimeout(r, 500));
  }

  // 1. Notaus zu: kein Hinweis, kein Skript, kein Link im Seitenfuß
  {
    const { page, ctx, anfragen } = await seite({ tagsAn: false, pfad: '/start' });
    pruefe('Notaus zu: kein Hinweis', (await page.getByRole('dialog').count()) === 0);
    pruefe('Notaus zu: kein Link „Werbe-Einstellungen“', (await page.getByRole('button', { name: 'Werbe-Einstellungen' }).count()) === 0);
    pruefe('Notaus zu: keine Anfrage an Google oder Meta', anfragen.length === 0, anfragen.join(', '));
    await ctx.close();
  }

  // 2. Notaus offen, noch keine Entscheidung: Hinweis, aber nichts geladen
  {
    const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad: '/start' });
    pruefe('Hinweis erscheint auf /start', (await page.getByRole('dialog', { name: /Wirken unsere Anzeigen/ }).count()) === 1);
    pruefe('Vor der Entscheidung: keine Anfrage an Google oder Meta', anfragen.length === 0, anfragen.join(', '));
    pruefe('Nichts gespeichert', (await page.evaluate(() => localStorage.getItem('lernzeit_werbe_einwilligung'))) === null);
    // Ablehnen
    await page.getByRole('button', { name: 'Ablehnen' }).click();
    await page.waitForTimeout(800);
    const gespeichert = JSON.parse(await page.evaluate(() => localStorage.getItem('lernzeit_werbe_einwilligung')));
    pruefe('Ablehnen speichert „nein, nein“', gespeichert?.google === false && gespeichert?.meta === false);
    pruefe('Nach Ablehnen: keine Anfrage an Google oder Meta', anfragen.length === 0, anfragen.join(', '));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    pruefe('Nach Ablehnen und Neuladen: kein Hinweis, keine Anfrage', (await page.getByRole('dialog').count()) === 0 && anfragen.length === 0);
    await ctx.close();
  }

  // 3. Zustimmung nur für Google: Google-Tag lädt, Meta nicht
  {
    const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad: '/bildschirmzeit-kind?utm_source=google&utm_campaign=test' });
    await page.getByRole('button', { name: 'Auswahl' }).click();
    await page.getByRole('checkbox', { name: /Google Ads/ }).check();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1500);
    pruefe('Google-Tag lädt nach Zustimmung', anfragen.some((u) => u.includes('googletagmanager.com/gtag/js?id=AW-18531716505')), anfragen.join(', '));
    pruefe('Meta lädt nicht ohne Zustimmung', !anfragen.some((u) => /facebook/.test(u)));
    const consent = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e[0] === 'consent').map((e) => [e[1], e[2].ad_storage, e[2].ad_personalization]));
    pruefe('Consent Mode: Vorgabe verweigert, danach ad_storage erteilt, Personalisierung verweigert',
      JSON.stringify(consent) === JSON.stringify([['default', 'denied', 'denied'], ['update', 'granted', 'denied']]), JSON.stringify(consent));
    await ctx.close();
  }

  // 4. Kein Hinweis und keine Tags für Kinder: Einladungslink, Startseite der App, Seite mit ?code
  {
    for (const pfad of ['/start?code=123456', '/?auth=true']) {
      const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad });
      await page.evaluate(() => localStorage.setItem('lernzeit_werbe_einwilligung', JSON.stringify({ v: 1, google: true, meta: true, am: new Date().toISOString() })));
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      pruefe(`Kein Hinweis und keine Tags auf ${pfad.split('?')[0]}${pfad.includes('code') ? ' mit Einladungscode' : ' (App-Seite)'}`,
        (await page.getByRole('dialog', { name: /Werbung/ }).count()) === 0 && anfragen.length === 0, anfragen.join(', '));
      await ctx.close();
    }
  }

  // 5. Registrierung eines Elternkontos: mit Zustimmung für Google und Meta wird gemeldet, ohne nicht
  for (const [name, google, meta] of [['mit Zustimmung', true, true], ['ohne Zustimmung', false, false]]) {
    const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad: '/?auth=true' });
    await page.evaluate(([g, m]) => localStorage.setItem('lernzeit_werbe_einwilligung', JSON.stringify({ v: 1, google: g, meta: m, am: new Date().toISOString() })), [google, meta]);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.getByText('Ich bin Elternteil').first().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Dein Name').fill('Test Eltern');
    await page.locator('input[type="email"]').first().fill('eltern@example.org');
    await page.locator('input[type="password"]').first().fill('Beispiel-Passwort-123');
    for (const box of await page.getByRole('checkbox').all()) { if (!(await box.isChecked())) await box.check().catch(() => undefined); }
    await page.getByRole('button', { name: /Konto erstellen/ }).last().click();
    await page.waitForTimeout(3500);
    const gemeldet = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e[0] === 'event' && e[1] === 'conversion').length);
    const metaGeladen = anfragen.some((u) => /fbevents/.test(u));
    if (google) {
      pruefe(`Elternkonto ${name}: Google-Conversion gemeldet`, gemeldet === 1, `Anzahl ${gemeldet}`);
      pruefe(`Elternkonto ${name}: Meta-Pixel geladen`, metaGeladen);
      const metaEreignisse = await page.evaluate(() => (window.fbq?.queue || []).map((a) => [a[0], a[1], JSON.stringify(a[2] ?? null)]));
      pruefe(`Elternkonto ${name}: Meta meldet CompleteRegistration ohne Daten`,
        metaEreignisse.some((e) => e[0] === 'track' && e[1] === 'CompleteRegistration' && e[2] === '{}')
        && metaEreignisse.some((e) => e[0] === 'set' && e[1] === 'autoConfig'), JSON.stringify(metaEreignisse));
    } else {
      pruefe(`Elternkonto ${name}: nichts gemeldet, nichts geladen`, gemeldet === 0 && anfragen.length === 0, anfragen.join(', '));
    }
    await ctx.close();
  }

  console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
  process.exitCode = fehler ? 1 : 0;
} finally {
  await browser.close();
  vorschau.kill();
}
