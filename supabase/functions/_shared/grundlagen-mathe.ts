/**
 * Grundlagen-Aufgaben Mathe (11.10.2026): kurze, direkte Uebungen ohne KI.
 *
 * Anlass: Im Fragenspeicher waren in Klasse 3 zwei Drittel der Mathe-Fragen
 * lange Sachaufgaben, kaum einfache Uebungen (Runden, Vorgaenger/Nachfolger,
 * Nachbarzehner, Stellenwerte, Einmaleins). Lernportale wie Schlaukopf zeigen,
 * dass kurze Ein-Schritt-Aufgaben nach Klasse und Thema gut zum Ueben sind.
 * Die Aufgaben hier sind selbst erzeugt (keine fremden Fragen), immer richtig
 * und kosten nichts. ai-question-generator liefert sie fuer einen Teil der
 * Mathe-Fragen aus (grundlagenAnteil), der Rest kommt wie bisher von der KI.
 */

export type Schwierigkeit = 'easy' | 'medium' | 'hard';

export interface GrundlagenFrage {
  thema: string;
  questionText: string;
  questionType: 'FREETEXT' | 'MULTIPLE_CHOICE';
  /** FREETEXT: { value }, MULTIPLE_CHOICE: Text der richtigen Option */
  correctAnswer: { value: string } | string;
  options?: string[];
  hint: string;
}

type Zufall = () => number;
type Erzeuger = (s: Schwierigkeit, r: Zufall) => GrundlagenFrage;

const zahl = (r: Zufall, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const wahl = <T>(r: Zufall, liste: readonly T[]): T => liste[Math.floor(r() * liste.length)];
const fmt = (n: number) => n.toLocaleString('de-DE');
const dez = (n: number, stellen = 2) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: stellen });

/** Negative Zahl mit echtem Minuszeichen; in Rechnungen in Klammern */
const vz = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const vzK = (n: number) => (n < 0 ? `(−${-n})` : `${n}`);

const frei = (thema: string, text: string, antwort: number | string, hint: string): GrundlagenFrage => ({
  thema, questionText: text, questionType: 'FREETEXT', correctAnswer: { value: String(antwort) }, hint,
});

/** Auswahl: richtige Antwort plus Ablenker, gemischt, ohne Doppelte. */
function auswahl(thema: string, text: string, richtig: string, falsch: string[], hint: string, r: Zufall): GrundlagenFrage {
  const optionen = [richtig, ...falsch.filter((f, i) => f !== richtig && falsch.indexOf(f) === i)].slice(0, 4);
  for (let i = optionen.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [optionen[i], optionen[j]] = [optionen[j], optionen[i]];
  }
  return { thema, questionText: text, questionType: 'MULTIPLE_CHOICE', correctAnswer: richtig, options: optionen, hint };
}

// ── Bausteine ─────────────────────────────────────────────────────────────────

const vorgaengerNachfolger = (max: number): Erzeuger => (s, r) => {
  const grenze = s === 'easy' ? Math.min(max, 20) : max;
  // Schwer: an Zehner-/Hunderteruebergaengen (z. B. 499 → 500)
  let n = zahl(r, 2, grenze - 2);
  if (s === 'hard' && grenze >= 100) {
    const stufe = grenze >= 1000 ? wahl(r, [10, 100, 1000]) : 10;
    n = Math.max(stufe, Math.round(n / stufe) * stufe) - (r() < 0.5 ? 0 : 1);
    if (n < 2) n = stufe;
  }
  return r() < 0.5
    ? frei('Vorgänger', `Was ist der Vorgänger von ${fmt(n)}?`, n - 1, 'Der Vorgänger ist eins weniger.')
    : frei('Nachfolger', `Was ist der Nachfolger von ${fmt(n)}?`, n + 1, 'Der Nachfolger ist eins mehr.');
};

const nachbar = (stufe: 10 | 100 | 1000 | 10000, max: number): Erzeuger => (_s, r) => {
  let n = zahl(r, stufe + 1, max - 1);
  if (n % stufe === 0) n += 1 + zahl(r, 0, stufe - 2);
  const name = { 10: 'Zehner', 100: 'Hunderter', 1000: 'Tausender', 10000: 'Zehntausender' }[stufe];
  const unten = Math.floor(n / stufe) * stufe;
  return r() < 0.5
    ? frei(`Nachbar${name.toLowerCase()}`, `Welcher ${name} kommt vor ${fmt(n)}?`, unten, `Der ${name} davor endet auf ${'0'.repeat(Math.log10(stufe))}.`)
    : frei(`Nachbar${name.toLowerCase()}`, `Welcher ${name} kommt nach ${fmt(n)}?`, unten + stufe, `Der nächste volle ${name}.`);
};

const runden = (stufe: 10 | 100 | 1000 | 10000 | 100000, max: number): Erzeuger => (s, r) => {
  let n = zahl(r, stufe, max - 1);
  // Schwer: genau auf der Mitte (…5, …50), da wird aufgerundet
  if (s === 'hard') n = Math.floor(n / stufe) * stufe + stufe / 2;
  if (n % stufe === 0) n += Math.max(1, Math.floor(stufe / 3));
  const name = { 10: 'Zehner', 100: 'Hunderter', 1000: 'Tausender', 10000: 'Zehntausender', 100000: 'Hunderttausender' }[stufe];
  const gerundet = Math.round(n / stufe) * stufe;
  return frei(`Runden auf ${name}`, `Runde ${fmt(n)} auf ${name}.`, gerundet,
    'Schau auf die Ziffer rechts daneben: 0 bis 4 abrunden, 5 bis 9 aufrunden.');
};

const stellenwert = (max: number): Erzeuger => (_s, r) => {
  const n = zahl(r, Math.min(100, max / 10), max - 1);
  const stellen = [
    { name: 'Einerstelle', teiler: 1 }, { name: 'Zehnerstelle', teiler: 10 }, { name: 'Hunderterstelle', teiler: 100 },
    { name: 'Tausenderstelle', teiler: 1000 }, { name: 'Zehntausenderstelle', teiler: 10000 },
  ].filter((st) => st.teiler <= n);
  const st = wahl(r, stellen);
  if (r() < 0.5 && st.teiler >= 10) {
    const ganz = Math.floor(n / st.teiler);
    const wort = st.name.replace('stelle', '');
    return frei('Stellenwert', `Wie viele volle ${wort} stecken in ${fmt(n)}?`, ganz,
      `Streiche die Stellen rechts von den ${wort}n weg.`);
  }
  return frei('Stellenwert', `Welche Ziffer steht in ${fmt(n)} an der ${st.name}?`, Math.floor(n / st.teiler) % 10,
    'Von rechts: Einer, Zehner, Hunderter, Tausender.');
};

const plusMinus = (max: number, art: 'klein' | 'glatt' | 'uebergang'): Erzeuger => (s, r) => {
  const schritt = art === 'glatt' ? (max >= 1000 ? wahl(r, [10, 100]) : 10) : 1;
  const obere = s === 'easy' ? Math.max(10, Math.floor(max / 2)) : max;
  const a = Math.round(zahl(r, schritt, obere) / schritt) * schritt || schritt;
  const plus = r() < 0.5;
  if (plus) {
    const b = Math.round(zahl(r, schritt, Math.max(schritt, obere - a)) / schritt) * schritt || schritt;
    if (a + b > max) return frei('Minus', `${fmt(a)} − ${fmt(Math.min(a, b))} = ?`, a - Math.min(a, b), 'Rechne Schritt für Schritt.');
    return frei('Plus', `${fmt(a)} + ${fmt(b)} = ?`, a + b, 'Erst die großen Teile, dann die kleinen.');
  }
  const b = Math.round(zahl(r, schritt, a) / schritt) * schritt || schritt;
  return frei('Minus', `${fmt(a)} − ${fmt(Math.min(a, b))} = ?`, a - Math.min(a, b), 'Rechne Schritt für Schritt.');
};

const ergaenzen = (ziel: number): Erzeuger => (_s, r) => {
  const schritt = ziel >= 1000 ? 50 : ziel >= 100 ? 5 : 1;
  const a = Math.round(zahl(r, 1, ziel - 1) / schritt) * schritt || schritt;
  return frei('Ergänzen', `${fmt(a)} + ___ = ${fmt(ziel)}`, ziel - a, `Wie viel fehlt bis ${fmt(ziel)}?`);
};

const einmaleins = (s: Schwierigkeit, r: Zufall, nurLeicht = false): GrundlagenFrage => {
  const reihen = nurLeicht || s === 'easy' ? [1, 2, 5, 10] : s === 'medium' ? [2, 3, 4, 5, 6, 10] : [3, 4, 6, 7, 8, 9];
  const a = wahl(r, reihen);
  const b = zahl(r, 1, 10);
  if (r() < 0.35) return frei('Geteilt', `${a * b} : ${a} = ?`, b, `Denk an die ${a}er-Reihe.`);
  return frei('Einmaleins', r() < 0.5 ? `${a} · ${b} = ?` : `${b} · ${a} = ?`, a * b, `Denk an die ${a}er-Reihe.`);
};

const verdoppelnHalbieren = (max: number): Erzeuger => (_s, r) => {
  if (r() < 0.5) {
    const n = zahl(r, 1, Math.floor(max / 2));
    return frei('Verdoppeln', `Verdopple ${fmt(n)}.`, n * 2, 'Verdoppeln heißt: die Zahl plus sich selbst.');
  }
  const n = zahl(r, 1, Math.floor(max / 2)) * 2;
  return frei('Halbieren', `Halbiere ${fmt(n)}.`, n / 2, 'Halbieren heißt: in zwei gleiche Teile teilen.');
};

const vergleichen = (max: number): Erzeuger => (_s, r) => {
  const a = zahl(r, 1, max);
  let b = r() < 0.15 ? a : zahl(r, Math.max(1, a - Math.ceil(max / 20)), Math.min(max, a + Math.ceil(max / 20)));
  if (b === a && r() < 0.5) b = Math.min(max, a + 1);
  const zeichen = a < b ? '<' : a > b ? '>' : '=';
  return auswahl('Vergleichen', `Welches Zeichen passt? ${fmt(a)} ___ ${fmt(b)}`, zeichen, ['<', '>', '='], 'Das Krokodil frisst die größere Zahl.', r);
};

const zahlenfolge = (max: number): Erzeuger => (s, r) => {
  const passend = (liste: number[]) => liste.filter((x) => x * 4 <= max);
  const schritt = s === 'easy' ? wahl(r, passend([1, 2, 10])) : wahl(r, passend([2, 3, 5, 10, 25]));
  const start = zahl(r, 0, Math.max(0, max - schritt * 4));
  const folge = [0, 1, 2, 3].map((i) => start + i * schritt);
  return frei('Zahlenfolge', `Wie geht es weiter? ${folge.map(fmt).join(', ')}, ___`, start + 4 * schritt,
    'Wie groß ist der Schritt von Zahl zu Zahl?');
};

const umrechnen = (paare: { von: string; nach: string; faktor: number; bis: number }[]): Erzeuger => (_s, r) => {
  const p = wahl(r, paare);
  const n = zahl(r, 1, p.bis);
  return frei('Umrechnen', `${fmt(n)} ${p.von} = ___ ${p.nach}`, n * p.faktor, `1 ${p.von} = ${fmt(p.faktor)} ${p.nach}`);
};

const malZehnerzahlen: Erzeuger = (s, r) => {
  const a = zahl(r, 2, 9) * (s === 'hard' ? 100 : 10);
  const b = zahl(r, 2, 9) * (s === 'easy' ? 1 : 10);
  if (r() < 0.4) return frei('Geteilt', `${fmt(a * b)} : ${fmt(b)} = ?`, a, 'Rechne erst ohne die Nullen.');
  return frei('Mal', `${fmt(a)} · ${fmt(b)} = ?`, a * b, 'Rechne erst ohne die Nullen, dann hänge sie an.');
};

// Ab Klasse 5
const negativVergleichen: Erzeuger = (_s, r) => {
  const a = zahl(r, -20, 20);
  let b = zahl(r, -20, 20);
  if (a === b) b = a - 1;
  if (a >= 0 && b >= 0) b = -b - 1;
  const zeichen = a < b ? '<' : '>';
  return auswahl('Negative Zahlen', `Welches Zeichen passt? ${vz(a)} ___ ${vz(b)}`, zeichen, ['<', '>', '='], 'Auf dem Zahlenstrahl ist links kleiner.', r);
};

const negativRechnen: Erzeuger = (s, r) => {
  // Immer mit einer negativen Zahl oder einem negativen Ergebnis
  const a = r() < 0.6 ? -zahl(r, 1, 15) : zahl(r, 1, 9);
  const b = zahl(r, 1, s === 'easy' ? 10 : 20);
  const plus = a < 0 ? r() < 0.5 : false;
  const erg = plus ? a + b : a - b;
  const text = `${vz(a)} ${plus ? '+' : '−'} ${b} = ?`;
  return auswahl('Negative Zahlen', text, vz(erg), [vz(erg + 2), vz(-erg), vz(erg - 2), vz(erg + 1)], 'Plus geht nach rechts, minus nach links.', r);
};

const ggT = (a: number, b: number): number => (b === 0 ? a : ggT(b, a % b));

const bruchKuerzen: Erzeuger = (_s, r) => {
  const nenner = wahl(r, [2, 3, 4, 5, 6, 8]);
  let zaehler = zahl(r, 1, nenner - 1);
  const g = ggT(zaehler, nenner);
  zaehler /= g;
  const n = nenner / g;
  const k = zahl(r, 2, 5);
  const richtig = `${zaehler}/${n}`;
  return auswahl('Brüche kürzen', `Kürze ${zaehler * k}/${n * k} so weit wie möglich.`, richtig,
    [`${zaehler * k}/${n}`, `${zaehler}/${n * k}`, `${zaehler + 1}/${n + 1}`, `${Math.max(1, zaehler * 2)}/${n * 2 + 1}`],
    'Teile Zähler und Nenner durch dieselbe Zahl.', r);
};

const quadratPotenz: Erzeuger = (_s, r) => {
  if (r() < 0.6) {
    const n = zahl(r, 2, 15);
    return frei('Quadratzahlen', `${n}² = ?`, n * n, `${n}² heißt ${n} · ${n}.`);
  }
  const e = zahl(r, 2, 6);
  const hoch = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'][e];
  return frei('Zehnerpotenzen', `10${hoch} = ?`, 10 ** e, `Eine 1 mit ${e} Nullen.`);
};

const teilbar: Erzeuger = (_s, r) => {
  const t = wahl(r, [2, 3, 4, 5, 6, 9, 10]);
  const n = r() < 0.5 ? zahl(r, 3, 30) * t : zahl(r, 10, 300);
  const ja = n % t === 0;
  return auswahl('Teilbarkeit', `Ist ${fmt(n)} durch ${t} teilbar?`, ja ? 'Ja' : 'Nein', ['Ja', 'Nein'], `Teile ${fmt(n)} durch ${t} und schau, ob ein Rest bleibt.`, r);
};

const eineStelle = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const dezimalRunden: Erzeuger = (_s, r) => {
  const n = zahl(r, 100, 9999) / 100;
  const gerundet = Math.round(n * 10) / 10;
  return auswahl('Dezimalzahlen runden', `Runde ${dez(n)} auf eine Stelle nach dem Komma.`, eineStelle(gerundet),
    [eineStelle(Math.floor(n * 10) / 10), eineStelle(Math.ceil(n * 10) / 10), eineStelle((Math.round(n * 10) + 2) / 10), eineStelle((Math.round(n * 10) - 2) / 10)],
    'Schau auf die zweite Stelle nach dem Komma.', r);
};

const bruchDezimal: Erzeuger = (_s, r) => {
  const paare: [string, string][] = [['1/2', '0,5'], ['1/4', '0,25'], ['3/4', '0,75'], ['1/5', '0,2'], ['2/5', '0,4'], ['1/10', '0,1'], ['3/10', '0,3'], ['1/8', '0,125']];
  const [b, d] = wahl(r, paare);
  if (r() < 0.5) {
    return auswahl('Brüche und Dezimalzahlen', `Welche Dezimalzahl ist ${b}?`, d, paare.map((p) => p[1]).filter((x) => x !== d).slice(0, 6).sort(() => r() - 0.5), 'Teile den Zähler durch den Nenner.', r);
  }
  return auswahl('Brüche und Dezimalzahlen', `Welcher Bruch ist ${d}?`, b, paare.map((p) => p[0]).filter((x) => x !== b).sort(() => r() - 0.5), 'Zehntel, Hundertstel, Tausendstel.', r);
};

const prozentEinfach: Erzeuger = (s, r) => {
  const p = wahl(r, s === 'easy' ? [10, 50, 100] : [10, 20, 25, 50, 75]);
  const g = wahl(r, [20, 40, 60, 80, 100, 120, 200, 240, 300, 400, 500, 800]);
  const w = (g * p) / 100;
  if (!Number.isInteger(w)) return frei('Prozent', `10 % von ${fmt(g * 10)} = ?`, g, '10 % ist ein Zehntel.');
  return frei('Prozent', `${p} % von ${fmt(g)} = ?`, w, p === 50 ? '50 % ist die Hälfte.' : p === 25 ? '25 % ist ein Viertel.' : '10 % ist ein Zehntel.');
};

const bruchGleicherNenner: Erzeuger = (_s, r) => {
  const n = wahl(r, [3, 5, 7, 11]);
  const a = zahl(r, 1, n - 2);
  const b = zahl(r, 1, n - a - 1);
  return auswahl('Brüche addieren', `${a}/${n} + ${b}/${n} = ?`, `${a + b}/${n}`, [`${a + b}/${n * 2}`, `${a * b}/${n}`, `${a + b + 1}/${n}`], 'Bei gleichem Nenner: nur die Zähler addieren.', r);
};

const malZehnDezimal: Erzeuger = (_s, r) => {
  const n = zahl(r, 11, 999) / 100;
  const f = wahl(r, [10, 100]);
  const mal = r() < 0.5;
  const erg = mal ? Math.round(n * f * 100) / 100 : Math.round((n / f) * 10000) / 10000;
  return auswahl('Dezimalzahlen', `${dez(n)} ${mal ? '·' : ':'} ${f} = ?`, dez(erg, 4),
    [dez(mal ? erg / 10 : erg * 10, 4), dez(mal ? erg * 10 : erg / 10, 4), dez(n, 2)], `Das Komma rutscht um ${f === 10 ? 'eine Stelle' : 'zwei Stellen'}.`, r);
};

const gleichungEinfach: Erzeuger = (s, r) => {
  const x = zahl(r, 2, s === 'easy' ? 10 : 20);
  if (r() < 0.5) {
    const a = zahl(r, 2, 30);
    return frei('Gleichungen', `x + ${a} = ${x + a}. Wie groß ist x?`, x, `Rechne ${x + a} − ${a}.`);
  }
  const a = zahl(r, 2, 9);
  return frei('Gleichungen', `${a} · x = ${a * x}. Wie groß ist x?`, x, `Rechne ${a * x} : ${a}.`);
};

const termeZusammenfassen: Erzeuger = (_s, r) => {
  const a = zahl(r, 2, 9);
  const b = zahl(r, 1, 9);
  const plus = r() < 0.6;
  const erg = plus ? a + b : a - b;
  const richtig = erg === 1 ? 'x' : erg === 0 ? '0' : erg === -1 ? '−x' : `${vz(erg)}x`;
  return auswahl('Terme', `Fasse zusammen: ${a}x ${plus ? '+' : '−'} ${b === 1 ? '' : b}x`, richtig,
    [`${a * b}x`, `${vz(erg)}x²`, `${vz(plus ? a - b : a + b)}x`], 'Gleiche Variablen: nur die Zahlen davor verrechnen.', r);
};

const negativMal: Erzeuger = (_s, r) => {
  const a = zahl(r, 2, 9) * (r() < 0.5 ? -1 : 1);
  const b = zahl(r, 2, 9) * (r() < 0.5 ? -1 : 1);
  return auswahl('Negative Zahlen', `${vzK(a)} · ${vzK(b)} = ?`, vz(a * b), [vz(-a * b), vz(a + b), vz(a * b + 1)],
    'Gleiche Vorzeichen: plus, verschiedene: minus.', r);
};

// ── Themen je Klasse (gewichtet) ─────────────────────────────────────────────

interface Thema { gewicht: number; erzeugen: Erzeuger }

const KLASSEN: Record<number, Thema[]> = {
  1: [
    { gewicht: 3, erzeugen: vorgaengerNachfolger(20) },
    { gewicht: 4, erzeugen: plusMinus(20, 'klein') },
    { gewicht: 2, erzeugen: ergaenzen(10) },
    { gewicht: 2, erzeugen: verdoppelnHalbieren(20) },
    { gewicht: 2, erzeugen: vergleichen(20) },
    { gewicht: 1, erzeugen: zahlenfolge(20) },
  ],
  2: [
    { gewicht: 2, erzeugen: vorgaengerNachfolger(100) },
    { gewicht: 2, erzeugen: nachbar(10, 100) },
    { gewicht: 2, erzeugen: stellenwert(100) },
    { gewicht: 3, erzeugen: plusMinus(100, 'uebergang') },
    { gewicht: 3, erzeugen: (s, r) => einmaleins(s, r, s !== 'hard') },
    { gewicht: 1, erzeugen: ergaenzen(100) },
    { gewicht: 1, erzeugen: verdoppelnHalbieren(100) },
    { gewicht: 1, erzeugen: vergleichen(100) },
    { gewicht: 1, erzeugen: zahlenfolge(100) },
  ],
  3: [
    { gewicht: 2, erzeugen: vorgaengerNachfolger(1000) },
    { gewicht: 2, erzeugen: nachbar(10, 1000) },
    { gewicht: 2, erzeugen: nachbar(100, 1000) },
    { gewicht: 2, erzeugen: runden(10, 1000) },
    { gewicht: 2, erzeugen: runden(100, 1000) },
    { gewicht: 2, erzeugen: stellenwert(1000) },
    { gewicht: 3, erzeugen: einmaleins },
    { gewicht: 2, erzeugen: plusMinus(1000, 'glatt') },
    { gewicht: 1, erzeugen: ergaenzen(1000) },
    { gewicht: 1, erzeugen: verdoppelnHalbieren(1000) },
    { gewicht: 1, erzeugen: vergleichen(1000) },
    { gewicht: 1, erzeugen: umrechnen([{ von: 'm', nach: 'cm', faktor: 100, bis: 9 }, { von: 'kg', nach: 'g', faktor: 1000, bis: 9 }, { von: 'h', nach: 'min', faktor: 60, bis: 5 }, { von: '€', nach: 'ct', faktor: 100, bis: 9 }]) },
  ],
  4: [
    { gewicht: 2, erzeugen: vorgaengerNachfolger(1000000) },
    { gewicht: 2, erzeugen: nachbar(1000, 1000000) },
    { gewicht: 2, erzeugen: runden(1000, 1000000) },
    { gewicht: 1, erzeugen: runden(10000, 1000000) },
    { gewicht: 2, erzeugen: stellenwert(1000000) },
    { gewicht: 2, erzeugen: malZehnerzahlen },
    { gewicht: 1, erzeugen: einmaleins },
    { gewicht: 2, erzeugen: plusMinus(100000, 'glatt') },
    { gewicht: 1, erzeugen: vergleichen(1000000) },
    { gewicht: 1, erzeugen: umrechnen([{ von: 'km', nach: 'm', faktor: 1000, bis: 9 }, { von: 'kg', nach: 'g', faktor: 1000, bis: 20 }, { von: 'm', nach: 'cm', faktor: 100, bis: 50 }, { von: 'min', nach: 's', faktor: 60, bis: 10 }]) },
  ],
  5: [
    { gewicht: 2, erzeugen: runden(100000, 10000000) },
    { gewicht: 2, erzeugen: negativVergleichen },
    { gewicht: 2, erzeugen: negativRechnen },
    { gewicht: 2, erzeugen: bruchKuerzen },
    { gewicht: 2, erzeugen: quadratPotenz },
    { gewicht: 2, erzeugen: teilbar },
    { gewicht: 1, erzeugen: dezimalRunden },
  ],
  6: [
    { gewicht: 2, erzeugen: bruchDezimal },
    { gewicht: 2, erzeugen: prozentEinfach },
    { gewicht: 2, erzeugen: bruchGleicherNenner },
    { gewicht: 2, erzeugen: malZehnDezimal },
    { gewicht: 2, erzeugen: negativRechnen },
    { gewicht: 1, erzeugen: dezimalRunden },
  ],
  7: [
    { gewicht: 2, erzeugen: prozentEinfach },
    { gewicht: 2, erzeugen: gleichungEinfach },
    { gewicht: 2, erzeugen: termeZusammenfassen },
    { gewicht: 2, erzeugen: negativMal },
    { gewicht: 1, erzeugen: quadratPotenz },
  ],
};

/** Anteil der Mathe-Fragen, die als Grundlagen-Aufgabe kommen. */
export function grundlagenAnteil(klasse: number): number {
  if (klasse <= 4) return 0.5;
  if (klasse <= 6) return 0.35;
  if (klasse === 7) return 0.25;
  return 0;
}

/**
 * Eine Grundlagen-Aufgabe fuer die Klasse, nicht wortgleich mit `ausschliessen`.
 * null, wenn es fuer die Klasse keine gibt.
 */
export function grundlagenFrage(
  klasse: number,
  schwierigkeit: Schwierigkeit,
  ausschliessen: string[] = [],
  r: Zufall = Math.random,
): GrundlagenFrage | null {
  const themen = KLASSEN[klasse];
  if (!themen) return null;
  const schon = new Set(ausschliessen.map((t) => t.trim().toLowerCase()));
  const summe = themen.reduce((s, t) => s + t.gewicht, 0);
  for (let versuch = 0; versuch < 12; versuch++) {
    let x = r() * summe;
    const thema = themen.find((t) => (x -= t.gewicht) < 0) ?? themen[0];
    const f = thema.erzeugen(schwierigkeit, r);
    if (!schon.has(f.questionText.trim().toLowerCase())) return f;
  }
  return null;
}
