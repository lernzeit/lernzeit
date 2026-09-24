/**
 * Tests der Werbetext-Regeln.
 *
 * Zwei Richtungen, beide gleich wichtig:
 *   - Die freigegebenen Motive muessen durchgehen. Eine Regel, die einen
 *     abgenommenen Text blockiert, ist falsch — nicht der Text.
 *   - Die typischen Fehltritte muessen anschlagen, und zwar mit der RICHTIGEN
 *     Regel. Ein Befund mit falschem Verweis schickt den Menschen an die
 *     falsche Stelle im Dokument.
 *
 * Ausfuehren: npm run test:edge
 */

import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { istSchaltbar, pruefeMotiv, type Motiv } from './ad-rules.ts';

/**
 * Die fuenf Motive, wie sie am 24.09.2026 freigegeben wurden
 * (docs/verkaufstest.md, Abschnitt 4.3). Hier als feste Momentaufnahme:
 * Aendert sich eine Regel so, dass einer dieser Texte blockiert wird, soll
 * dieser Test das zeigen — und zwar bevor jemand die Freigabe unterlaeuft.
 */
const FREIGEGEBEN: Record<string, Motiv> = {
  M1: {
    ueberschrift: '18 Uhr. Das Handy soll weg. Sie wissen, wie der Abend jetzt läuft.',
    text: 'Bei LernZeit verdient Ihr Kind sich die Zeit selbst: 30 Sekunden Handyzeit je richtig gelöster Aufgabe. 4 Wochen kostenlos.',
  },
  M2: {
    ueberschrift: 'Ich habe aufgehört zu diskutieren.',
    text: 'Meine Tochter rechnet jetzt zehn Aufgaben, wenn sie länger aufs Handy will. Die Zeit schreibt die App gut, nicht ich. 2,99 € im Monat.',
  },
  M3: {
    ueberschrift: 'Nicht weniger Handy. Anders verdientes Handy.',
    text: 'Richtige Antwort, Zeit aufs Konto. Klasse 1 bis 10, alle Fächer der jeweiligen Klassenstufe. 4 Wochen kostenlos testen.',
  },
  M4: {
    ueberschrift: 'Wie viel Zeit eine Aufgabe wert ist, legen Sie fest.',
    text: 'Standard sind 30 Sekunden. In Mathe mehr, in Deutsch weniger — Ihre Entscheidung, je Fach.',
  },
  M5: {
    ueberschrift: 'Das Handy war schon immer die Währung. Jetzt hat sie einen Kurs.',
    text: 'Aufgaben lösen, Zeit verdienen. Daten auf Servern in Frankfurt.',
  },
};

for (const [id, motiv] of Object.entries(FREIGEGEBEN)) {
  Deno.test(`freigegeben ${id}: kein Verstoss`, () => {
    const verstoesse = pruefeMotiv(motiv).filter((b) => b.schwere === 'verstoss');
    assertEquals(verstoesse, [], `${id} wurde freigegeben und darf nicht blockiert werden`);
  });
}

Deno.test('freigegeben M4: der Gedankenstrich ist ein Hinweis, kein Verstoss', () => {
  const befunde = pruefeMotiv(FREIGEGEBEN.M4);
  assert(befunde.some((b) => b.regel === '4.2' && b.schwere === 'hinweis' && b.fundstelle === '—'));
});

/**
 * Typische Fehltritte, jeder mit der Regel, die anschlagen MUSS. Die Beispiele
 * sind so gewaehlt, wie ein Sprachmodell sie tatsaechlich schreibt — plausibel
 * klingend und genau deshalb gefaehrlich.
 */
const FEHLTRITTE: Array<[string, Motiv, string]> = [
  ['30 Tage statt 4 Wochen', { ueberschrift: '30 Tage kostenlos testen', text: 'Probieren Sie es aus.' }, 'V3'],
  // Ohne „kostenlos": Hier greift NUR die 30-Tage-Regel. Der Fall darueber
  // wird zusaetzlich von „kostenlos ohne 4 Wochen" gefangen und wuerde eine
  // kaputte 30-Tage-Regel deshalb nicht bemerken.
  ['30 Tage, allein', { ueberschrift: '30 Tage testen', text: 'Danach 2,99 € im Monat.' }, 'V3'],
  ['ein Monat statt 4 Wochen', { ueberschrift: 'Einen Monat kostenlos', text: 'Ohne Risiko.' }, 'V3'],
  ['falsche Wochenzahl', { ueberschrift: '2 Wochen testen', text: '4 Wochen kostenlos.' }, 'V3'],
  ['kostenlos ohne 4 Wochen', { ueberschrift: 'Kostenlos lernen', text: 'Aufgaben lösen, Zeit verdienen.' }, 'V3'],
  ['falscher Preis', { ueberschrift: 'Nur 1,99 € im Monat', text: 'Günstig.' }, 'V4'],
  ['Preis ohne Cent', { ueberschrift: 'Für 3 € im Monat', text: 'Jederzeit kündbar.' }, 'V4'],
  ['falsche Sekunden', { ueberschrift: '60 Sekunden je Aufgabe', text: 'Zeit verdienen.' }, 'V2'],
  ['alle Fächer ohne Zusatz', { ueberschrift: 'Alle Fächer, eine App', text: 'Aufgaben lösen.' }, 'V6'],
  ['Klassenstufe außerhalb', { ueberschrift: 'Klasse 1 bis 13', text: 'Für alle Schüler.' }, 'V6'],
  ['automatische Freigabe', { ueberschrift: 'Zeit wird automatisch freigegeben', text: 'Kein Aufwand.' }, '6.1'],
  ['Handysperre', { ueberschrift: 'LernZeit sperrt das Handy', text: 'Bis die Aufgaben gelöst sind.' }, '6.1'],
  ['Tagesgrenze als Zahl', { ueberschrift: 'Höchstens 30 Minuten am Tag', text: 'Klare Regeln.' }, '6.2'],
  ['Tagesgrenze ausgeschrieben', { ueberschrift: 'Dreißig Minuten täglich', text: 'Mehr nicht.' }, '6.2'],
  ['Tagesgrenze mit maximal', { ueberschrift: 'Maximal 60 Minuten', text: 'Klare Regeln.' }, '6.2'],
  ['Superlativ', { ueberschrift: 'Die beste Lern-App', text: 'Für Ihr Kind.' }, '6.3'],
  ['Die einzige', { ueberschrift: 'Die einzige App, die das kann', text: 'Überzeugen Sie sich.' }, '6.3'],
  ['Noten', { ueberschrift: 'Bessere Noten in 4 Wochen', text: 'Einfach testen.' }, '6.4'],
  ['Prozent', { ueberschrift: '40 % mehr Übung', text: 'Ganz nebenbei.' }, '6.4'],
  ['Studie', { ueberschrift: 'Laut Studie wirksam', text: 'Aufgaben lösen.' }, '6.4'],
  ['Testimonial mit Absender', { ueberschrift: '„Endlich Ruhe am Abend." — Anna', text: 'Sagen unsere Eltern.' }, '6.5'],
  ['Mutter von', { ueberschrift: 'Endlich Ruhe', text: 'Sagt Julia, Mutter von zwei Kindern.' }, '6.5'],
  ['Nutzerzahl', { ueberschrift: 'Über 1.000 Familien', text: 'vertrauen uns schon.' }, '6.6'],
  ['Nutzerzahl ohne über', { ueberschrift: '500 Eltern nutzen LernZeit', text: 'Und Sie?' }, '6.6'],
  ['Sterne', { ueberschrift: '★★★★★ im App Store', text: 'Probieren Sie es.' }, '6.7'],
  ['Lernplan', { ueberschrift: 'Mit KI-Lernplan', text: 'Individuell für Ihr Kind.' }, '6.8'],
  ['DSGVO-Siegel', { ueberschrift: 'DSGVO-konform', text: 'Ihre Daten sind sicher.' }, 'Datenschutz'],
  ['Ausrufezeichen in der Überschrift', { ueberschrift: 'Jetzt starten!', text: '4 Wochen kostenlos testen.' }, '8'],
];

for (const [name, motiv, regel] of FEHLTRITTE) {
  Deno.test(`Fehltritt „${name}" schlaegt als ${regel} an`, () => {
    const befunde = pruefeMotiv(motiv);
    const treffer = befunde.filter((b) => b.regel === regel && b.schwere === 'verstoss');
    assert(treffer.length > 0, `erwartet Verstoss ${regel}, bekommen: ${JSON.stringify(befunde)}`);
    assertEquals(istSchaltbar(motiv), false);
  });
}

/** Stilfragen: duerfen anschlagen, aber nur als Hinweis. */
const STILFRAGEN: Array<[string, Motiv]> = [
  ['KI-Vokabular', { ueberschrift: 'Mühelos lernen', text: '4 Wochen kostenlos testen.' }],
  ['nicht nur … sondern auch', { ueberschrift: 'Mehr als Mathe', text: 'Nicht nur Mathe, sondern auch Deutsch.' }],
  ['Dreiklang', { ueberschrift: 'Lernen ohne Streit', text: 'Einfach, schnell und sicher.' }],
  ['Emoji', { ueberschrift: 'Lernen und Zeit verdienen', text: 'Aufgaben lösen 📚' }],
  ['Angst', { ueberschrift: 'Handysucht bei Kindern', text: 'Die Angst vieler Eltern.' }],
  ['Duzen', { ueberschrift: 'Dein Kind verdient Zeit', text: 'Du legst fest, wie viel. 4 Wochen kostenlos testen.' }],
  // Wortgleich aus dem ersten Generatorlauf vom 24.09.2026.
  ['erfundene Eigenschaft', { ueberschrift: 'Die Einrichtung dauert nur einen Moment.', text: 'Sie verbinden Ihr Handy über einen Einladungscode mit dem Kind. 4 Wochen kostenlos testen.' }],
  ['kinderleicht', { ueberschrift: 'Kinderleicht eingerichtet', text: '4 Wochen kostenlos testen.' }],
  // Beide wortgleich aus dem zweiten Generatorlauf vom 24.09.2026.
  ['Kinderflehen, keine Grenze', { ueberschrift: 'Nur noch fünf Minuten.', text: 'Ihr Kind will mehr Bildschirmzeit. 2,99 € im Monat.' }],
  ['Hausaufgaben', { ueberschrift: 'Es ist 15 Uhr. Hausaufgabenzeit.', text: 'Richtige Antworten verdienen Bildschirmzeit.' }],
];

for (const [name, motiv] of STILFRAGEN) {
  Deno.test(`Stilfrage „${name}" ist Hinweis, nicht Verstoss`, () => {
    const befunde = pruefeMotiv(motiv);
    assert(befunde.some((b) => b.schwere === 'hinweis'), `erwartet einen Hinweis, bekommen: ${JSON.stringify(befunde)}`);
    assertEquals(istSchaltbar(motiv), true);
  });
}

Deno.test('Ausrufezeichen nur im Text: Hinweis, kein Verstoss', () => {
  const befunde = pruefeMotiv({ ueberschrift: 'Lernen und Zeit verdienen', text: 'Probieren Sie es aus!' });
  assert(befunde.some((b) => b.regel === '8' && b.schwere === 'hinweis'));
  assert(!befunde.some((b) => b.regel === '8' && b.schwere === 'verstoss'));
});

Deno.test('Richtige Zahlen gehen durch', () => {
  const motiv: Motiv = {
    ueberschrift: '2,99 € im Monat',
    text: 'Oder 29,99 € im Jahr. Klasse 1 bis 10, 30 Sekunden je Aufgabe, 4 Wochen kostenlos.',
  };
  assertEquals(pruefeMotiv(motiv).filter((b) => b.schwere === 'verstoss'), []);
});

Deno.test('Uhrzeit und Aufgabenanzahl sind Szenendetails, keine Produktzahlen', () => {
  const motiv: Motiv = { ueberschrift: '18 Uhr, zehn Aufgaben', text: 'Und der Abend bleibt ruhig. 4 Wochen kostenlos testen.' };
  assertEquals(pruefeMotiv(motiv).filter((b) => b.schwere === 'verstoss'), []);
});
