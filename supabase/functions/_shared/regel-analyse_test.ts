import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { baueAnalysePrompt, gruppiere, pruefeRegelwerk, type BestehendeRegel, type Feedback } from "./regel-analyse.ts";

const fb = (id: string, art: string, cat: string, grade = 7): Feedback =>
  ({ id, feedback_type: art, category: cat, grade, question_content: `Frage ${id}`, question_type: 'FREETEXT', feedback_details: null });

const bisher: BestehendeRegel[] = [
  { id: 'r1', rule_text: 'Gib bei Lückentexten das Ausgangswort in Klammern vor.', subject: 'english', grade_min: 7, grade_max: 7, source_feedback_count: 5, manuell: false },
  { id: 'r2', rule_text: 'Stelle sicher, dass die Antwort korrekt ist und so weiter.', subject: 'physics', grade_min: 7, grade_max: 7, source_feedback_count: 24, manuell: false },
  { id: 'm1', rule_text: 'Nenne bei Einheiten immer die gesuchte Einheit im Fragetext.', subject: null, grade_min: null, grade_max: null, source_feedback_count: 0, manuell: true },
];

Deno.test('gruppiere: nur Regel-Arten, Fächer normalisiert, größte zuerst', () => {
  const g = gruppiere([
    fb('1', 'too_hard', 'math'), fb('2', 'good_question', 'math'),
    fb('3', 'wrong_answer', 'Physik'), fb('4', 'wrong_answer', 'physics'), fb('5', 'wrong_answer', 'physics'),
    fb('6', 'confusing_question', 'english'),
  ]);
  assertEquals(g.map((x) => [x.fach, x.art, x.anzahl]), [['physics', 'wrong_answer', 3], ['english', 'confusing_question', 1]]);
});

Deno.test('Prompt: feste Regeln getrennt, Beispiele erst ab 3 Meldungen', () => {
  const p = baueAnalysePrompt(bisher, gruppiere([fb('3', 'wrong_answer', 'physics'), fb('6', 'other', 'english')]));
  assertEquals(p.includes('id=m1'), false);
  assertEquals(p.includes('Nenne bei Einheiten'), true);
  assertEquals(p.includes('Frage 3'), false);
});

Deno.test('pruefeRegelwerk: Duplikate, Grenzen, unbekannte ids, feste Regeln', () => {
  const z = pruefeRegelwerk({
    regeln: [
      { id: 'r1', text: 'Gib bei Lückentexten das Ausgangswort in Klammern vor.', fach: 'english', klasse_von: 7, klasse_bis: 7 },
      { id: 'r1', text: 'Gib bei Lückentexten das Ausgangswort in Klammern vor!', fach: 'english' },
      { id: 'xx', text: 'Formuliere Zuordnungen so, dass beide Spalten genannt werden.', fach: '', klasse_von: 1, klasse_bis: 10 },
      { text: 'Nenne bei Einheiten immer die gesuchte Einheit im Fragetext.' },
      { text: 'Kurz' },
      { text: 'Eine Regel für ein Fach, das es nicht gibt, zum Beispiel Sport.', fach: 'sport' },
      { id: 'm1', text: 'Vermeide Fragen zu Fachbegriffen, die leicht verwechselt werden.', fach: 'english', klasse_von: 9, klasse_bis: 5 },
      { text: 'Eine dritte Englisch-Regel, die über der Grenze je Fach liegt.', fach: 'english' },
    ],
  }, bisher);
  assertEquals(z.map((r) => [r.id, r.fach, r.klasse_von, r.klasse_bis]), [
    ['r1', 'english', 7, 7],
    [null, null, null, null],
    [null, 'english', 5, 9],
  ]);
});

Deno.test('pruefeRegelwerk: kaputte Antwort ergibt leeres Regelwerk', () => {
  assertEquals(pruefeRegelwerk(null, bisher), []);
  assertEquals(pruefeRegelwerk({ regeln: 'x' }, bisher), []);
});
