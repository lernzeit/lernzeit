import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  answerFormatRule,
  mentalMathConstraint,
  pickCategory,
  theoryInstruction,
} from './question-prompt.ts';

/** Spiegelt die Seed-Werte der Migration. */
const MIX = {
  math: { 1: 0, 2: 0, 3: 15, 4: 20, 5: 25, 6: 30, 7: 30, 8: 35, 9: 40, 10: 40 },
  physics: { 5: 30, 6: 30, 7: 35, 8: 35, 9: 40, 10: 40 },
  chemistry: { 7: 35, 8: 40, 9: 40, 10: 45 },
};

function share(subject: string, grade: number, runs = 4000): number {
  let theory = 0;
  for (let i = 0; i < runs; i++) {
    if (pickCategory(subject, grade, MIX) === 'theory') theory++;
  }
  return (theory / runs) * 100;
}

Deno.test('Klasse 1-2 Mathe liefert nie Theoriefragen', () => {
  assertEquals(share('math', 1), 0);
  assertEquals(share('math', 2), 0);
});

Deno.test('Klasse 9 Mathe trifft den konfigurierten Anteil', () => {
  const pct = share('math', 9);
  assert(Math.abs(pct - 40) < 5, `erwartet ~40%, war ${pct.toFixed(1)}%`);
});

Deno.test('Klasse 3 Mathe mischt Theorie bereits bei', () => {
  const pct = share('math', 3);
  assert(Math.abs(pct - 15) < 5, `erwartet ~15%, war ${pct.toFixed(1)}%`);
});

Deno.test('Chemie Klasse 10 liegt am hoechsten', () => {
  const pct = share('chemistry', 10);
  assert(Math.abs(pct - 45) < 5, `erwartet ~45%, war ${pct.toFixed(1)}%`);
});

Deno.test('Faecher ausserhalb der Theorie-Liste bleiben unberuehrt', () => {
  for (const subject of ['german', 'english', 'history', 'biology']) {
    assertEquals(pickCategory(subject, 9, MIX), 'calculation');
  }
});

Deno.test('unbekannte Klasse faellt auf calculation zurueck', () => {
  assertEquals(pickCategory('chemistry', 5, MIX), 'calculation');
});

Deno.test('0 und 100 Prozent sind deterministisch', () => {
  const extremes = { math: { 5: 0, 6: 100 } };
  assertEquals(pickCategory('math', 5, extremes), 'calculation');
  assertEquals(pickCategory('math', 6, extremes), 'theory');
});

Deno.test('Theorie-Block nennt klassengerechte Begriffe', () => {
  const k9 = theoryInstruction('math', 9);
  assert(k9.includes('Hypotenuse'), 'Klasse 9 muss Hypotenuse anbieten');
  assert(k9.includes('KEINE Rechnung'));

  const k3 = theoryInstruction('math', 3);
  assert(k3.includes('Summand'), 'Klasse 3 muss Grundbegriffe anbieten');
  assert(!k3.includes('Hypotenuse'), 'Klasse 3 darf keine Oberstufenbegriffe nennen');
});

Deno.test('Antwortregel kippt mit der Kategorie', () => {
  assert(answerFormatRule('calculation', 'math').includes('NUR Zahlen'));
  assert(answerFormatRule('theory', 'math').includes('KEINE Zahl'));
  // Nicht-Rechenfaecher bekommen gar keine Zahlenregel.
  assertEquals(answerFormatRule('calculation', 'german'), '');
});

Deno.test('Kopfrechen-Block verbietet Zwischenergebnisse', () => {
  // Frueher wurde hier auf die Wendung "ohne Papier" geprueft. Die stand bis
  // a87accf im Text und ist seitdem weg — die Pruefung lief also ins Leere,
  // ohne dass jemand es merkte. Geprueft wird jetzt die Zusage selbst statt
  // einer Formulierung: genau ein Rechenschritt, kein Zwischenergebnis, und
  // ein Gegenbeispiel, an dem sich Sprachmodelle nachweislich besser
  // orientieren als an der abstrakten Regel.
  const text = mentalMathConstraint();
  assert(text.includes('EIN RECHENSCHRITT'), 'Ein-Schritt-Regel fehlt');
  assert(/KEIN Zwischenergebnis/i.test(text), 'Verbot von Zwischenergebnissen fehlt');
  assert(text.includes('FALSCH:'), 'Gegenbeispiel fehlt');
  assert(text.includes('RICHTIG:'), 'Positivbeispiel fehlt');
});
