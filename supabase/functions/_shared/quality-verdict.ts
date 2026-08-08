/**
 * Reine Urteilslogik der Cache-Qualitätsprüfung.
 *
 * Bewusst von `cache-quality-check/index.ts` getrennt: Diese Funktionen
 * entscheiden, ob eine Frage aus der Auslieferung genommen wird — die
 * sicherheitskritischste Logik des Jobs. Sie muss ohne laufenden HTTP-Server
 * testbar sein.
 *
 * Kein Netzwerk, keine Datenbank, kein Deno-spezifisches API.
 */

import { validateMath } from './math-validator.ts';

export interface CachedQuestion {
  id: string;
  grade: number;
  subject: string;
  question_text: string;
  question_type: string;
  category: string;
  correct_answer: unknown;
  options: unknown;
}

export interface Verdict {
  ok: boolean;
  issues: string;
  model: string;
}

/**
 * Bringt die gespeicherte Antwort in eine vergleichbare Zeichenkette.
 *
 * Bei MULTIPLE_CHOICE ist `correct_answer` ein Index in `options` — ohne diese
 * Auflösung würde der Mathe-Validator den Index statt des Werts prüfen und
 * jede korrekte Frage beanstanden.
 */
export function answerToString(raw: unknown, questionType: string, options: unknown): string {
  if (questionType === 'MULTIPLE_CHOICE' && Array.isArray(options)) {
    const idx = Number(raw);
    if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
      return String(options[idx]);
    }
  }
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  return JSON.stringify(raw);
}

/**
 * Stufe 1 — deterministisch, ohne Modellaufruf.
 *
 * Greift nur bei Rechenaufgaben im Fach Mathematik mit auswertbarem Ausdruck.
 * `null` bedeutet: nicht entscheidbar, weiter an die LLM-Stufe. Das ist der
 * kostensparende Teil — was hier entschieden wird, verbraucht kein Kontingent.
 */
export function deterministicVerdict(q: CachedQuestion): Verdict | null {
  if (q.category === 'theory') return null;
  if (!q.subject.includes('math')) return null;

  const stated = answerToString(q.correct_answer, q.question_type, q.options);
  const result = validateMath(q.question_text, stated);

  if (!result.applicable) return null;

  return result.valid
    ? { ok: true, issues: '', model: 'math-validator' }
    : {
        ok: false,
        issues: `Rechenfehler: angegeben "${stated}", korrekt "${result.expected}" (${result.reason})`,
        model: 'math-validator',
      };
}

export function buildSystemPrompt(): string {
  return `Du bist ein strenger Fachprüfer für deutsche Schulaufgaben.
Du beurteilst, ob eine Aufgabe samt angegebener Lösung korrekt und für die
Klassenstufe angemessen ist.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown, ohne Fließtext:
{"is_valid": true|false, "issue": "kurze Begründung bei false, sonst leer"}

Sei zurückhaltend mit false: Beanstande nur, was eindeutig falsch, mehrdeutig
oder klar lehrplanfremd ist. Stilfragen sind kein Grund.`;
}

/**
 * Der Prüfauftrag unterscheidet sich grundlegend nach Kategorie. Bei
 * Theoriefragen gibt es nichts nachzurechnen — genau daran würde die
 * bestehende `validate-question` scheitern, deren Prompt „Berechne die korrekte
 * Antwort SELBST" lautet.
 */
export function buildUserPrompt(q: CachedQuestion): string {
  const stated = answerToString(q.correct_answer, q.question_type, q.options);
  const optionsLine = Array.isArray(q.options) && q.options.length > 0
    ? `\nOPTIONEN: ${JSON.stringify(q.options)}`
    : '';

  const task = q.category === 'theory'
    ? `PRÜFAUFTRAG (Theoriefrage):
1. Ist die angegebene Antwort fachlich korrekt?
2. Ist der abgefragte Begriff in Klasse ${q.grade} Lehrplaninhalt — nicht deutlich darüber?
3. Ist die Frage eindeutig, also nur mit dieser einen Antwort korrekt beantwortbar?`
    : `PRÜFAUFTRAG (Rechenaufgabe):
1. Rechne die Aufgabe selbst und vergleiche mit der angegebenen Antwort.
2. Ist die Aufgabe für Klasse ${q.grade} angemessen?
3. Ist sie eindeutig gestellt und im Kopf lösbar?`;

  return `FACH: ${q.subject}
KLASSE: ${q.grade}
FRAGETYP: ${q.question_type}
FRAGE: ${q.question_text}${optionsLine}
ANGEGEBENE ANTWORT: ${stated}

${task}`;
}

/** Zerlegt die Modellantwort. `null` = kein verwertbares Urteil. */
export function parseVerdict(text: string, model: string): Verdict | null {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as { is_valid?: unknown; issue?: unknown };
    if (typeof parsed.is_valid !== 'boolean') return null;
    return {
      ok: parsed.is_valid,
      issues: typeof parsed.issue === 'string' ? parsed.issue.substring(0, 500) : '',
      model,
    };
  } catch {
    return null;
  }
}
