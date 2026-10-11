import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { grundlagenAnteil, grundlagenFrage, type GrundlagenFrage, type Schwierigkeit } from './grundlagen-mathe.ts';

/** Wiederholbarer Zufall, damit Fehler reproduzierbar sind */
function zufall(saat: number) {
  let x = saat;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const zahlAus = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace('−', '-'));
const antwort = (f: GrundlagenFrage) =>
  typeof f.correctAnswer === 'number' ? f.options![f.correctAnswer] : f.correctAnswer.value;

function viele(klasse: number, s: Schwierigkeit, n = 400) {
  const r = zufall(klasse * 97 + s.length);
  return Array.from({ length: n }, () => grundlagenFrage(klasse, s, [], r)!);
}

Deno.test('Grundlagen: jede Klasse 1–7 liefert gueltige Aufgaben', () => {
  for (let k = 1; k <= 7; k++) {
    for (const s of ['easy', 'medium', 'hard'] as const) {
      for (const f of viele(k, s)) {
        assert(f, `Klasse ${k} ${s}: keine Aufgabe`);
        assert(f.questionText.length > 3 && f.questionText.length < 90, `zu lang: ${f.questionText}`);
        assert(!/NaN|undefined|Infinity/.test(f.questionText + antwort(f)), `kaputt: ${f.questionText} → ${antwort(f)}`);
        if (f.questionType === 'FREETEXT') {
          assert(/^\d+$/.test(antwort(f)), `Klasse ${k}: Freitext-Antwort keine natuerliche Zahl: ${f.questionText} → ${antwort(f)}`);
        } else {
          assert(f.options && f.options.length >= 2, `zu wenig Optionen: ${f.questionText}`);
          assert(typeof f.correctAnswer === 'number' && f.correctAnswer >= 0, `kein Index: ${f.questionText}`);
          assert(f.options!.includes(antwort(f)), `richtige Antwort fehlt: ${f.questionText}`);
          assertEquals(new Set(f.options).size, f.options!.length, `doppelte Optionen: ${f.options}`);
        }
      }
    }
  }
});

Deno.test('Grundlagen: Rechnungen stimmen', () => {
  for (let k = 1; k <= 7; k++) {
    for (const f of viele(k, 'medium', 600)) {
      const t = f.questionText;
      const a = antwort(f);
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^Runde ([\d.]+) auf (Zehner|Hunderter|Tausender|Zehntausender|Hunderttausender)\.$/))) {
        const stufe = { Zehner: 10, Hunderter: 100, Tausender: 1000, Zehntausender: 10000, Hunderttausender: 100000 }[m[2]]!;
        assertEquals(zahlAus(a), Math.round(zahlAus(m[1]) / stufe) * stufe, t);
      } else if ((m = t.match(/^Was ist der (Vorgänger|Nachfolger) von ([\d.]+)\?$/))) {
        assertEquals(zahlAus(a), zahlAus(m[2]) + (m[1] === 'Vorgänger' ? -1 : 1), t);
      } else if ((m = t.match(/^(−?[\d.]+) ([+−·:]) ([\d.]+) = \?$/))) {
        const x = zahlAus(m[1]); const y = zahlAus(m[3]);
        const soll = m[2] === '+' ? x + y : m[2] === '−' ? x - y : m[2] === '·' ? x * y : x / y;
        assertEquals(zahlAus(a), soll, t);
        if (k <= 4) assert(soll >= 0 && Number.isInteger(soll), `kein Ergebnis fuer Grundschule: ${t}`);
      } else if ((m = t.match(/^([\d.]+) \+ ___ = ([\d.]+)$/))) {
        assertEquals(zahlAus(a), zahlAus(m[2]) - zahlAus(m[1]), t);
      }
    }
  }
});

Deno.test('Grundlagen: Klasse 1 bleibt im Zahlenraum bis 20', () => {
  for (const s of ['easy', 'medium', 'hard'] as const) {
    for (const f of viele(1, s)) {
      for (const z of (f.questionText + ' ' + antwort(f)).match(/\d+/g) ?? []) assert(Number(z) <= 20, `ZR 20 verlassen: ${f.questionText} → ${antwort(f)}`);
    }
  }
});

Deno.test('Grundlagen: keine Wiederholung ausgeschlossener Aufgaben, ab Klasse 8 keine', () => {
  const r = zufall(5);
  const erste = grundlagenFrage(3, 'medium', [], r)!;
  for (let i = 0; i < 50; i++) assert(grundlagenFrage(3, 'medium', [erste.questionText], r)?.questionText !== erste.questionText);
  assertEquals(grundlagenFrage(8, 'medium'), null);
  assertEquals(grundlagenAnteil(8), 0);
  assert(grundlagenAnteil(3) > 0.3);
});
