/**
 * Prueft die Anzeige-Regeln von Klecksis Heftrand-Reise (src/lib/reise.ts,
 * src/lib/klecksi.ts, 11.10.2026) und dass Faltungen und Figurenpreise zu
 * den Datenbank-Funktionen passen (runde_belohnen, avatar_preis). Die
 * Vergabe selbst prueft die Datenbank; getestet per SQL mit Rollback.
 *
 *   node scripts/test-reise.mjs
 */
import * as esbuild from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const dir = await mkdtemp(join(tmpdir(), 'lernzeit-reise-'));
const laden = async (datei) => {
  const aus = join(dir, datei.replace(/\W/g, '_') + '.mjs');
  await esbuild.build({
    entryPoints: [datei], bundle: true, format: 'esm', outfile: aus, logLevel: 'error',
    alias: { '@': './src' }, external: ['react', 'react/jsx-runtime'],
  });
  return import(aus);
};
const reise = await laden('src/lib/reise.ts');
const klecksi = await laden('src/lib/klecksi.ts');
const feder = await laden('src/lib/federmaeppchen.ts');
const falten = await laden('src/lib/falten.ts');
const weihnachten = await laden('src/lib/weihnachten.ts');
const hefte = await laden('src/lib/hefte.ts');
const modus = await laden('src/lib/klecksiModus.ts');
const stand = await laden('src/lib/klecksiLernstand.ts');
const appHinweis = await laden('src/lib/appEmpfehlung.ts');
const geraete = await laden('src/lib/geraeteAnleitung.ts');
const notfall = await laden('src/lib/notfallcode.ts');
const handyzeit = await laden('src/lib/handyzeit.ts');
const appVerlassen = await laden('src/lib/appVerlassen.ts');
const sql = await readFile('supabase/migrations/20261011200000_klecksi_reise.sql', 'utf8');
// Neuere Fassungen von avatar_preis und sticker_waehlen, Adventskalender
const sqlAdvent = await readFile('supabase/migrations/20261011230000_weihnachten_advent.sql', 'utf8');

let fehler = 0;
const pruefe = (name, ist, soll) => {
  try { assert.deepStrictEqual(ist, soll); console.log('ok  ', name); }
  catch { fehler++; console.log('FEHLER', name, JSON.stringify(ist), '≠', JSON.stringify(soll)); }
};
const feld = (seite, feld, fach = 'math', quelle = 'runde') => ({ seite, feld, fach, quelle });

pruefe('ohne Felder: Seite 1', reise.aktuelleSeite([]), { seite: 1, felder: [] });
pruefe('6 Felder auf Seite 4', reise.aktuelleSeite([1, 2, 3, 4, 5, 6].map((f) => feld(4, f))).felder.length, 6);
pruefe('volle Seite: naechste leer', reise.aktuelleSeite(Array.from({ length: 12 }, (_, i) => feld(2, i + 1))), { seite: 3, felder: [] });
pruefe('Faecher, haeufigstes zuerst',
  reise.faecherAufSeite([feld(1, 1, 'english'), feld(1, 2, 'math'), feld(1, 3, 'math')]),
  [{ fach: 'math', anzahl: 2 }, { fach: 'english', anzahl: 1 }]);
pruefe('Seite 1 Papierflieger, Seite 9 wieder', [reise.faltungFuer(1), reise.faltungFuer(9)], ['papierflieger', 'papierflieger']);

// Reihenfolge der Faltungen wie in runde_belohnen
const sqlFaltungen = [...sql.match(/v_faltungen text\[\] := array\[([^\]]+)\]/s)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Faltungen wie in der Datenbank', [...reise.FALTUNGEN], sqlFaltungen);
// Preise wie in avatar_preis
const preisSql = sqlAdvent.match(/function public\.avatar_preis[\s\S]*?\$\$;/)[0];
const sqlPreise = Object.fromEntries([...preisSql.matchAll(/when '([a-z_]+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
pruefe('Figurenpreise wie in der Datenbank', feder.AVATAR_PREIS, sqlPreise);
pruefe('8 Figuren frei', Object.values(feder.AVATAR_PREIS).filter((p) => p === 0).length, 8);

const lage = { name: 'Mia', felderGemalt: 11, faltung: 'papierschiff', faecherAufSeite: 2, berichtigung: 3, lernplanFach: 'Englisch' };
const saetze = klecksi.startSaetze(lage);
pruefe('Satz: 1 Feld bis zur Faltung', saetze[1], 'Noch 1 Feld, dann falte ich dir ein Papierschiff.');
pruefe('Satz: bunte Seite', saetze.includes('Noch ein Fach, dann wird die Seite bunt!'), true);
pruefe('Satz: Lernplan doppelt', saetze.includes('Dein Lernplan in Englisch zählt doppelt.'), true);
pruefe('Satz: Berichtigung', saetze.includes('3 kleine Kleckse warten in der Berichtigung.'), true);
pruefe('Runde 2/5: Mut', klecksi.rundenSatz({ richtig: 2, gesamt: 5, geschafft: false }).stimmung, 'mut');
pruefe('Runde 5/5: Jubel', klecksi.rundenSatz({ richtig: 5, gesamt: 5, geschafft: true }).stimmung, 'jubel');
pruefe('Seite fertig: Faltung im Satz', klecksi.rundenSatz({ richtig: 3, gesamt: 5, geschafft: true, faltung: 'katze' }).satz,
  'Seite fertig! Ich falte dir eine Katze.');

// Jede Faltung hat eine Anleitung, jeder Schritt laesst Papier uebrig
pruefe('Anleitung fuer jede Faltung', reise.FALTUNGEN.filter((f) => !falten.MODELLE[f]), []);
for (const [id, m] of Object.entries(falten.MODELLE)) {
  let ok = true;
  for (let i = 0; i <= m.schritte.length; i++) {
    const z = falten.zustandNach(m, i);
    const flaeche = z.flaechen.reduce((s, f) => s + falten.flaecheninhalt(f.pts), 0);
    if (!(flaeche > 500) || z.flaechen.some((f) => f.pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1])))) ok = false;
  }
  pruefe(`Faltanleitung ${id}: jeder Schritt gueltig`, ok, true);
}

// Weihnachtszeit und Adventskalender (gleiche Regeln wie in der Datenbank)
const tag = (t) => new Date(`${t}T12:00:00+01:00`);
pruefe('Weihnachtszeit 30.11. nein, 1.12. ja, 26.12. ja, 27.12. nein, 3.1. nein',
  ['2026-11-30', '2026-12-01', '2026-12-26', '2026-12-27', '2027-01-03'].map((t) => weihnachten.istWeihnachtszeit(tag(t))), [false, true, true, false, false]);
pruefe('Berliner Datum: 30.11. 23:30 UTC ist schon der 1.12.', weihnachten.istWeihnachtszeit(new Date('2026-11-30T23:30:00Z')), true);
pruefe('Tuerchen offen bis: 3.12. → 3, 26.12. → 24, 27.12. → 0, Januar → 0, Oktober → 0',
  ['2026-12-03', '2026-12-26', '2026-12-27', '2027-01-05', '2026-10-11'].map((t) => weihnachten.adventOffenBis(tag(t))), [3, 24, 0, 0, 0]);
const sqlAdventSticker = [...sqlAdvent.match(/function public\.advent_sticker[\s\S]*?array\[([^\]]+)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Weihnachtszeit in der Datenbank bis 26.12.', /month from p_tag\) = 12 and extract\(day from p_tag\) <= 26/.test(sqlAdvent), true);
pruefe('Tuerchen-Sticker wie in der Datenbank', [...weihnachten.ADVENT_STICKER], sqlAdventSticker);
pruefe('Tuerchen 13 wie Tuerchen 1', weihnachten.adventSticker(13), weihnachten.adventSticker(1));
pruefe('Figuren hinter Tuerchen 6 und 24', [6, 24, 7].map(weihnachten.adventAvatar), ['weihnachtsmann', 'tannenbaum', null]);
pruefe('Tuerchen-Figuren haben einen Preis', [weihnachten.adventAvatar(6), weihnachten.adventAvatar(24)].every((a) => feder.AVATAR_PREIS[a] > 0), true);
const katalogSql = (name) => [...sqlAdvent.match(new RegExp(`${name} text\\[\\] := array\\[([^\\]]+)\\]`))[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
pruefe('Sticker-Katalog wie in sticker_waehlen', Object.keys(hefte.STICKER).sort(), [...katalogSql('v_katalog'), ...katalogSql('v_weihnachten')].sort());
pruefe('Weihnachts-Sticker wie in sticker_waehlen', hefte.WEIHNACHTS_STICKER, katalogSql('v_weihnachten'));
pruefe('Ausserhalb der Weihnachtszeit keine Weihnachts-Sticker zur Wahl',
  hefte.stickerZurWahl(false).some((id) => hefte.WEIHNACHTS_STICKER.includes(id)), false);
pruefe('In der Weihnachtszeit die weihnachtlichen zuerst', hefte.stickerZurWahl(true).slice(0, 12), hefte.WEIHNACHTS_STICKER);
const f1 = weihnachten.adventFaecher(['math', 'german', 'english']);
pruefe('5 Faecher, jedes der 3 dabei, keines doppelt hintereinander',
  [f1.length, new Set(f1).size, f1.every((f, i) => i === 0 || f !== f1[i - 1])], [5, 3, true]);
pruefe('Ein Fach: 5 mal dasselbe', weihnachten.adventFaecher(['math']), ['math', 'math', 'math', 'math', 'math']);
const w = (monat, t, tuerenZu = 0) => klecksi.startSaetze({ ...lage, weihnachten: { monat, tag: t, tuerenZu } });
pruefe('Satz: Tage bis Heiligabend', w(12, 3).includes('Noch 21 Tage bis Heiligabend!'), true);
pruefe('Satz: Morgen ist Heiligabend', w(12, 23).includes('Morgen ist Heiligabend!'), true);
pruefe('Satz: Tuerchen warten', w(12, 5, 2).includes('2 Türchen im Adventskalender warten auf dich.'), true);
pruefe('Satz: Frohe Weihnachten am 25.12.', w(12, 25).includes('Frohe Weihnachten!'), true);
pruefe('Ohne Weihnachtszeit kein Weihnachtssatz', klecksi.startSaetze(lage).some((x) => /Weihnacht|Türchen|Heiligabend/.test(x)), false);

// Klecksi an oder aus (aeltere Kinder)
pruefe('Klecksi automatisch: Klasse 6 an, Klasse 7 aus', [modus.klecksiAn(null, 6), modus.klecksiAn(null, 7)], [true, false]);
pruefe('Klecksi: Wahl des Kindes gilt', [modus.klecksiAn('an', 9), modus.klecksiAn('aus', 2)], [true, false]);
pruefe('Klecksi ohne Klasse (Startseite, Demo): an', modus.klecksiAn(null, null), true);
const ohne = (o) => klecksi.rundenSatz(o, false).satz;
pruefe('Ohne Klecksi: kein „ich“ und kein Klecksi in den Saetzen',
  [ohne({ richtig: 2, gesamt: 5, geschafft: false }), ohne({ richtig: 5, gesamt: 5, geschafft: true }),
   ohne({ richtig: 3, gesamt: 5, geschafft: true }), ohne({ richtig: 3, gesamt: 5, geschafft: true, faltung: 'katze' })]
    .some((x) => /\b(ich|Ich|mir|Klecksi)\b/.test(x)), false);
pruefe('Ohne Klecksi: Faltung im Satz', ohne({ richtig: 3, gesamt: 5, geschafft: true, faltung: 'katze' }), 'Seite fertig! Neu im Regal: Katze.');

// Klecksi als Lerntage (ersetzt die Lernpflanze): Groesse und Glanz nach 3, 7, 14, 30 Tagen,
// blass, trocknet, trocken bei Pausen, wieder farbig nach einer Runde
pruefe('Stufen nach Tagen: 0,2 | 3,6 | 7,13 | 14,29 | 30,99',
  [0, 2, 3, 6, 7, 13, 14, 29, 30, 99].map(stand.stufeFuer), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
pruefe('Heute gelernt: frisch, Stufe nach Tagen', [stand.lernStand(0, 0), stand.lernStand(5, 0), stand.lernStand(31, 0)],
  [{ stufe: 0, frische: 'frisch' }, { stufe: 1, frische: 'frisch' }, { stufe: 4, frische: 'frisch' }]);
pruefe('1 Tag Pause: blass, Stufe bleibt', stand.lernStand(8, 1), { stufe: 2, frische: 'blass' });
pruefe('2 Tage Pause: trocknet, Stufe bleibt', stand.lernStand(15, 2), { stufe: 3, frische: 'trocknet' });
pruefe('Ab 3 Tagen Pause: trocken und klein (Kette bei 0)', [stand.lernStand(0, 3), stand.lernStand(20, 3), stand.lernStand(0, 40)],
  [{ stufe: 0, frische: 'trocken' }, { stufe: 0, frische: 'trocken' }, { stufe: 0, frische: 'trocken' }]);
pruefe('Noch nie gelernt: frisch, nicht trocken', stand.lernStand(0, 0, false), { stufe: 0, frische: 'frisch' });
pruefe('Eine Runde nach langer Pause: wieder farbig, Stufe 0', stand.lernStand(1, 0), { stufe: 0, frische: 'frisch' });
pruefe('Passiv nur bei trocknet und trocken',
  ['frisch', 'blass', 'trocknet', 'trocken'].map((f) => stand.istPassiv({ stufe: 2, frische: f })), [false, false, true, true]);
pruefe('Rettbar bei 1–2 Tagen Pause mit Kette', [stand.istRettbar(4, 0), stand.istRettbar(4, 1), stand.istRettbar(4, 2), stand.istRettbar(0, 3), stand.istRettbar(0, 1)],
  [false, true, true, false, false]);
pruefe('Massstab waechst mit der Stufe und schrumpft mit der Frische',
  [0, 1, 2, 3, 4].map((st) => stand.massstab({ stufe: st, frische: 'frisch' })).every((m, i, a) => i === 0 || m > a[i - 1]), true);
pruefe('Trockener Klecksi ist kleiner als jeder frische',
  stand.massstab({ stufe: 0, frische: 'trocken' }) < stand.massstab({ stufe: 0, frische: 'frisch' }), true);
pruefe('Kein Stufenname ist doppelt', new Set(stand.KLECKS_STUFEN.map((x) => x.name)).size, 5);
pruefe('Naechste Stufe: bei 5 Tagen die ab 7, bei 30 keine', [stand.naechsteStufe(5)?.ab, stand.naechsteStufe(30)], [7, undefined]);
const alleTexte = [];
for (const f of ['frisch', 'blass', 'trocknet', 'trocken']) for (const tage of [0, 4]) for (const mk of [true, false]) {
  const z = { stufe: 1, frische: f };
  alleTexte.push(stand.stufenTitel(z, tage, mk), stand.stufenSatz(z, tage, mk), stand.stufenErklaerung(z, tage, mk));
}
pruefe('Texte ohne Leid und Druck (kein tot, krank, traurig, verloren, Strafe)',
  alleTexte.some((t) => /\b(tot|stirbt|krank|traurig|verloren|weint|leidet|Strafe|schade)\b/i.test(t)), false);
pruefe('Ohne Klecksi kommt der Name nicht vor',
  alleTexte.filter((t, i) => i % 6 >= 3).some((t) => /Klecksi/.test(t)), false);
pruefe('Titel: blass, trocknet, trocken',
  ['blass', 'trocknet', 'trocken'].map((f) => stand.stufenTitel({ stufe: 2, frische: f }, 9)),
  ['Klecksi wird blass', 'Klecksi trocknet', 'Klecksi ist eingetrocknet']);

// Hinweis auf die App im Browser: Geraet erkennen, passende Store-Links
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
pruefe('Geraet: Android, iPhone, iPad als Mac (Touch), Mac ohne Touch',
  [appHinweis.erkenneGeraet(UA_ANDROID, 5), appHinweis.erkenneGeraet(UA_IPHONE, 5), appHinweis.erkenneGeraet(UA_MAC, 5), appHinweis.erkenneGeraet(UA_MAC, 0)],
  ['android', 'ios', 'ios', 'andere']);
pruefe('Store-Links: iPhone nur App Store, Android nur Google Play, Computer beide',
  ['ios', 'android', 'andere'].map((g) => appHinweis.storeLinksFuer(g).map((l) => l.id).join('+')), ['ios', 'android', 'ios+android']);
pruefe('Google-Play-Link traegt die Quelle des Hinweises, App-Store-Link bleibt wie auf der Startseite',
  [appHinweis.storeLinksFuer('android', 'web_spiel')[0].url.endsWith('utm_source=web_spiel'), appHinweis.storeLinksFuer('ios')[0].url === appHinweis.APP_STORE_URL], [true, true]);
pruefe('Banner bleibt weg, sobald der Hinweis gezeigt wurde',
  (() => { const v = appHinweis.hinweisWurdeGezeigt(); let n = 0; const ab = appHinweis.beiHinweisGezeigt(() => n++); appHinweis.merkeHinweisGezeigt(); appHinweis.merkeHinweisGezeigt(); ab(); return [v, appHinweis.hinweisWurdeGezeigt(), n]; })(),
  [false, true, 1]);

// Sperre und Freigabe: Loesung statt Fehler, abhaengig vom Endgeraet
const e = (plattform, ua = '', touch = 0) => geraete.endgeraetVon(plattform, ua, touch);
pruefe('Endgeraet: App iOS/Android, Browser iPhone/Android/Computer',
  [e('ios'), e('android'), e('web', UA_IPHONE, 5), e('web', UA_ANDROID, 5), e('web', UA_MAC, 0)],
  [{ system: 'ios', nativ: true }, { system: 'android', nativ: true }, { system: 'ios', nativ: false }, { system: 'android', nativ: false }, { system: 'andere', nativ: false }]);
const karten = [e('ios'), e('android'), e('web', UA_IPHONE, 5), e('web', UA_ANDROID, 5), e('web', UA_MAC, 0)].map(geraete.kindGeraetAnleitung);
pruefe('Kindersicherung: iPhone Apple Bildschirmzeit, Android Family Link, Computer beides',
  [karten[0].schritte.join(' ').includes('Bildschirmzeit'), karten[0].schritte.join(' ').includes('Family Link'),
   karten[1].schritte.join(' ').includes('Family Link'), karten[1].schritte.join(' ').includes('Einstellungen → Bildschirmzeit'),
   karten[4].schritte.length === 2],
  [true, false, true, false, true]);
pruefe('Immer ein Elternteil und die Schritte, nie nur ein „geht nicht“',
  karten.every((k) => /Elternteil/.test(k.text) && k.schritte.length >= 2), true);
const sperre = (g, ger) => geraete.sperreNichtMoeglich(g, ger);
pruefe('Sperre nicht moeglich: Browser/Computer verweist auf die App, alte iOS auf das Update, alte App auf das Update',
  [sperre('platform', e('web', UA_MAC, 0)).schritte[0].includes('App Store'), sperre('os-version', e('ios')).schritte[0].includes('Softwareupdate'),
   sperre('plugin-missing', e('ios')).schritte[0].includes('aktualisieren'), sperre('platform', e('android')).text.includes('Family Link')],
  [true, true, true, true]);
pruefe('Apple-Ablehnung: jede Meldung nennt einen naechsten Schritt (kein nackter Fehler)',
  ['invalidAccountType', 'authorizationCanceled', 'authorizationConflict', 'restricted', 'authenticationMethodUnavailable', 'networkError', 'unavailable', 'irgendwas']
    .map(geraete.appleAblehnung).every((t) => /(Das Elternteil|Tippe|Richte|Verbinde|Aktualisiere|Versuche)/.test(t)), true);
const wegIos = geraete.freigabeWeg('ios', 'Mia');
const wegAndroid = geraete.freigabeWeg('android', 'Mia');
pruefe('Freigabe am Eltern-Geraet: ein kurzer Satz sichtbar, Schritte mit Namen zum Aufklappen',
  [wegIos.kurz.length < 70, wegAndroid.kurz.length < 70, wegIos.schritte.some((t) => t.includes('Mia') && t.includes('Code')),
   wegAndroid.schritte.some((t) => t.includes('Mia')), wegIos.kurz.includes('Bildschirmzeit'), wegAndroid.kurz.includes('Family Link')],
  [true, true, true, true, true, true]);
pruefe('Keine Platzhalter wie [Kind] in den Texten',
  [...karten.flatMap((k) => [k.text, ...k.schritte]), ...wegIos.schritte, ...wegAndroid.schritte].some((t) => /\[|\]/.test(t)), false);
pruefe('Kindersicherung: vorne hoechstens ein kurzer Satz',
  karten.every((k) => k.text.length <= 80 && !k.text.includes('. ')), true);
pruefe('Nach einem Fehler steht der Schritt vorn und der Rohtext hinten',
  [geraete.nachFehler('Boom').startsWith('Versuche es noch einmal'), geraete.nachFehler('Boom').endsWith('(Boom)')], [true, true]);

// ── Handysperre: Notfallcode und Tagesbudget (17.10.2026) ──
{
  const { createHmac, createHash, randomBytes } = await import('node:crypto');
  const zufall = randomBytes(77);
  pruefe('SHA-256 wie Node', Buffer.from(notfall.sha256(new Uint8Array(zufall))).toString('hex'), createHash('sha256').update(zufall).digest('hex'));
  pruefe('SHA-256 leer', Buffer.from(notfall.sha256(new Uint8Array(0))).toString('hex'), createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
  const k = randomBytes(20); const n = randomBytes(130);
  pruefe('HMAC-SHA-256 wie Node', Buffer.from(notfall.hmacSha256(new Uint8Array(k), new Uint8Array(n))).toString('hex'), createHmac('sha256', k).update(n).digest('hex'));
  // Feste Werte aus notfallcode_berechnen() in der Datenbank (17.10.2026)
  const sqlSchluessel = notfall.hexZuBytes('3132333435363738393031323334353637383930');
  pruefe('Codes wie in der Datenbank',
    [0, 1, 59, 1111111109, 987654321, 29112233].map((z) => notfall.codeFuerZaehler(sqlSchluessel, z)),
    ['875740', '247374', '465435', '394941', '167984', '192273']);
  const hex = '3132333435363738393031323334353637383930';
  const t = 29112233 * 1800 * 1000 + 600_000; // 10 Min. in Schritt 29112233
  pruefe('Code gilt im eigenen, im naechsten und im vorigen Schritt (mind. 30 Min.)',
    [notfall.codePasst(hex, '192273', t), notfall.codePasst(hex, '192 273', t + 1800_000), notfall.codePasst(hex, '192273', t - 1800_000),
     notfall.codePasst(hex, '192273', t + 2 * 1800_000), notfall.codePasst(hex, '192274', t), notfall.codePasst(hex, '19227', t)],
    [true, true, true, false, false, false]);
  let fv = { anzahl: 0, gesperrtBis: 0 };
  for (let i = 0; i < 5; i++) fv = notfall.nachFehlversuch(fv, 1000);
  pruefe('Nach 5 falschen Codes 15 Min. Pause', [notfall.istGesperrt(fv, 1000 + 14 * 60_000), notfall.istGesperrt(fv, 1000 + 15 * 60_000 + 1)], [true, false]);

  const sa = new Date(2026, 9, 17, 10, 0); const mo = new Date(2026, 9, 19, 0, 5);
  pruefe('Tag in Ortszeit', [handyzeit.tagSchluessel(sa), handyzeit.tagSchluessel(mo)], ['2026-10-17', '2026-10-19']);
  pruefe('Freiminuten Wochenende eigener Wert, sonst wie werktags',
    [handyzeit.freiminutenHeute(30, 60, sa), handyzeit.freiminutenHeute(30, null, sa), handyzeit.freiminutenHeute(30, 60, mo)], [60, 30, 30]);
  pruefe('Zusatz zaehlt erst ab 0 Uhr Ortszeit',
    handyzeit.zusatzHeute([{ minuten: 15, zeit: new Date(2026, 9, 18, 23, 59).toISOString() }, { minuten: 30, zeit: new Date(2026, 9, 19, 0, 1).toISOString() }], mo), 30);
  pruefe('Stand-Texte',
    [handyzeit.standText({ budget: 60, genutzt: 35, aufgebraucht: false }), handyzeit.standText({ budget: 60, genutzt: 55, aufgebraucht: true }),
     handyzeit.standText({ budget: 1500, genutzt: 10, aufgebraucht: false })],
    ['noch 25 Min. (35 von 60 genutzt)', 'Für heute aufgebraucht', 'Heute ohne Limit']);
  const swift = await readFile('native/screen-time/ios/Sources/ScreenTimePlugin/ScreenTimeShared.swift', 'utf8');
  pruefe('Swift: „ohne Limit“ ab derselben Grenze', swift.includes(`ohneLimitMinuten = ${handyzeit.OHNE_LIMIT_MINUTEN}`), true);
}

// ── App verlassen statt Lösezeit abziehen (20.10.2026) ──
pruefe('App verlassen: erst ab 5 Sekunden, nie ohne Weggehen',
  [appVerlassen.zuLangeWeg(1000, 5999), appVerlassen.zuLangeWeg(1000, 6000), appVerlassen.zuLangeWeg(null, 99999)],
  [false, true, false]);
pruefe('Verdient: nur richtige Aufgaben mit Zeit, Lösezeit zählt nicht',
  [appVerlassen.verdienteSekunden(4, 0, 30), appVerlassen.verdienteSekunden(4, 1, 30), appVerlassen.verdienteSekunden(1, 3, 30)],
  [120, 90, 0]);

if (fehler) { console.error(`${fehler} Fehler`); process.exit(1); }
