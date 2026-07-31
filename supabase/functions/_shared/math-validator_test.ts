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
