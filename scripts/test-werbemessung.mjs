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

// Nachbildung von fbevents.js (das echte ist hier nicht erreichbar): arbeitet die Warteschlange ab
// wie Meta, setzt _fbp und schickt jedes Ereignis als Bild-Anfrage an facebook.com/tr – so sieht
// der Test, was die Seite Meta wirklich übergibt (ID, Ereignis, eventID).
const FBEVENTS_NACHBILDUNG = `(function(){var q=window.fbq;if(!q)return;var ids=[];
q.callMethod=function(){var a=[].slice.call(arguments);
if(a[0]==='init'){ids.push(a[1]);if(!/(^|; )_fbp=/.test(document.cookie))document.cookie='_fbp=fb.1.'+Date.now()+'.42; path=/';}
if(a[0]==='track'){var o=a[3]||{};new Image().src='https://www.facebook.com/tr/?id='+ids.join(',')+'&ev='+a[1]+(o.eventID?'&eid='+o.eventID:'');}};
var w=q.queue||[];q.queue=[];w.forEach(function(a){q.callMethod.apply(q,a);});})();`;

const REF = 'fsmgynpdfxkaiiuguqyr';
function sitzung(bestaetigt) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jetzt = Math.floor(Date.now() / 1000);
  const user = {
    id: '11111111-2222-4333-8444-555555555555', aud: 'authenticated', role: 'authenticated', email: 'eltern@example.org',
    email_confirmed_at: bestaetigt ? new Date().toISOString() : null, user_metadata: { role: 'parent' }, app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, role: 'authenticated', exp: jetzt + 3600 })}.x`;
  return { access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: jetzt + 3600, user };
}

async function seite({ tagsAn, pfad, einwilligung = null, session = null, rpcAntworten = [], viewport = { width: 390, height: 844 } }) {
  const ctx = await browser.newContext({ viewport, locale: 'de-DE', serviceWorkers: 'block' });
  const anfragen = [];
  const rpc = [];
  const ereignisse = [];
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await ctx.addInitScript(([e, s, ref]) => {
    if (sessionStorage.getItem('__vorbereitet')) return;
    sessionStorage.setItem('__vorbereitet', '1');
    if (e) localStorage.setItem('lernzeit_werbe_einwilligung', JSON.stringify(e));
    if (s) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
  }, [einwilligung, session, REF]);
  await ctx.route(/googletagmanager|connect\.facebook\.net|facebook\.com|google-analytics|doubleclick|googleadservices/, (r) => {
    const url = r.request().url();
    anfragen.push(url);
    if (/fbevents\.js/.test(url)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: FBEVENTS_NACHBILDUNG });
    return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await ctx.route(/supabase\.co/, (r) => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors, body: '' });
    if (u.pathname.endsWith('/ad_settings')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ tags_enabled: tagsAn }) });
    if (u.pathname.endsWith('/rpc/werbe_conversion_beanspruchen')) {
      rpc.push(u.pathname);
      const antwort = rpcAntworten.length ? rpcAntworten.shift() : null;
      return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(antwort) });
    }
    if (u.pathname.endsWith('/analytics_events') && r.request().method() === 'POST') {
      try { ereignisse.push(...[].concat(JSON.parse(r.request().postData() || '[]'))); } catch { /* egal */ }
      return r.fulfill({ status: 201, headers: cors, body: '' });
    }
    if (u.pathname.startsWith('/auth/v1/signup')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ id: 'x', email: 'a@example.org', user_metadata: { role: 'parent' } }) });
    if (u.pathname.startsWith('/auth/v1/user')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(session?.user ?? {}) });
    if (u.pathname.startsWith('/auth/')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' });
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' });
  });
  await ctx.route(/onesignal|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${ADRESSE}${pfad}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { page, ctx, anfragen, rpc, ereignisse };
}

const metaEreignisse = (anfragen) => anfragen.filter((u) => u.includes('facebook.com/tr/')).map((u) => {
  const q = new URL(u).searchParams;
  return { id: q.get('id'), ev: q.get('ev'), eid: q.get('eid') };
});
const googleConversions = (page) => page.evaluate(() => (window.dataLayer || [])
  .filter((e) => e && e[0] === 'event' && e[1] === 'conversion').map((e) => ({ send_to: e[2]?.send_to, transaction_id: e[2]?.transaction_id })));
const ALLES = { v: 2, google: true, meta: true, am: new Date().toISOString() };

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

  // 4. Kein Hinweis und keine Tags für Kinder: Einladungslink, Anmeldeseite der App (nicht angemeldet)
  {
    for (const pfad of ['/start?code=123456', '/?auth=true']) {
      const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad, einwilligung: ALLES });
      pruefe(`Kein Hinweis und keine Tags auf ${pfad.split('?')[0]}${pfad.includes('code') ? ' mit Einladungscode' : ' (App-Seite)'}`,
        (await page.getByRole('dialog', { name: /Werbung/ }).count()) === 0 && anfragen.length === 0, anfragen.join(', '));
      await ctx.close();
    }
  }

  // 5. Meta: Pixel mit der richtigen ID, PageView je Seite, _fbp gesetzt (nur mit Meta-Zustimmung)
  {
    const { page, ctx, anfragen } = await seite({ tagsAn: true, pfad: '/start?utm_source=fb&utm_campaign=messtest', einwilligung: ALLES });
    const init = await page.evaluate(() => (window.fbq?.queue || []).length);
    let ev = metaEreignisse(anfragen);
    pruefe('Meta: fbevents.js geladen', anfragen.some((u) => /connect\.facebook\.net\/en_US\/fbevents\.js/.test(u)));
    pruefe('Meta: PageView an facebook.com/tr mit ID 1463780805688443', ev.some((e) => e.ev === 'PageView' && e.id === '1463780805688443'), JSON.stringify(ev));
    pruefe('Meta: Warteschlange abgearbeitet', init === 0, `Rest ${init}`);
    pruefe('Meta: _fbp gesetzt', /(^|; )_fbp=/.test(await page.evaluate(() => document.cookie)));
    await page.getByRole('link', { name: /^Preise$/ }).first().click().catch(() => page.goto(`${ADRESSE}/preise`));
    await page.waitForTimeout(1500);
    ev = metaEreignisse(anfragen);
    pruefe('Meta: neuer PageView beim Seitenwechsel', ev.filter((e) => e.ev === 'PageView').length >= 2, JSON.stringify(ev));
    pruefe('Meta: keine Registrierung ohne Konto', !ev.some((e) => e.ev === 'CompleteRegistration'));
    await ctx.close();
  }
  {
    const { ctx, anfragen } = await seite({ tagsAn: true, pfad: '/start', einwilligung: { ...ALLES, meta: false } });
    pruefe('Meta: ohne Meta-Zustimmung kein Pixel', !anfragen.some((u) => /facebook/.test(u)), anfragen.join(', '));
    await ctx.close();
  }

  // 6. Registrierung per E-Mail: noch KEINE Conversion (E-Mail unbestätigt)
  {
    const { page, ctx, anfragen, rpc } = await seite({ tagsAn: true, pfad: '/?auth=true', einwilligung: ALLES });
    await page.getByText('Ich bin Elternteil').first().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Dein Name').fill('Test Eltern');
    await page.locator('input[type="email"]').first().fill('eltern@example.org');
    await page.locator('input[type="password"]').first().fill('Beispiel-Passwort-123');
    for (const box of await page.getByRole('checkbox').all()) { if (!(await box.isChecked())) await box.check().catch(() => undefined); }
    await page.getByRole('button', { name: /Konto erstellen/ }).last().click();
    await page.waitForTimeout(3500);
    pruefe('Kontoanlage: keine Google-Conversion', (await googleConversions(page)).length === 0);
    pruefe('Kontoanlage: kein CompleteRegistration', !metaEreignisse(anfragen).some((e) => e.ev === 'CompleteRegistration'));
    pruefe('Kontoanlage: Server nicht gefragt (keine Sitzung)', rpc.length === 0, `${rpc.length}`);
    await ctx.close();
  }

  // 7. Bestätigungslink öffnet die App angemeldet: genau eine Meldung mit der transaction_id vom Server
  {
    const kennung = '0a1b2c3d-1111-4222-8333-444455556666';
    const { page, ctx, anfragen, rpc } = await seite({ tagsAn: true, pfad: '/', einwilligung: ALLES, session: sitzung(true), rpcAntworten: [kennung, null, null] });
    await page.waitForTimeout(1500);
    const g = await googleConversions(page);
    let m = metaEreignisse(anfragen).filter((e) => e.ev === 'CompleteRegistration');
    pruefe('Bestätigt: Google-Conversion mit Ziel und transaction_id vom Server',
      g.length === 1 && g[0].send_to === 'AW-18531716505/xplPCJeu1aodEJmbzoRF' && g[0].transaction_id === kennung, JSON.stringify(g));
    pruefe('Bestätigt: Meta CompleteRegistration mit eventID = transaction_id',
      m.length === 1 && m[0].eid === kennung && m[0].id === '1463780805688443', JSON.stringify(m));
    // Neu laden und erneut anmelden: Speicher sagt „erledigt“, der Server ebenso
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => localStorage.removeItem('lernzeit_conversion_geprueft'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    m = metaEreignisse(anfragen).filter((e) => e.ev === 'CompleteRegistration');
    pruefe('Neuladen/erneut anmelden: keine zweite Meldung', m.length === 1 && (await googleConversions(page)).length === 0, `Meta ${m.length}, RPC ${rpc.length}`);
    await ctx.close();
  }
  {
    const { ctx, anfragen, rpc } = await seite({ tagsAn: true, pfad: '/', einwilligung: ALLES, session: sitzung(false), rpcAntworten: ['x'] });
    pruefe('Unbestätigt angemeldet: Server nicht gefragt, nichts gemeldet', rpc.length === 0 && !metaEreignisse(anfragen).some((e) => e.ev === 'CompleteRegistration'), `RPC ${rpc.length}`);
    await ctx.close();
  }
  {
    const { ctx, anfragen, rpc } = await seite({ tagsAn: true, pfad: '/', einwilligung: { ...ALLES, google: false, meta: false }, session: sitzung(true), rpcAntworten: ['x'] });
    pruefe('Ohne Zustimmung: Server nicht gefragt, nichts geladen', rpc.length === 0 && anfragen.length === 0, `RPC ${rpc.length}, ${anfragen.join(', ')}`);
    await ctx.close();
  }
  {
    const { ctx, anfragen, rpc } = await seite({ tagsAn: true, pfad: '/', einwilligung: ALLES, session: sitzung(true), rpcAntworten: [null] });
    pruefe('Server sagt nein (Test-/Kinderkonto, schon gemeldet): nichts gemeldet', rpc.length >= 1 && !metaEreignisse(anfragen).some((e) => e.ev === 'CompleteRegistration'), `RPC ${rpc.length}`);
    await ctx.close();
  }

  // 8. Meta-Anzeigen führen auf /: Weiterleitung behält utm_* und fbclid, CTA sichtbar und gezählt
  {
    const { page, ctx, ereignisse } = await seite({ tagsAn: true, pfad: '/?utm_source=an&utm_medium=paid_social&utm_campaign=appstores_okt26&fbclid=TESTKLICK' });
    const url = new URL(page.url());
    pruefe('Weiterleitung / → /start behält utm_campaign und fbclid',
      url.pathname === '/start' && url.searchParams.get('utm_campaign') === 'appstores_okt26' && url.searchParams.get('fbclid') === 'TESTKLICK', page.url());
    const cta = page.getByRole('button', { name: 'Kostenlos registrieren' }).first();
    const box = await cta.boundingBox();
    pruefe('Handy 390×844: „Kostenlos registrieren“ ohne Scrollen sichtbar (Hinweis offen)', !!box && box.y + box.height <= 844 && (await cta.isVisible()), JSON.stringify(box));
    await cta.click();
    await page.waitForTimeout(1500);
    const namen = ereignisse.map((e) => `${e.event_name}:${e.properties?.position ?? ''}:${e.utm_campaign ?? ''}`);
    pruefe('Klick zählt landing_cta_click (hero) mit Kampagne', namen.includes('landing_cta_click:hero:appstores_okt26'), namen.join(', '));
    pruefe('Danach sign_up_started', namen.some((n) => n.startsWith('sign_up_started')), namen.join(', '));
    await ctx.close();
  }

  console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
  process.exitCode = fehler ? 1 : 0;
} finally {
  await browser.close();
  vorschau.kill();
}
