/**
 * Regeln fuer Werbetexte — als Code statt als Absicht.
 *
 * Quelle ist `docs/positionierung.md`: Abschnitt 5 (was gesagt werden darf),
 * Abschnitt 6 (was nie gesagt wird), Abschnitt 8 (Tonalitaet) und dazu
 * `docs/verkaufstest.md`, Abschnitt 4.2 (woran man KI-Text erkennt).
 *
 * ── Warum als Code ───────────────────────────────────────────────────────
 *
 * Die Regeln standen bisher nur im Dokument. Ein Mensch liest sie einmal, ein
 * Sprachmodell gar nicht — und ein generierter Text, der „Bessere Noten in
 * vier Wochen" verspricht, klingt plausibel genug, um durchzurutschen. Hier
 * wird jeder Text geprueft, egal woher er kommt: von Hand, aus dem Generator,
 * aus einer spaeteren Aenderung an einem freigegebenen Motiv.
 *
 * ── Zwei Schweregrade ────────────────────────────────────────────────────
 *
 *   verstoss   Der Text darf so nicht geschaltet werden. Abschnitt 6 und die
 *              Pflicht-Wortlaute aus Abschnitt 5.
 *   hinweis    Stilfrage. Der Text wirkt vermutlich nach KI oder bricht die
 *              Tonalitaet, ist aber nicht unzulaessig. Freigegebene Motive
 *              duerfen Hinweise tragen — die Entscheidung liegt beim Menschen.
 *
 * ── Was hier NICHT geprueft werden kann ──────────────────────────────────
 *
 * Ob eine Aussage inhaltlich durch V1 bis V9 gedeckt ist, laesst sich mit
 * Mustern nicht beweisen. Geprueft wird, was sich pruefen laesst: Zahlen,
 * Wortlaute, verbotene Formulierungen. Die inhaltliche Deckung bleibt eine
 * menschliche Freigabe. Diese Pruefung ersetzt sie nicht, sie faengt nur ab,
 * was nie bis zu ihr kommen sollte.
 *
 * Keine Deno-APIs in dieser Datei: Sie wird von der Edge Function
 * `generate-ad-motifs` UND unter Node von `scripts/pruefe-motive.mjs`
 * geladen.
 */

export type Schwere = 'verstoss' | 'hinweis';

export interface Motiv {
  ueberschrift: string;
  text: string;
}

export interface Befund {
  /** Verweis auf die Quelle, z. B. "6.4" oder "V3". */
  regel: string;
  schwere: Schwere;
  /** Die Textstelle, an der die Regel angeschlagen hat. */
  fundstelle: string;
  erklaerung: string;
}

/**
 * Die belegten Versprechen aus positionierung.md, Abschnitt 5.
 *
 * Wortgleich uebernommen, einschliesslich der Pflicht-Wortlaute. Der
 * Generator bekommt GENAU diese Liste als einzige zulaessige Faktenquelle.
 */
export const BELEGTE_VERSPRECHEN: ReadonlyArray<{ id: string; text: string; wortlaut?: string }> = [
  { id: 'V1', text: 'Kinder verdienen Bildschirmzeit durch richtige Antworten' },
  { id: 'V2', text: 'Standard 30 Sekunden je richtiger Aufgabe, von Eltern je Fach änderbar' },
  {
    id: 'V3',
    text: '4 Wochen kostenlos testen, keine Zahlungsdaten nötig',
    wortlaut: 'Immer „4 Wochen", nie „30 Tage" oder „ein Monat".',
  },
  { id: 'V4', text: '2,99 € im Monat oder 29,99 € im Jahr' },
  { id: 'V5', text: 'Beliebig viele Kinderprofile' },
  {
    id: 'V6',
    text: 'Alle Fächer der jeweiligen Klassenstufe, Klasse 1 bis 10',
    wortlaut: 'Nie „alle Fächer" ohne „der jeweiligen Klassenstufe".',
  },
  { id: 'V7', text: 'Daten liegen auf Servern in der EU (Frankfurt)' },
  { id: 'V8', text: 'Verknüpfung von Eltern und Kind über einen Einladungscode, 7 Tage gültig, einmalig' },
  {
    id: 'V9',
    text: 'Aufgaben passend zur Klassenstufe und zum Schuljahresfortschritt',
    wortlaut: 'Beschreibend, nie wertend: nicht „nie zu schwer".',
  },
];

/** Die Verbote aus positionierung.md, Abschnitt 6, fuer den Generator-Prompt. */
export const VERBOTE: ReadonlyArray<string> = [
  'Keine automatische Freigabe der verdienten Zeit andeuten, auch nicht durch Auslassung. Nicht behaupten, LernZeit sperre oder entsperre das Handy.',
  'Keine Tagesobergrenze als Zahl („30 Minuten am Tag"). Beworben wird, DASS Eltern die Grenze setzen, nicht welche.',
  'Keine Superlative: nicht „die einzige", „die erste", „die beste".',
  'Keine Lernerfolgs-Behauptungen: nicht „bessere Noten", keine Prozentzahlen, nicht „nachweislich wirksam".',
  'Keine erfundenen Zahlen, Zitate oder Testimonials. Keine Namen, kein „Mutter von zwei Kindern".',
  'Keine Nutzerzahlen, keine Nutzungsstatistiken, kein „über 1.000 Familien".',
  'Keine Bewertungen oder Sterne.',
  'Den KI-Lernplan nicht erwähnen.',
  'Nicht „kostenlos" oder „gratis" ohne „4 Wochen" — sonst klingt es nach dauerhaft kostenlos.',
  'Keine Datenschutz-Gütesiegel: nicht „DSGVO-konform", nicht „100 % sicher".',
];

interface Regel {
  regel: string;
  schwere: Schwere;
  /** Nur in der Überschrift pruefen (z. B. Ausrufezeichen). */
  nurUeberschrift?: boolean;
  muster: RegExp;
  erklaerung: string;
}

/**
 * Mustergestuetzte Regeln. Die Reihenfolge folgt dem Dokument, damit ein
 * Befund leicht zur Quelle zurueckzuverfolgen ist.
 */
const MUSTERREGELN: Regel[] = [
  // ── Abschnitt 6 — verbindlich ────────────────────────────────────────
  {
    regel: '6.1', schwere: 'verstoss', muster: /automatisch/i,
    erklaerung: 'Deutet eine automatische Freigabe an. Verdiente Zeit gibt heute ein Elternteil frei.',
  },
  {
    regel: '6.1', schwere: 'verstoss', muster: /(?:ent)?sperr|handysperre/i,
    erklaerung: 'Die Gerätesperre ist auf keinem echten Gerät nachgewiesen (Faktenprüfung 10). Kein Werbetext darf sie behaupten.',
  },
  // 6.2 in zwei Stufen. Die Regel verbietet eine TAGESGRENZE als Zahl — nicht
  // jede Minutenzahl. „Nur noch fünf Minuten" ist das Flehen eines Kindes und
  // keine Produktgrenze; es fiel im zweiten Generatorlauf vom 24.09.2026 auf.
  // Verstoss also nur mit Grenz-Zusammenhang, sonst ein Hinweis zum Nachsehen.
  {
    regel: '6.2', schwere: 'verstoss',
    muster: /(?:höchstens|maximal|bis zu|nur)\s+(?:\d+|ein|eine|zwei|drei|vier|fünf|zehn|fünfzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|neunzig)\s*(?:min\.?|minuten)\b(?=[^.]*(?:am tag|pro tag|täglich|am wochenende|werktags))|(?:\d+|ein|eine|zwei|drei|vier|fünf|zehn|fünfzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|neunzig)\s*(?:min\.?|minuten)\s+(?:am tag|pro tag|täglich|am wochenende|werktags)|(?:höchstens|maximal)\s+(?:\d+|zehn|fünfzehn|zwanzig|dreißig|sechzig|neunzig)\s*(?:min\.?|minuten)/i,
    erklaerung: 'Tagesobergrenze als Zahl. Beworben wird, dass Eltern die Grenze setzen — nicht welche.',
  },
  {
    regel: '6.2', schwere: 'hinweis',
    muster: /(?:\d+|ein|eine|zwei|drei|vier|fünf|zehn|fünfzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|neunzig)\s*(?:min\.?|minuten)\b/i,
    erklaerung: 'Minutenzahl. Prüfen, ob sie als Tagesgrenze gelesen werden kann — das wäre ein Verstoß gegen 6.2.',
  },
  {
    regel: '6.3', schwere: 'verstoss',
    muster: /\bdie (?:einzige|erste|beste)\b|\bbesten?\b|\bnr\.?\s*1\b|#\s*1\b|\bführend|\bunschlagbar/i,
    erklaerung: 'Superlativ.',
  },
  {
    regel: '6.4', schwere: 'verstoss',
    muster: /bessere[nr]? noten|noten verbessern|nachweislich|wissenschaftlich|\bstudie|garantiert|\bwirksam|%/i,
    erklaerung: 'Lernerfolgs-Behauptung oder Statistik. Es gibt keine Studie und keine Messreihe.',
  },
  // Zwei Regeln fuer denselben Verstoss: Die Stichworte gelten unabhaengig von
  // der Schreibweise, die Namensmuster brauchen dagegen die Grossschreibung —
  // sonst ist „sagt ihnen" ein Name.
  {
    regel: '6.5', schwere: 'verstoss',
    muster: /(?:mutter|vater|mama|papa) von|kundenstimme|erfahrungsbericht/i,
    erklaerung: 'Wirkt wie ein Kundenzitat mit Absender. Erfundene Testimonials sind ausgeschlossen.',
  },
  {
    regel: '6.5', schwere: 'verstoss',
    muster: /\b[Ss]agt [A-ZÄÖÜ][a-zäöüß]+|[„"“][^„"“”]{3,}[“"”]\s*[—–-]\s*[A-ZÄÖÜ][a-zäöüß]+/,
    erklaerung: 'Wirkt wie ein Kundenzitat mit Absender. Erfundene Testimonials sind ausgeschlossen.',
  },
  {
    regel: '6.6', schwere: 'verstoss',
    muster: /\d[\d.,]*\s*\+?\s*(?:nutzer|familien|eltern|kinder|downloads|schüler)|(?:über|mehr als|bereits)\s+\d/i,
    erklaerung: 'Nutzerzahl. Die vorhandenen Zahlen stammen aus internem Test und belegen nichts.',
  },
  {
    regel: '6.7', schwere: 'verstoss', muster: /sterne|★|⭐|bewertung/i,
    erklaerung: 'Bewertungen oder Sterne, die nicht auf der Store-Seite nachgesehen wurden.',
  },
  {
    regel: '6.8', schwere: 'verstoss', muster: /lernplan/i,
    erklaerung: 'Der KI-Lernplan ist ausdrücklich kein Werbeargument.',
  },
  {
    regel: 'Datenschutz', schwere: 'verstoss', muster: /dsgvo|datenschutzkonform|datensicher|100\s*%\s*sicher/i,
    erklaerung: 'Datenschutz-Gütesiegel ohne Beleg. Die anwaltliche Freigabe steht aus; belegt ist nur der Serverstandort (V7).',
  },

  // ── Pflicht-Wortlaute aus Abschnitt 5 ────────────────────────────────
  {
    regel: 'V3', schwere: 'verstoss',
    muster: /30\s*tage|einen monat (?:kostenlos|gratis)|\d+\s*tage (?:kostenlos|gratis)/i,
    erklaerung: 'Es heißt immer „4 Wochen". Anzeige und Zielseite müssen dieselbe Zahl nennen.',
  },
  {
    regel: 'V6', schwere: 'verstoss', muster: /alle fächer(?! der jeweiligen klassenstufe)/i,
    erklaerung: 'Pflicht-Wortlaut: „alle Fächer der jeweiligen Klassenstufe". Ein Drittklässler hat vier Fächer, nicht zehn.',
  },

  // ── Abschnitt 8 — Tonalität ──────────────────────────────────────────
  {
    regel: '8', schwere: 'verstoss', nurUeberschrift: true, muster: /!/,
    erklaerung: 'Kein Ausrufezeichen in einer Überschrift.',
  },
  {
    regel: '8', schwere: 'hinweis', muster: /!/,
    erklaerung: 'Ausrufezeichen. Die Tonalität ist ruhig.',
  },
  {
    regel: '8', schwere: 'hinweis', muster: /chaos|schluss mit|jetzt (?:gratis|sichern)|\bsichern\b/i,
    erklaerung: 'Marktschreierisch. Siehe die Gegenüberstellung in Abschnitt 8.',
  },
  {
    regel: '8', schwere: 'hinweis', muster: /\bsucht\b|süchtig|gefährlich|\bgefahr|\bangst|schuld/i,
    erklaerung: 'Angst oder Schuldgefühl als Verkaufsargument. Abschnitt 8 schließt beides aus.',
  },

  // ── verkaufstest.md 4.2 — woran man KI-Text erkennt ──────────────────
  {
    regel: '4.2', schwere: 'hinweis',
    muster: /revolution|mühelos|intelligent|\bki\b|künstliche intelligenz|\bsmart|nahtlos|spielend leicht|im handumdrehen|game.?changer|\bentdecke|tauche ein/i,
    erklaerung: 'Typisches KI-Werbevokabular.',
  },
  {
    regel: '4.2', schwere: 'hinweis', muster: /nicht nur\b[^.]*\bsondern auch/i,
    erklaerung: '„Nicht nur …, sondern auch …" — die bekannteste KI-Satzfigur.',
  },
  {
    regel: '4.2', schwere: 'hinweis', muster: /—|\s–\s/,
    erklaerung: 'Gedankenstrich als Rhythmusmittel. Punkt oder Komma wirken menschlicher.',
  },
  {
    regel: '4.2', schwere: 'hinweis',
    muster: /\b[a-zäöüß]{3,},\s+[a-zäöüß]{3,},?\s+(?:und|&)\s+[a-zäöüß]{3,}\b/i,
    erklaerung: 'Dreiklang („schnell, einfach und sicher"). Ein Ding reicht.',
  },
  {
    regel: '4.2', schwere: 'hinweis', muster: /\p{Extended_Pictographic}/u,
    erklaerung: 'Emoji.',
  },

  // ── Erfundene Eigenschaften ──────────────────────────────────────────
  // Die gefaehrlichste Drift eines Generators ist nicht „die beste App",
  // sondern das harmlos Klingende: „dauert nur einen Moment", „kinderleicht".
  // Steht in keinem Versprechen, klingt aber so selbstverstaendlich, dass es
  // bei der Freigabe durchrutscht. Aufgefallen im ersten Generatorlauf vom
  // 24.09.2026. Nur ein Hinweis, weil „einfach" auch harmlos vorkommen kann —
  // aber ein Hinweis, der die Freigabe bremst.
  {
    regel: 'Beleg', schwere: 'hinweis',
    muster: /(?:nur )?einen moment|im nu\b|\bsofort\b|kinderleicht|unkompliziert|ganz einfach|\bschnell (?:eingerichtet|startklar|erledigt)|ohne aufwand|mit wenigen klicks/i,
    erklaerung: 'Klingt nach einer Produkteigenschaft, die in keinem der Versprechen V1 bis V9 steht.',
  },
  {
    regel: 'Beleg', schwere: 'hinweis', muster: /hausaufgabe/i,
    erklaerung: 'Legt Hausaufgabenhilfe nahe. LernZeit stellt eigene Übungsaufgaben, es hilft nicht bei den Hausaufgaben.',
  },

  // ── Anrede ───────────────────────────────────────────────────────────
  // Die freigegebenen Motive siezen. Eine Kampagne, in der eine Anzeige
  // siezt und die naechste duzt, wirkt zusammengewuerfelt.
  {
    regel: 'Anrede', schwere: 'hinweis', muster: /\b(?:du|dein|deine|deinem|deinen|deiner|deines|dich|dir)\b/i,
    erklaerung: 'Duzt. Die freigegebenen Motive siezen.',
  },
];

/** Erlaubte Preise aus V4. Jede andere Eurosumme ist ein Verstoß. */
const ERLAUBTE_PREISE = new Set(['2,99', '29,99']);

/** Meta schneidet auf dem Handy nach etwa so vielen Zeichen ab. */
export const META_GRENZE_UEBERSCHRIFT = 40;
export const META_GRENZE_TEXT = 125;

function zahlenregeln(gesamt: string): Befund[] {
  const befunde: Befund[] = [];

  // V4 — Preise
  // Kein \b hinter dem Eurozeichen: € ist kein Wortzeichen, die Grenze
  // „€ im" wuerde nie erkannt.
  for (const treffer of gesamt.matchAll(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro\b)|€\s*(\d+(?:[.,]\d{1,2})?)/gi)) {
    const roh = (treffer[1] ?? treffer[2] ?? '').replace('.', ',');
    const betrag = roh.includes(',') ? roh : `${roh},00`;
    if (!ERLAUBTE_PREISE.has(betrag)) {
      befunde.push({
        regel: 'V4', schwere: 'verstoss', fundstelle: treffer[0],
        erklaerung: 'Preis stimmt nicht. Belegt sind 2,99 € im Monat und 29,99 € im Jahr.',
      });
    }
  }

  // V2 — Sekunden je Aufgabe
  for (const treffer of gesamt.matchAll(/(\d+)\s*sek(?:unden|\.)?/gi)) {
    if (treffer[1] !== '30') {
      befunde.push({
        regel: 'V2', schwere: 'verstoss', fundstelle: treffer[0],
        erklaerung: 'Belegt sind 30 Sekunden je richtiger Aufgabe (Standard, änderbar).',
      });
    }
  }

  // V3 — Wochen: nur „4 Wochen"
  for (const treffer of gesamt.matchAll(/(\d+)\s*wochen/gi)) {
    if (treffer[1] !== '4') {
      befunde.push({
        regel: 'V3', schwere: 'verstoss', fundstelle: treffer[0],
        erklaerung: 'Die Testphase heißt immer „4 Wochen".',
      });
    }
  }

  // V6 — Klassenstufen: nur 1 bis 10
  for (const treffer of gesamt.matchAll(/klassen?\s*(\d+)\s*(?:bis|-|–)\s*(\d+)/gi)) {
    const von = Number(treffer[1]);
    const bis = Number(treffer[2]);
    if (von < 1 || bis > 10 || von > bis) {
      befunde.push({
        regel: 'V6', schwere: 'verstoss', fundstelle: treffer[0],
        erklaerung: 'Belegt ist Klasse 1 bis 10.',
      });
    }
  }

  // V3 — „kostenlos"/„gratis" ohne die 4 Wochen klingt nach dauerhaft kostenlos
  if (/kostenlos|gratis|umsonst/i.test(gesamt) && !/4\s*wochen/i.test(gesamt)) {
    const fund = gesamt.match(/kostenlos|gratis|umsonst/i)?.[0] ?? 'kostenlos';
    befunde.push({
      regel: 'V3', schwere: 'verstoss', fundstelle: fund,
      erklaerung: '„Kostenlos" ohne „4 Wochen" klingt nach einer dauerhaft kostenlosen App.',
    });
  }

  return befunde;
}

function laengenregeln(motiv: Motiv): Befund[] {
  const befunde: Befund[] = [];
  if (motiv.ueberschrift.length > META_GRENZE_UEBERSCHRIFT) {
    befunde.push({
      regel: 'Länge', schwere: 'hinweis',
      fundstelle: `${motiv.ueberschrift.length} Zeichen`,
      erklaerung: `Meta kürzt Überschriften auf dem Handy ab etwa ${META_GRENZE_UEBERSCHRIFT} Zeichen. Als Bildtext auf einer Karte ist das kein Problem.`,
    });
  }
  if (motiv.text.length > META_GRENZE_TEXT) {
    befunde.push({
      regel: 'Länge', schwere: 'hinweis',
      fundstelle: `${motiv.text.length} Zeichen`,
      erklaerung: `Meta blendet nach etwa ${META_GRENZE_TEXT} Zeichen „Mehr anzeigen" ein.`,
    });
  }
  return befunde;
}

/**
 * Prueft ein Motiv gegen alle Regeln.
 *
 * Gibt eine leere Liste zurueck, wenn nichts anschlaegt. Ein Motiv ist
 * schaltbar, wenn keine Befunde der Schwere `verstoss` darin stehen.
 */
export function pruefeMotiv(motiv: Motiv): Befund[] {
  const gesamt = `${motiv.ueberschrift}\n${motiv.text}`;
  const befunde: Befund[] = [];

  for (const r of MUSTERREGELN) {
    // Ausrufezeichen: In der Ueberschrift ist es ein Verstoss, im Text nur ein
    // Hinweis. Ohne diese Weiche kaeme dasselbe Zeichen doppelt.
    if (r.regel === '8' && r.muster.source === '!') {
      const quelle = r.nurUeberschrift ? motiv.ueberschrift : motiv.text;
      if (r.muster.test(quelle)) {
        befunde.push({ regel: r.regel, schwere: r.schwere, fundstelle: '!', erklaerung: r.erklaerung });
      }
      continue;
    }

    const treffer = gesamt.match(r.muster);
    if (treffer) {
      befunde.push({ regel: r.regel, schwere: r.schwere, fundstelle: treffer[0].trim(), erklaerung: r.erklaerung });
    }
  }

  befunde.push(...zahlenregeln(gesamt));
  befunde.push(...laengenregeln(motiv));
  return befunde;
}

/** true, wenn das Motiv keinen Verstoss enthaelt. Hinweise sind erlaubt. */
export function istSchaltbar(motiv: Motiv): boolean {
  return pruefeMotiv(motiv).every((b) => b.schwere !== 'verstoss');
}
