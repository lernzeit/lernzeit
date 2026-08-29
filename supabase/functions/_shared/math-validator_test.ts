import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validateMath } from './math-validator.ts';

Deno.test('addition correct', () => {
  const r = validateMath('Was ist 12 + 7?', '19');
  assertEquals(r.applicable, true);
  assertEquals(r.valid, true);
});

Deno.test('addition wrong', () => {
  const r = validateMath('Was ist 12 + 7?', '18');
  assertEquals(r.valid, false);
});

Deno.test('multiplication with middot', () => {
  assertEquals(validateMath('Berechne 6 · 7', '42').valid, true);
});

Deno.test('division with colon', () => {
  assertEquals(validateMath('Berechne 144 : 12', '12').valid, true);
});

Deno.test('mixed precedence', () => {
  assertEquals(validateMath('Berechne 3 · 4 + 2', '14').valid, true);
});

Deno.test('subtraction with german decimal', () => {
  assertEquals(validateMath('Rechne 5,5 - 2,5', '3').valid, true);
});

Deno.test('percent of', () => {
  assertEquals(validateMath('Wie viel sind 20 % von 80?', '16').valid, true);
});

Deno.test('percent of wrong', () => {
  assertEquals(validateMath('Wie viel sind 15 % von 60?', '10').valid, false);
});

Deno.test('zu je product', () => {
  assertEquals(validateMath('6 Kisten zu je 12 Äpfeln. Wie viele Äpfel?', '72').valid, true);
});

Deno.test('zu je wrong', () => {
  assertEquals(validateMath('5 Tüten zu je 4 Bonbons. Wie viele Bonbons?', '9').valid, false);
});

Deno.test('unit conversion m to cm', () => {
  assertEquals(validateMath('Wie viele cm sind 3 m?', '300').valid, true);
});

Deno.test('unit conversion kg to g wrong', () => {
  assertEquals(validateMath('Wie viele g sind 2 kg?', '200').valid, false);
});

Deno.test('answer with matching unit', () => {
  assertEquals(validateMath('Wie viele cm sind 1 m?', '100 cm').valid, true);
});

Deno.test('non numeric answer is not applicable', () => {
  assertEquals(validateMath('Was ist 12 + 7?', 'neunzehn').applicable, false);
});

Deno.test('text question without pattern is not applicable', () => {
  assertEquals(validateMath('Nenne eine Primzahl zwischen zehn und zwanzig.', '13').applicable, false);
});

// ── Ausgeschriebene Rechenwoerter ──────────────────────────────────────────
// Anlass: "3 mal 4" mit hinterlegter Loesung 15. Ohne diese Faelle fiel die
// Aufgabe durch die kostenlose Pruefung und wurde nur vom Modell gefangen —
// und das auch nur, wenn das Kind auf "Erklaerung" tippte.

Deno.test('mal als Wort', () => {
  assertEquals(validateMath('Was ist 3 mal 4?', '12').valid, true);
  assertEquals(validateMath('Was ist 3 mal 4?', '15').valid, false);
  assertEquals(validateMath('Was ist 3 mal 4?', '15').expected, '12');
});

Deno.test('plus und minus als Wort', () => {
  assertEquals(validateMath('Rechne 12 plus 7', '19').valid, true);
  assertEquals(validateMath('Rechne 20 minus 8', '12').valid, true);
});

Deno.test('geteilt durch und durch als Wort', () => {
  assertEquals(validateMath('Was ist 144 geteilt durch 12?', '12').valid, true);
  assertEquals(validateMath('Was ist 20 durch 4?', '5').valid, true);
});

Deno.test('Rechenwoerter nur zwischen Ziffern', () => {
  // "mal" ohne zweite Zahl darf keinen Term erzeugen.
  assertEquals(validateMath('Wie oft passt die 3 mal hinein?', '4').applicable, false);
  // "durch" in normaler Bedeutung ebenfalls nicht.
  assertEquals(
    validateMath('Eine Linie verlaeuft durch den Mittelpunkt. Wie viele Haelften entstehen?', '2').applicable,
    false,
  );
});

// ── Doppeldeutige Zeichen: ":" und "x" ─────────────────────────────────────
// Beide wurden frueher unbedingt zu "/" bzw. "*". Bei "Aufgabe 3: 4 + 5"
// ergab das 5,75 statt 9 — ein FALSCHES deterministisches Urteil, und das geht
// dem Modell vor. Ein Kind mit der richtigen Antwort waere abgewiesen worden.

Deno.test('Doppelpunkt nur zwischen Ziffern als Division', () => {
  // Weiterhin Division, Ziffern auf beiden Seiten:
  assertEquals(validateMath('Berechne 144 : 12', '12').valid, true);
  // Aufzaehlungs-Doppelpunkt darf keine Division erzeugen:
  const r = validateMath('Aufgabe 3: 4 + 5. Wie lautet das Ergebnis?', '9');
  assertEquals(r.valid, true);
  assertEquals(r.expected, '9');
  assertEquals(validateMath('Klasse 5: Was ist 20 - 8?', '12').expected, '12');
});

Deno.test('x nur zwischen Ziffern als Malzeichen', () => {
  assertEquals(validateMath('Berechne 3 x 4', '12').valid, true);
  assertEquals(validateMath('Berechne 3 x 4', '15').valid, false);
});

Deno.test('Aufgaben mit Variablen sind nicht deterministisch pruefbar', () => {
  // Der Ausdruck waere nur ein Bruchstueck — hier muss das Modell ran.
  assertEquals(
    validateMath('Der Term 3 * (4 + x) kann durch Ausklammern in die Form ___ + 3 * x gebracht werden', '15').applicable,
    false,
  );
  assertEquals(validateMath('Berechne 2 x 3 + x für x = 4', '10').applicable, false);
  assertEquals(validateMath('Löse die Gleichung 4 · x = 60 nach x auf.', '15').applicable, false);
});
