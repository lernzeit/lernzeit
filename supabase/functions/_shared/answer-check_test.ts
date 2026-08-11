/**
 * Tests für die unabhängige Antwortprüfung.
 *
 * Der wichtigste Fall steht ganz oben: eine falsche Musterlösung im Cache darf
 * das Kind nicht mehr eine richtige Antwort kosten. Genau daran ist die alte
 * Prüfung gescheitert.
 *
 * Ausführen: deno test supabase/functions/_shared/answer-check_test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  acceptsUserAnswer,
  deterministicAnswerCheck,
  looksEquivalent,
  parseCheck,
} from './answer-check.ts';

Deno.test('falsche Musterloesung: Kind wird gutgeschrieben', () => {
  const check = deterministicAnswerCheck('Berechne 12 + 7', '20', '19');
  assertEquals(check?.verdict, 'user_correct');
  assertEquals(check?.accepted, true);
  assertEquals(check?.verifiedCorrectAnswer, '19');
});

Deno.test('richtige Musterloesung, falsches Kind: bleibt falsch', () => {
  const check = deterministicAnswerCheck('Berechne 12 + 7', '19', '20');
  assertEquals(check?.verdict, 'stated_correct');
  assertEquals(check?.accepted, false);
});

Deno.test('beide richtig', () => {
  const check = deterministicAnswerCheck('Berechne 12 + 7', '19', '19');
  assertEquals(check?.verdict, 'both_correct');
  assertEquals(check?.accepted, true);
});

Deno.test('beide falsch', () => {
  const check = deterministicAnswerCheck('Berechne 12 + 7', '20', '21');
  assertEquals(check?.verdict, 'both_wrong');
  assertEquals(check?.accepted, false);
});

Deno.test('nicht nachrechenbar: null, damit das Modell uebernimmt', () => {
  // Genau die Aufgabe aus dem Vorfall — mehrschrittig, kein Rechenausdruck.
  const check = deterministicAnswerCheck(
    'Addiere die Zahlen 450 und 230. Subtrahiere von diesem Ergebnis das Dreifache der Differenz von 450 und 230. Welche Zahl erhaeltst du?',
    '158',
    '20',
  );
  assertEquals(check, null);
});

Deno.test('Theoriefrage ist nicht nachrechenbar', () => {
  assertEquals(
    deterministicAnswerCheck('Wie heisst die laengste Seite im rechtwinkligen Dreieck?', 'Hypotenuse', 'Kathete'),
    null,
  );
});

Deno.test('looksEquivalent: Zahlformate und Einheiten', () => {
  assertEquals(looksEquivalent('0,5', '0.5'), true);
  assertEquals(looksEquivalent('20 Murmeln', '20'), true);
  assertEquals(looksEquivalent(' Hypotenuse ', 'hypotenuse'), true);
  assertEquals(looksEquivalent('20', '21'), false);
  assertEquals(looksEquivalent('Kathete', 'Hypotenuse'), false);
});

Deno.test('acceptsUserAnswer deckt genau die zwei Faelle ab', () => {
  assertEquals(acceptsUserAnswer('user_correct'), true);
  assertEquals(acceptsUserAnswer('both_correct'), true);
  assertEquals(acceptsUserAnswer('stated_correct'), false);
  assertEquals(acceptsUserAnswer('both_wrong'), false);
  assertEquals(acceptsUserAnswer('unclear'), false);
});

Deno.test('parseCheck liest sauberes JSON', () => {
  const check = parseCheck(
    '{"verdict":"user_correct","verifiedCorrectAnswer":"20","reason":"680 minus 660 sind 20."}',
  );
  assertEquals(check?.verdict, 'user_correct');
  assertEquals(check?.accepted, true);
  assertEquals(check?.verifiedCorrectAnswer, '20');
});

Deno.test('parseCheck findet JSON in umgebendem Text', () => {
  const check = parseCheck('Hier mein Urteil:\n```json\n{"verdict":"stated_correct","reason":"passt"}\n```');
  assertEquals(check?.verdict, 'stated_correct');
  assertEquals(check?.accepted, false);
  assertEquals(check?.verifiedCorrectAnswer, null);
});

Deno.test('unlesbare Antwort akzeptiert nicht', () => {
  assertEquals(parseCheck(''), null);
  assertEquals(parseCheck('Kein JSON hier'), null);
  assertEquals(parseCheck('{kaputt'), null);
});

Deno.test('unbekanntes verdict wird verworfen', () => {
  assertEquals(parseCheck('{"verdict":"vielleicht","reason":"x"}'), null);
});
