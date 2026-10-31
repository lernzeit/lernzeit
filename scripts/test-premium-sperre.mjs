/**
 * Zahlende Eltern dürfen die Premium-Sperre nie sehen, auch nicht kurz (31.10.2026):
 *
 *   npm run build && npm run test:premium-sperre
 *
 * Meldet ein Premium-Elternteil mit Beispieldaten an (scripts/lib/supabase-attrappe.mjs,
 * kein Zugriff auf die Datenbank), öffnet Kind → Übersicht (Lernanalyse) und Kind → Regeln
 * und prüft: kein „Premium erforderlich“ im Bild, kein Ereignis trial_ended_paywall_seen.
 * Die Prüfung der Anmeldung (/auth/v1/user) antwortet absichtlich langsam wie im
 * Mobilnetz – genau dann zeigte die App vorher kurz die Sperre.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { ELTERN, beispieldaten, beantworte } from './lib/supabase-attrappe.mjs';

const ADRESSE = 'http://lernzeit.app:4175';
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--host-resolver-rules=MAP lernzeit.app 127.0.0.1'],
});
let fehler = 0;
const pruefe = (name, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'FEHL'} ${name}${info ? ` — ${info}` : ''}`); if (!ok) fehler++; };

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch('http://127.0.0.1:4175/start')).ok) break; } catch { /* noch nicht */ }
    if (i > 40) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');
    await new Promise((r) => setTimeout(r, 500));
  }
async function lauf(premium) {
  const d = beispieldaten();
  d.screen_time_requests = []; // Kind hat gespielt, aber nie Zeit angefragt (wie die Kundin)
  d.ich = ELTERN;
  d.nutzer = { id: ELTERN, aud: 'authenticated', role: 'authenticated', email: 'anna@example.org', email_confirmed_at: '2026-09-01T10:00:00Z',
    app_metadata: { provider: 'email' }, user_metadata: { role: 'parent' }, created_at: '2026-09-01T10:00:00Z' };
  const sitzung = { access_token: 'probe', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'probe', user: d.nutzer };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await ctx.addInitScript(([s, id]) => {
    localStorage.setItem('sb-fsmgynpdfxkaiiuguqyr-auth-token', JSON.stringify(s));
    localStorage.setItem(`lernzeit_onboarding_${id}`, 'true');
    localStorage.setItem(`lernzeit_role_confirmed_${id}`, 'true');
    localStorage.setItem(`premiumReferralIntroShown:${id}`, '1');
    localStorage.setItem('referralBannerDismissed', '1');
    // Jede Sperre, die je ins Bild kommt, merken (auch nur für einen Augenblick)
    new MutationObserver(() => {
      if (document.body?.innerText.includes('Premium erforderlich')) window.__sperreGesehen = true;
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, [sitzung, ELTERN]);
  const ereignisse = [];
  await ctx.route(/supabase\.co/, async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/analytics_events') && r.request().method() === 'POST') {
      try { ereignisse.push(...[].concat(JSON.parse(r.request().postData() || '[]'))); } catch { /* egal */ }
    }
    if (u.pathname === '/auth/v1/user') await new Promise((w) => setTimeout(w, 900));
    if (!premium && u.pathname.endsWith('/check-subscription')) {
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ subscribed: false }) });
    }
    return beantworte(r, d);
  });
  await ctx.route(/onesignal|googletagmanager|google-analytics|facebook|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.routeWebSocket(/realtime/, () => { /* nie verbinden */ });
  await page.goto(`${ADRESSE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const onboardingKarte = await page.getByText('Mit jeder gelösten Aufgabe sammelt').count();
  await page.getByRole('tab', { name: 'Kinder' }).click();
  await page.waitForTimeout(800);
  await page.getByText('Mia', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await page.getByRole('tab', { name: 'Regeln' }).click();
  await page.waitForTimeout(2500);
  await page.getByRole('tab', { name: 'Übersicht' }).click();
  await page.waitForTimeout(2500);
  const paywall = ereignisse.filter((e) => e.event_name === 'trial_ended_paywall_seen').map((e) => e.properties?.feature);
  const gesehen = await page.evaluate(() => window.__sperreGesehen === true);
  if (premium) {
    pruefe('Premium: kein trial_ended_paywall_seen', paywall.length === 0, paywall.join(', '));
    pruefe('Premium: „Premium erforderlich“ nie im Bild', !gesehen);
    pruefe('Premium: Lernanalyse sichtbar', (await page.getByText('Gesamtübersicht').count()) > 0);
    pruefe('Onboarding: Schritt 3 weg, sobald das Kind gespielt hat (auch ohne Anfrage)', onboardingKarte === 0,
      `Karte ${onboardingKarte}, Ereignisse ${ereignisse.filter((e) => e.event_name === 'onboarding_step_viewed').length}`);
  } else {
    pruefe('Ohne Premium: Sperre sichtbar und gemeldet', gesehen && paywall.length > 0, paywall.join(', '));
  }
  await ctx.close();
}
await lauf(true);
await lauf(false);
  console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
  process.exitCode = fehler ? 1 : 0;
} finally {
  await browser.close();
  vorschau.kill();
}
