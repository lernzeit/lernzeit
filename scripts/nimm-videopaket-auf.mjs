/**
 * Bildschirmaufnahmen fuer das Videopaket (Aufnahmeplan: Projekt, Videos A1 bis A3 und B1 bis B7).
 *
 *   npm run build && npm run werbung:videopaket
 *
 * Ergebnis in videopaket-screenshots/<Szene>/NN-name.png (nicht im Git): 1080 × 2340 px
 * (360 × 780 CSS-Pixel mit Pixeldichte 3), Handy hochkant.
 *
 * Wie bei werbung:app-bilder ist es die echte App aus dem Build mit Beispieldaten
 * (scripts/lib/supabase-attrappe.mjs): Jeder Aufruf an Supabase wird lokal beantwortet, es
 * entsteht kein Konto, es wird kein Passwort gebraucht, und es erscheinen keine echten Namen,
 * Codes oder Mailadressen. Familie: Mia (Klasse 3) und Anna; der Einladungscode ist erfunden.
 *
 * Nicht moeglich ohne iPhone: Apples Dialoge (Familienfreigabe, Bildschirmzeit-Kennung,
 * „Was zaehlt als Handyzeit?“), die native Karte „Handy sperren“ und der Sperrbildschirm.
 * Das steht in videopaket-screenshots/FEHLT.md.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { KIND, ELTERN, RUNDE, beispieldaten, offeneAnfrage, beantworte } from './lib/supabase-attrappe.mjs';

const ZIEL = 'videopaket-screenshots';
const ADRESSE = 'http://127.0.0.1:4173';
const NACHRICHT = 'Mathe ist fertig 🙂';
const ERFUNDENER_CODE = '482913';

const liste = [];
await mkdir(ZIEL, { recursive: true });
const vorschau = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

const heute = () => new Date().toISOString().slice(0, 10);
const vorTagen = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/** Handysperre auf dem iPhone von Mia: Kind-App kann sie (App-Stand), Sperre laeuft, Verlauf der letzten Tage. */
function mitIphoneSperre(d, laeuft = true) {
  d.profiles[0].app_stand = 20261022;
  d.profiles[0].last_platform = 'ios';
  d.rpc.get_children_platforms = [{ child_id: KIND, platform: 'ios' }];
  d.handysperre_freigaben = [{ child_id: KIND, created_at: '2026-10-22T10:00:00Z' }];
  d.child_settings[0].screen_time_managed = laeuft;
  d.child_settings[0].screen_time_base_minutes = 30;
  d.child_settings[0].freiminuten_wochenende = 45;
  if (laeuft) {
    d.handyzeit_stand = [{ child_id: KIND, tag: heute(), genutzt: 34, budget: 48, aufgebraucht: false, aktualisiert: new Date().toISOString() }];
    d.handyzeit_tage = [
      [0, 34, 48], [1, 52, 52], [2, 28, 40], [3, 40, 55], [4, 15, 30], [5, 45, 45], [6, 30, 38],
    ].map(([t, genutzt, budget], i) => ({ child_id: KIND, platz: i, tag: vorTagen(t), genutzt, budget, aufgebraucht: genutzt >= budget, aktualisiert: new Date().toISOString() }));
  }
}

const mitAndroid = (d) => {
  d.profiles[0].last_platform = 'android';
  d.rpc.get_children_platforms = [{ child_id: KIND, platform: 'android' }];
};

async function anmelden(rolle, anpassen) {
  const id = rolle === 'child' ? KIND : ELTERN;
  const d = beispieldaten();
  d.rpc.get_children_platforms = [];
  d.invitation_codes = [];
  anpassen?.(d);
  d.ich = id;
  d.nutzer = {
    id, aud: 'authenticated', role: 'authenticated', email: rolle === 'child' ? 'mia@example.org' : 'anna@example.org',
    email_confirmed_at: '2026-09-01T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { role: rolle }, created_at: '2026-09-01T10:00:00Z',
  };
  const sitzung = { access_token: 'aufnahme', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'aufnahme', user: d.nutzer };
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  await ctx.addInitScript(([s, nutzerId]) => {
    // Nie als Messung zaehlen (analytics.ts misst nur ohne navigator.webdriver)
    Object.defineProperty(navigator, 'webdriver', { get: () => true });
    localStorage.setItem('sb-fsmgynpdfxkaiiuguqyr-auth-token', JSON.stringify(s));
    localStorage.setItem(`lernzeit_onboarding_${nutzerId}`, 'true');
    localStorage.setItem(`lernzeit_role_confirmed_${nutzerId}`, 'true');
    localStorage.setItem(`premiumReferralIntroShown:${nutzerId}`, '1');
    localStorage.setItem('referralBannerDismissed', '1');
    // Hinweisleiste „LernZeit ist für die App optimiert“ (nur im Browser) aus dem Bild nehmen
    sessionStorage.setItem('lernzeit_app_hinweis_zu', '1');
  }, [sitzung, id]);
  await ctx.route(/supabase\.co/, (r) => beantworte(r, d));
  await ctx.route(/onesignal|googletagmanager|google-analytics|google\.com|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.routeWebSocket(/realtime/, () => { /* nie verbinden */ });
  page.on('pageerror', (e) => console.warn('Seitenfehler:', e.message));
  await page.goto(`${ADRESSE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  return { page, ctx, d };
}

async function bild(page, szene, nr, name, beschreibung) {
  const ordner = join(ZIEL, szene);
  await mkdir(ordner, { recursive: true });
  const datei = `${String(nr).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: join(ordner, datei) });
  liste.push({ szene, datei, beschreibung });
  console.log(`${szene}/${datei}`);
}

/** Scrollt so, dass `text` knapp unter der Oberkante steht. */
async function oben(page, text, abstand = 12) {
  await page.getByText(text, { exact: false }).first().evaluate((el, a) => {
    window.scrollBy(0, el.getBoundingClientRect().top - a);
  }, abstand);
  await page.waitForTimeout(600);
}

/** Ein Schritt darf fehlschlagen, ohne die ganze Aufnahme zu kippen; er landet in FEHLT.md. */
const fehlt = [];
async function versuche(name, fn) {
  try { await fn(); } catch (e) { fehlt.push(`${name}: ${String(e.message).split('\n')[0]}`); console.warn(`FEHLT ${name}: ${String(e.message).split('\n')[0]}`); }
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${ADRESSE}/start`)).ok) break; } catch { /* noch nicht */ }
    if (i > 30) throw new Error('Die Vorschau startet nicht. Ist die App gebaut (npm run build)?');
    await new Promise((r) => setTimeout(r, 500));
  }

  // 01 Registrierung (ohne Eingaben): Rollenwahl und Formular
  await versuche('01 Registrierung', async () => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'de-DE' });
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => true }));
    await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await ctx.route(/onesignal|googletagmanager|google-analytics|stripe|cloudflare|turnstile|revenuecat/, (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(`${ADRESSE}/?auth=true`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await bild(page, '01-registrierung', 1, 'registrieren', 'Registrieren: Rollenwahl „Ich bin Elternteil“ / „Ich bin ein Kind“');
    await page.getByText('Ich bin Elternteil').first().click();
    await page.waitForTimeout(800);
    await bild(page, '01-registrierung', 2, 'eltern-formular', 'Formular „Konto erstellen“ für Eltern (leer)');
    await ctx.close();
  });

  // 02 Eltern: Kinder, Einladungscode, Kind-Uebersicht
  {
    const { page, ctx } = await anmelden('parent', (d) => {
      d.screen_time_requests = [];
      d.invitation_codes = [{ id: 'c1', code: ERFUNDENER_CODE, parent_id: ELTERN, expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), used_at: null, used_by: null, created_at: new Date().toISOString() }];
      d.rpc.generate_invitation_code = ERFUNDENER_CODE;
    });
    await bild(page, '02-eltern-kinder', 1, 'heute', 'Eltern: Heute, keine offene Anfrage; „Heute gelernt“ je Kind');
    await page.getByRole('tab', { name: 'Kinder' }).click();
    await page.waitForTimeout(1000);
    await bild(page, '02-eltern-kinder', 2, 'kinder-liste', 'Eltern: Kinder, Liste mit Mia');
    await versuche('02 Einladen', async () => {
      await oben(page, 'Einladen', 12);
      await bild(page, '02-eltern-kinder', 3, 'kind-einladen', 'Kinder: Bereich „Kind einladen“ mit erfundenem Code (Link teilen)');
    });
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await bild(page, '02-eltern-kinder', 4, 'kind-uebersicht', 'Kind Mia: Übersicht (Heute verdient, Aufgaben, Lerntage)');
    await versuche('02 Lernanalyse', async () => {
      await oben(page, 'Gesamtübersicht', 16);
      await bild(page, '02-eltern-kinder', 5, 'lernanalyse', 'Kind Mia: Lernanalyse (Premium)');
    });
    await ctx.close();
  }

  // 03 Kind: Runde, Anfrage
  {
    const { page, ctx } = await anmelden('child');
    await page.waitForTimeout(2500);
    await bild(page, '03-kind-lernt', 1, 'start', 'Kind: Startseite mit Klecksi, Zeit-Uhr, „Lernen starten“');
    await page.getByRole('button', { name: 'Lernen starten' }).click();
    await page.waitForTimeout(800);
    await bild(page, '03-kind-lernt', 2, 'fachwahl', 'Kind: Fach wählen');
    await page.getByText('Mathe', { exact: true }).first().click();
    await page.locator('h1.frage-text').waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    await bild(page, '03-kind-lernt', 3, 'aufgabe', 'Kind: Aufgabe mit Antwortmöglichkeiten');
    for (let i = 0; i < RUNDE.length; i++) {
      const text = await page.locator('h1.frage-text').innerText({ timeout: 15000 });
      const f = RUNDE.find((x) => x.text === text.trim());
      if (!f) throw new Error(`Unbekannte Aufgabe: ${text}`);
      await page.waitForTimeout(3200);
      await page.getByRole('button', { name: f.richtig, exact: true }).first().click();
      if (i === 0) await bild(page, '03-kind-lernt', 4, 'antwort-gewaehlt', 'Kind: Antwort gewählt, „Prüfen“');
      await page.getByRole('button', { name: 'Prüfen' }).click();
      await page.waitForTimeout(900);
      if (i === 0) await bild(page, '03-kind-lernt', 5, 'richtig', 'Kind: richtige Antwort mit Erklärung');
      await page.getByRole('button', { name: /Weiter|Fertig/ }).last().click();
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(4500);
    await bild(page, '03-kind-lernt', 6, 'rundenende', 'Kind: Rundenende (verdiente Zeit, Tinte, Reise)');
    await ctx.close();
  }
  {
    const { page, ctx } = await anmelden('child');
    await page.waitForTimeout(2500);
    await oben(page, 'Min. anfragen', 220);
    await bild(page, '04-antrag-und-freigabe', 1, 'kind-verdient', 'Kind: „Heute verdient“ mit Knopf „… Min. anfragen“');
    await page.getByRole('button', { name: /Min\. anfragen/ }).click();
    await page.getByLabel(/Nachricht an deine Eltern/).fill(NACHRICHT);
    await page.waitForTimeout(600);
    await bild(page, '04-antrag-und-freigabe', 2, 'kind-anfrage-dialog', 'Kind: Dialog „Bildschirmzeit anfragen“ mit Nachricht');
    await page.getByRole('button', { name: /Min\. anfragen/ }).last().click();
    await page.waitForTimeout(1500);
    await bild(page, '04-antrag-und-freigabe', 3, 'kind-anfrage-offen', 'Kind: „Deine Anfrage … wartet auf deine Eltern“');
    await ctx.close();
  }

  // 04 Eltern: Anfrage genehmigen (iPhone mit Sperre, Android)
  for (const [variante, anpassen, nr] of [
    ['iphone', (d) => { mitIphoneSperre(d); d.screen_time_requests = [offeneAnfrage(8, NACHRICHT)]; }, 4],
    ['android', (d) => { mitAndroid(d); d.screen_time_requests = [offeneAnfrage(8, NACHRICHT)]; }, 7],
  ]) {
    const { page, ctx } = await anmelden('parent', anpassen);
    await bild(page, '04-antrag-und-freigabe', nr, `eltern-anfrage-${variante}`, `Eltern (${variante}): Heute, Anfrage von Mia mit „Genehmigen“ / „Ablehnen“`);
    await page.getByRole('button', { name: 'Genehmigen' }).first().click();
    await page.waitForTimeout(1200);
    await bild(page, '04-antrag-und-freigabe', nr + 1, `genehmigen-dialog-${variante}`,
      variante === 'iphone'
        ? 'Eltern (iPhone-Kind, Sperre läuft): Dialog nach „Genehmigen“, LernZeit gibt die Zeit selbst frei'
        : 'Eltern (Android-Kind): Dialog, Minuten in Family Link freigeben; im Browser ohne Knopf „Genehmigen & Family Link öffnen“ (der erscheint nur in der Android-App)');
    await page.getByRole('button', { name: 'Genehmigen', exact: true }).last().click();
    await page.waitForTimeout(1500);
    if (variante === 'iphone') await bild(page, '04-antrag-und-freigabe', nr + 2, 'genehmigt', 'Eltern: nach dem Genehmigen, keine offene Anfrage mehr');
    await ctx.close();
  }

  // 05 Eltern, iPhone-Kind mit laufender Sperre: Regeln, Handyzeit, Hinweis „Handysperre ist aus“
  {
    const { page, ctx } = await anmelden('parent', (d) => { mitIphoneSperre(d); });
    await page.getByRole('tab', { name: 'Kinder' }).click();
    await page.waitForTimeout(800);
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await versuche('05 Handyzeit', async () => {
      await oben(page, 'Handyzeit heute', 16);
      await bild(page, '05-iphone-sperre-eltern-sicht', 1, 'handyzeit-heute', 'Eltern: Kind → Übersicht → „Handyzeit heute“ (genutzt, Freiminuten, freigegeben)');
      await oben(page, 'Letzte 7 Tage', 16);
      await bild(page, '05-iphone-sperre-eltern-sicht', 2, 'letzte-7-tage', 'Eltern: „Letzte 7 Tage“ (genutzt)');
    });
    await page.getByRole('tab', { name: 'Regeln' }).click();
    await page.waitForTimeout(1500);
    await versuche('05 Freiminuten', async () => {
      await oben(page, 'Freiminuten', 16);
      await bild(page, '05-iphone-sperre-eltern-sicht', 3, 'regeln-freiminuten', 'Eltern: Kind → Regeln → Freiminuten (werktags, Wochenende)');
    });
    await versuche('05 Handysperre', async () => {
      await oben(page, 'Handysperre', 16);
      await bild(page, '05-iphone-sperre-eltern-sicht', 4, 'regeln-handysperre', 'Eltern: Kind → Regeln → Handysperre (Stand, +15 / +30 Min., „Heute ohne Limit“, Elterncode)');
    });
    await ctx.close();
  }
  {
    const { page, ctx } = await anmelden('parent', (d) => { mitIphoneSperre(d, false); });
    await page.waitForTimeout(1500);
    await oben(page, 'Heute gelernt', 120);
    await bild(page, '05-iphone-sperre-eltern-sicht', 5, 'heute-sperre-aus', 'Eltern: Heute, Zeile „Handysperre ist aus“ unter dem Namen (Sperre läuft nicht)');
    await page.getByRole('tab', { name: 'Kinder' }).click();
    await page.waitForTimeout(800);
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await bild(page, '05-iphone-sperre-eltern-sicht', 6, 'kind-sperre-aus', 'Eltern: Kind → Übersicht, Karte „Handysperre ist aus“ mit dem Weg zum Einrichten');
    await ctx.close();
  }

  // 06 Premium: Zeit je Fach, Tagesgrenze, Faecher, Lernplan
  {
    const { page, ctx } = await anmelden('parent');
    await page.getByRole('tab', { name: 'Kinder' }).click();
    await page.waitForTimeout(800);
    await page.getByText('Mia', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole('tab', { name: 'Regeln' }).click();
    await page.waitForTimeout(1500);
    await versuche('06 Tagesgrenze', async () => {
      await oben(page, 'Bildschirmzeit am Tag', 16);
      await bild(page, '06-premium', 1, 'tagesgrenze', 'Premium: Bildschirmzeit am Tag (Tagesgrenze werktags/Wochenende)');
    });
    await versuche('06 Faecher', async () => {
      await oben(page, 'Fächer und Zeit pro richtiger Aufgabe', 16);
      await bild(page, '06-premium', 2, 'faecher-zeit-je-fach', 'Premium: Fächer sichtbar, Schwerpunkt, Sekunden je richtiger Aufgabe je Fach');
    });
    await page.getByRole('tab', { name: 'Lernplan' }).click();
    await page.waitForTimeout(1500);
    await bild(page, '06-premium', 3, 'lernplan', 'Premium: Lernplan für die Klassenarbeit (Englisch, Farben und Zahlen) und Formular „KI-Lernplan erstellen“ (Fach, Thema, Fotos aus Heft oder Buch)');
    await ctx.close();
  }

  const fehltText = [
    '# Was in videopaket-screenshots fehlt oder vom Plan abweicht',
    '',
    `Stand ${heute()}. Die Aufnahmen kommen aus der echten App mit Beispieldaten (keine Testkonten, keine Passwörter). Der Aufnahmeplan (claude/videopaket-okt-2026.md) lag nicht vor; die Szenen folgen dem Ablauf aus dem Auftrag, die Zuordnung zu A1–A3 und B1–B7 steht aus.`,
    '',
    '## Nur mit echtem iPhone (Kinderkonto in der Familienfreigabe) aufzunehmen',
    '',
    '- Apples Familienfreigabe und das Kinderkonto (Einstellungen → Familie)',
    '- LernZeit auf dem Kinder-iPhone: Zahnrad → „Bildschirmzeit“ → Karte „Handy sperren“ → „Sperre einrichten“ (native Karte; im Browser steht dort nur die Anleitung)',
    '- Apples Abfrage der Bildschirmzeit-Kennung',
    '- Apples Auswahl „Was zählt als Handyzeit?“ („Alle Apps & Kategorien“, LernZeit abwählen)',
    '- der Sperrbildschirm mit gesperrten Apps und „Eltern fragen“ / „Anfrage ist raus“',
    '- das Handy, das sich nach dem Genehmigen öffnet („noch 25 Min.“), Mitteilungen „Noch 5 Minuten“ und „Noch 1 Minute“',
    '- Apples eigene Bildschirmzeit (Einstellungen → Bildschirmzeit) am Eltern-iPhone',
    '- Push-Mitteilungen auf dem Eltern-Handy (Anfrage, „Handysperre bei … ist aus“)',
    '',
    '## Nur mit Android-Gerät bzw. Google-App',
    '',
    '- Google Family Link: Kind wählen → „Bonuszeit“ → Minuten eintragen',
    '- „Genehmigen & Family Link öffnen“ in der Android-App (im Browser zeigt der Dialog nur „Genehmigen“ und den Hinweis)',
    '',
    ...(fehlt.length ? ['## Szenen, die in dieser Aufnahme nicht gelungen sind', '', ...fehlt.map((f) => `- ${f}`), ''] : []),
  ].join('\n');
  await writeFile(join(ZIEL, 'FEHLT.md'), fehltText + '\n');

  const index = ['# Aufgenommene Szenen', '', '| Ordner | Datei | Inhalt |', '|---|---|---|', ...liste.map((l) => `| ${l.szene} | ${l.datei} | ${l.beschreibung} |`), ''].join('\n');
  await writeFile(join(ZIEL, 'LISTE.md'), index);
  console.log(`Fertig: ${liste.length} Bilder in ${ZIEL}`);
} finally {
  await browser.close();
  vorschau.kill();
}
