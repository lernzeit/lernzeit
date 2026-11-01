import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { regelBlock, waehleRegeln, type PromptRegel } from "./prompt-regeln.ts";

const r = (id: string, subject: string | null, min: number | null, max: number | null, n: number): PromptRegel =>
  ({ id, rule_text: `Regel ${id}`, subject, grade_min: min, grade_max: max, source_feedback_count: n });

const regeln = [
  r('a', null, null, null, 50),
  r('b', 'math', 5, 7, 3),
  r('c', 'math', null, null, 10),
  r('d', 'english', null, null, 99),
  r('e', null, 1, 4, 80),
  r('f', null, null, null, 1),
];

Deno.test('waehleRegeln: Fach vor allgemein, Klasse beachtet, höchstens 3', () => {
  assertEquals(waehleRegeln(regeln, 'math', 6).map((x) => x.id), ['c', 'b', 'a']);
  assertEquals(waehleRegeln(regeln, 'math', 9).map((x) => x.id), ['c', 'a', 'f']);
  assertEquals(waehleRegeln(regeln, 'german', 3).map((x) => x.id), ['e', 'a', 'f']);
});

Deno.test('regelBlock: leer ohne Regeln, sonst ganze Sätze', () => {
  assertEquals(regelBlock([]), '');
  const lang = { ...r('x', null, null, null, 1), rule_text: 'A'.repeat(150) };
  assertEquals(regelBlock([lang]).endsWith('A'.repeat(150)), true);
});
