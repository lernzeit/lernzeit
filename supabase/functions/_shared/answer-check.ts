/**
 * Unabhängige Prüfung einer Schülerantwort.
 *
 * Warum es dieses Modul gibt: `validate-answer` verglich die Eingabe bisher nur
 * mit der hinterlegten Antwort und setzte diese als Wahrheit voraus. Gegen eine
 * falsche Musterlösung war das blind — bei
 *
 *   "Addiere die Zahlen 450 und 230. Subtrahiere von diesem Ergebnis das
 *    Dreifache der Differenz von 450 und 230."
 *
 * stand 158 im Cache, richtig sind 20. Das Kind rechnete richtig und bekam
 * "Nicht ganz". Die einzige Instanz, die das hätte auffangen können, war
 * `ai-explain` — und die läuft nur, wenn das Kind auf "Erklärung" tippt.
 *
 * Hier wird deshalb zuerst unabhängig gerechnet und erst danach verglichen.
 *
 * Die Funktionen sind bewusst frei von Netzwerk- und Deno-Aufrufen, damit sie
 * ohne laufende Edge Function testbar bleiben.
 */

import { validateMath } from './math-validator.ts';

export type AnswerVerdict =
  /** Hinterlegte Antwort stimmt, das Kind lag falsch. */
  | 'stated_correct'
  /** Das Kind hat recht, die hinterlegte Antwort ist falsch. */
  | 'user_correct'
  /** Beide vertretbar — Synonym, Rundung, andere Schreibweise. */
  | 'both_correct'
  /** Weder die hinterlegte noch die Antwort des Kindes stimmt. */
  | 'both_wrong'
  /** Nicht entscheidbar. */
  | 'unclear';

export interface AnswerCheck {
  /** true → die Antwort des Kindes wird als richtig gewertet. */
  accepted: boolean;
  verdict: AnswerVerdict;
  /** Die tatsächlich richtige Antwort, soweit ermittelbar. */
  verifiedCorrectAnswer: string | null;
  reason: string;
  /** Woher das Urteil stammt — für die Auswertung in answer_verdicts. */
  source: 'math-validator' | 'llm';
}

/** Verdicts, bei denen die Antwort des Kindes gutgeschrieben wird. */
export function acceptsUserAnswer(verdict: AnswerVerdict): boolean {
  return verdict === 'user_correct' || verdict === 'both_correct';
}

/**
 * Vergleicht zwei Antworten so, wie ein Mensch es täte: "0,5" und "0.5" sind
 * dasselbe, "20 Murmeln" und "20" auch. Bewusst eng gehalten — alles Weitere
 * (Synonyme, Tippfehler) entscheidet das Modell.
 */
export function looksEquivalent(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  if (norm(a) === norm(b)) return true;

  const num = (s: string) => {
    const cleaned = s.replace(/[^\d.,\-]/g, '').replace(',', '.');
    if (cleaned === '' || cleaned === '-') return null;
    const v = Number(cleaned);
    return Number.isFinite(v) ? v : null;
  };
  const na = num(a);
  const nb = num(b);
  return na !== null && nb !== null && Math.abs(na - nb) < 1e-9;
}

/**
 * Stufe 1 — kostenlos und ohne Modell.
 *
 * Greift nur, wenn `validateMath` die Aufgabe überhaupt nachrechnen kann. Das
 * ist längst nicht immer der Fall: Mehrschrittige Textaufgaben wie das Beispiel
 * oben erkennt der Validator nicht, dort übernimmt Stufe 2. Wo er aber greift,
 * ist sein Urteil verlässlicher als jedes Modell — deshalb steht er davor.
 *
 * Gibt null zurück, wenn keine Entscheidung möglich ist.
 */
export function deterministicAnswerCheck(
  question: string,
  statedAnswer: string,
  userAnswer: string,
): AnswerCheck | null {
  const stated = validateMath(question, statedAnswer);
  if (!stated.applicable) return null;

  const expected = stated.expected ?? null;
  const expectedText = expected === null || expected === undefined ? null : String(expected);
  const userMatchesExpected = expectedText !== null && looksEquivalent(userAnswer, expectedText);

  if (stated.valid) {
    // Hinterlegte Antwort ist nachgerechnet korrekt.
    return userMatchesExpected
      ? {
          accepted: true,
          verdict: 'both_correct',
          verifiedCorrectAnswer: expectedText,
          reason: 'Nachgerechnet: Antwort stimmt.',
          source: 'math-validator',
        }
      : {
          accepted: false,
          verdict: 'stated_correct',
          verifiedCorrectAnswer: expectedText,
          reason: 'Nachgerechnet: die hinterlegte Antwort ist korrekt.',
          source: 'math-validator',
        };
  }

  // Hinterlegte Antwort ist nachweislich falsch.
  if (userMatchesExpected) {
    return {
      accepted: true,
      verdict: 'user_correct',
      verifiedCorrectAnswer: expectedText,
      reason: `Nachgerechnet: richtig ist ${expectedText}, die hinterlegte Antwort "${statedAnswer}" ist falsch.`,
      source: 'math-validator',
    };
  }

  return {
    accepted: false,
    verdict: 'both_wrong',
    verifiedCorrectAnswer: expectedText,
    reason: `Nachgerechnet: richtig ist ${expectedText}.`,
    source: 'math-validator',
  };
}

/**
 * Stufe 2 — Modellprüfung.
 *
 * Der Aufbau folgt bewusst dem bereits bewährten Prompt aus `ai-explain`:
 * erst unabhängig lösen, dann vergleichen, dann urteilen. Anders als dort wird
 * hier KEIN Erklärtext erzeugt — das Modell soll ausschließlich urteilen.
 * Urteil und kindgerechte Formulierung in einem Aufruf zu verlangen ist genau
 * die Konstellation, in der beides auseinanderlaufen kann.
 */
export function buildCheckPrompt(
  question: string,
  statedAnswer: string,
  userAnswer: string,
  grade: number | undefined,
  subject: string | undefined,
): string {
  return `Du bist Lehrer für Klasse ${grade ?? '?'} im Fach ${subject ?? 'unbekannt'}.

AUFGABE: ${question}
HINTERLEGTE ANTWORT: ${statedAnswer}
ANTWORT DES KINDES: ${userAnswer}

SCHRITT 1 — Löse die Aufgabe selbst. Die hinterlegte Antwort ist dabei NICHT verbindlich; sie kann falsch sein.
SCHRITT 2 — Vergleiche dein Ergebnis mit der hinterlegten Antwort UND mit der Antwort des Kindes.
SCHRITT 3 — Urteile:
  • "stated_correct" — hinterlegte Antwort richtig, Kind falsch.
  • "user_correct"   — Kind richtig, hinterlegte Antwort FALSCH.
  • "both_correct"   — beide vertretbar (Synonym, Tippfehler, andere Schreibweise, gleichwertige Zahl wie 0,5 und 1/2).
  • "both_wrong"     — keine von beiden stimmt.
  • "unclear"        — nicht eindeutig entscheidbar.

REGELN:
- Tippfehler und Abkürzungen zählen als richtig ("Altlantik" = "Atlantik").
- Gleichwertige Zahlendarstellungen zählen als richtig ("0,5" = "1/2").
- Wähle "user_correct" nur, wenn du dir sicher bist. Im Zweifel "unclear".

ANTWORTE AUSSCHLIESSLICH als JSON:
{"verdict":"stated_correct"|"user_correct"|"both_correct"|"both_wrong"|"unclear","verifiedCorrectAnswer":"<die tatsächlich richtige Antwort>","reason":"<eine kurze Begründung>"}`;
}

const VERDICTS: readonly AnswerVerdict[] = [
  'stated_correct',
  'user_correct',
  'both_correct',
  'both_wrong',
  'unclear',
];

/**
 * Liest das Modellurteil.
 *
 * Bei unlesbarer Antwort wird bewusst NICHT akzeptiert: Eine zu Unrecht
 * gutgeschriebene Antwort ist schlimmer als eine, die das Kind über den
 * Erklärungsweg noch korrigiert bekommt.
 */
export function parseCheck(raw: string): AnswerCheck | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  const verdict = String(parsed.verdict ?? '') as AnswerVerdict;
  if (!VERDICTS.includes(verdict)) return null;

  const verified = parsed.verifiedCorrectAnswer;
  return {
    accepted: acceptsUserAnswer(verdict),
    verdict,
    verifiedCorrectAnswer:
      verified === null || verified === undefined || verified === '' ? null : String(verified),
    reason: String(parsed.reason ?? ''),
    source: 'llm',
  };
}
