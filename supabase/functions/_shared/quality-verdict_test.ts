import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  answerToString,
  buildUserPrompt,
  deterministicVerdict,
  parseVerdict,
  type CachedQuestion,
} from './quality-verdict.ts';

const q = (o: Partial<CachedQuestion>): CachedQuestion => ({
  id: 'x',
  grade: 5,
  subject: 'math',
  question_text: '',
  question_type: 'FREETEXT',
  category: 'calculation',
  correct_answer: null,
  options: null,
  ...o,
});

Deno.test('MULTIPLE_CHOICE: Index wird zur Option aufgeloest', () => {
  assertEquals(answerToString(2, 'MULTIPLE_CHOICE', ['a', 'b', 'c', 'd']), 'c');
});

Deno.test('FREETEXT: Zahl bleibt Zahl', () => {
  assertEquals(answerToString(19, 'FREETEXT', null), '19');
});

Deno.test('richtige Rechnung besteht ohne Modellaufruf', () => {
  const v = deterministicVerdict(q({ question_text: 'Was ist 12 + 7?', correct_answer: '19' }));
  assert(v, 'muss deterministisch entscheiden');
  assertEquals(v.ok, true);
  assertEquals(v.model, 'math-validator');
});

Deno.test('falsche Rechnung faellt durch und nennt den korrekten Wert', () => {
  const v = deterministicVerdict(q({ question_text: 'Was ist 12 + 7?', correct_answer: '21' }));
  assert(v);
  assertEquals(v.ok, false);
  assert(v.issues.includes('19'), `Befund muss die 19 nennen: ${v.issues}`);
});

Deno.test('falsche MC-Antwort wird ueber den Index erkannt', () => {
  const v = deterministicVerdict(q({
    question_text: 'Was ist 12 + 7?',
    question_type: 'MULTIPLE_CHOICE',
    options: ['18', '19', '20', '21'],
    correct_answer: 3,
  }));
  assert(v);
  assertEquals(v.ok, false);
});

Deno.test('Theoriefragen gehen nicht an den Mathe-Validator', () => {
  assertEquals(
    deterministicVerdict(q({
      category: 'theory',
      question_text: 'Wie heisst die Seite gegenueber dem rechten Winkel?',
      correct_answer: 'Hypotenuse',
    })),
    null,
  );
});

Deno.test('Nicht-Mathe-Faecher gehen nicht an den Mathe-Validator', () => {
  assertEquals(
    deterministicVerdict(q({ subject: 'german', question_text: 'Was ist 12 + 7?', correct_answer: '19' })),
    null,
  );
});

Deno.test('unparsbare Aufgabe faellt an die LLM-Stufe', () => {
  assertEquals(
    deterministicVerdict(q({ question_text: 'Nenne eine Primzahl unter 10', correct_answer: '7' })),
    null,
  );
});

Deno.test('Prompt verzweigt nach Kategorie', () => {
  const calc = buildUserPrompt(q({ question_text: 'Was ist 12 + 7?', correct_answer: '19' }));
  assert(calc.includes('Rechenaufgabe'));
  assert(calc.includes('Rechne die Aufgabe selbst'));

  const theory = buildUserPrompt(q({
    category: 'theory',
    grade: 9,
    question_text: 'Wie heisst ...?',
    correct_answer: 'Hypotenuse',
  }));
  assert(theory.includes('Theoriefrage'));
  assert(theory.includes('Lehrplaninhalt'));
  assert(
    !theory.includes('Rechne die Aufgabe selbst'),
    'Theoriefragen duerfen keinen Rechenauftrag enthalten',
  );
});

Deno.test('Prompt nennt die Klassenstufe', () => {
  assert(buildUserPrompt(q({ grade: 7, question_text: 'x', correct_answer: '1' })).includes('Klasse 7'));
});

Deno.test('parseVerdict verkraftet Markdown-Zaeune', () => {
  const v = parseVerdict('```json\n{"is_valid": false, "issue": "Ergebnis falsch"}\n```', 'testmodell');
  assert(v);
  assertEquals(v.ok, false);
  assertEquals(v.issues, 'Ergebnis falsch');
  assertEquals(v.model, 'testmodell');
});

Deno.test('parseVerdict lehnt unbrauchbare Antworten ab', () => {
  // Kein Urteil ist besser als ein falsches: Die Frage wird dann erneut geprueft.
  assertEquals(parseVerdict('Ich bin mir nicht sicher.', 'm'), null);
  assertEquals(parseVerdict('{"issue":"fehlt das Feld"}', 'm'), null);
});
