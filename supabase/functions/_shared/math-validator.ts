/**
 * Deterministic math validation.
 *
 * Checks whether a stated answer to a math question is arithmetically correct,
 * WITHOUT calling an LLM. Only handles patterns it can parse safely — everything
 * else returns `applicable: false` so the caller can fall back to an LLM check.
 */

import { evaluate } from 'https://esm.sh/mathjs@13.2.0';

export interface MathValidationResult {
  /** false → deterministic validation not possible, use the LLM fallback. */
  applicable: boolean;
  /** true/false when applicable, null otherwise. */
  valid: boolean | null;
  /** The computed expected value (as string) when applicable. */
  expected?: string;
  /** Machine-readable reason / matched pattern. */
  reason: string;
}

const NOT_APPLICABLE = (reason: string): MathValidationResult =>
  ({ applicable: false, valid: null, reason });

/** Length/mass/volume/time conversion factors to a base unit. */
const UNIT_FACTORS: Record<string, { dim: string; factor: number }> = {
  mm: { dim: 'length', factor: 0.001 },
  cm: { dim: 'length', factor: 0.01 },
  dm: { dim: 'length', factor: 0.1 },
  m:  { dim: 'length', factor: 1 },
  km: { dim: 'length', factor: 1000 },
  mg: { dim: 'mass', factor: 0.000001 },
  g:  { dim: 'mass', factor: 0.001 },
  kg: { dim: 'mass', factor: 1 },
  t:  { dim: 'mass', factor: 1000 },
  ml: { dim: 'volume', factor: 0.001 },
  cl: { dim: 'volume', factor: 0.01 },
  l:  { dim: 'volume', factor: 1 },
  s:   { dim: 'time', factor: 1 },
  sek: { dim: 'time', factor: 1 },
  min: { dim: 'time', factor: 60 },
  h:   { dim: 'time', factor: 3600 },
  std: { dim: 'time', factor: 3600 },
  '€': { dim: 'money', factor: 1 },
  eur: { dim: 'money', factor: 1 },
  ct:  { dim: 'money', factor: 0.01 },
  cent: { dim: 'money', factor: 0.01 },
};

/** Parses a German number ("3,5", "1.000", "12") into a JS number. */
export function parseGermanNumber(raw: string): number | null {
  const cleaned = raw.trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}\b)/g, '') // thousands separator
    .replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Extracts `{ value, unit }` from an answer like "12 cm" / "3,5 kg" / "7". */
export function parseValueWithUnit(raw: string): { value: number; unit: string | null } | null {
  const text = raw.trim().replace(/^=\s*/, '');
  const m = text.match(/^(-?[\d.,]+)\s*([a-zA-Zä€]{0,4})\.?$/);
  if (!m) return null;
  const value = parseGermanNumber(m[1]);
  if (value === null) return null;
  const unitRaw = (m[2] ?? '').toLowerCase();
  return { value, unit: unitRaw.length > 0 ? unitRaw : null };
}

function toBase(value: number, unit: string | null): { value: number; dim: string | null } {
  if (!unit) return { value, dim: null };
  const info = UNIT_FACTORS[unit];
  if (!info) return { value, dim: null };
  return { value: value * info.factor, dim: info.dim };
}

/** Normalises German math notation to something mathjs understands. */
export function normalizeExpression(input: string): string {
  return input
    .replace(/[−–—]/g, '-')
    .replace(/[·×✕x]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPRESSION_RE = /(-?\d+(?:[.,]\d+)?(?:\s*[+\-*/·×÷:]\s*\(?-?\d+(?:[.,]\d+)?\)?)+)/;

function safeEvaluate(expr: string): number | null {
  if (!/^[\d\s().,+\-*/]+$/.test(expr)) return null;
  try {
    const result = evaluate(expr);
    return typeof result === 'number' && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function compare(expected: number, answer: { value: number; unit: string | null }, reason: string, questionUnit?: string | null): MathValidationResult {
  let expectedValue = expected;
  let answerValue = answer.value;

  if (answer.unit && questionUnit) {
    const a = toBase(answer.value, answer.unit);
    const q = toBase(expected, questionUnit);
    if (a.dim && q.dim && a.dim === q.dim) {
      answerValue = a.value;
      expectedValue = q.value;
    } else if (answer.unit !== questionUnit) {
      return { applicable: true, valid: false, expected: `${expected} ${questionUnit}`, reason: 'unit_mismatch' };
    }
  }

  const tolerance = Math.max(1e-6, Math.abs(expectedValue) * 1e-9);
  return {
    applicable: true,
    valid: Math.abs(answerValue - expectedValue) <= tolerance,
    expected: String(Math.round(expected * 1e6) / 1e6),
    reason,
  };
}

/**
 * Validate the stated answer of a math question deterministically.
 * Returns `applicable: false` when no supported pattern matched.
 */
export function validateMath(question: string, statedAnswer: string): MathValidationResult {
  if (!question || statedAnswer === undefined || statedAnswer === null) {
    return NOT_APPLICABLE('empty_input');
  }

  const answer = parseValueWithUnit(String(statedAnswer));
  if (!answer) return NOT_APPLICABLE('answer_not_numeric');

  const q = normalizeExpression(question);

  // ── 1) Prozent: "20 % von 80" / "Wie viel sind 15% von 60?" ──
  const pct = q.match(/(-?\d+(?:\.\d+)?)\s*%\s*von\s*(-?\d+(?:\.\d+)?)/i);
  if (pct) {
    const expected = (Number(pct[1]) / 100) * Number(pct[2]);
    return compare(expected, answer, 'percent_of');
  }

  // ── 2) "zu je": "6 Kisten zu je 12 Äpfeln" ──
  const perEach = q.match(/(-?\d+(?:\.\d+)?)\s*[^\d]{0,30}?\bzu\s+je\b\s*(-?\d+(?:\.\d+)?)/i);
  if (perEach) {
    const expected = Number(perEach[1]) * Number(perEach[2]);
    return compare(expected, answer, 'per_each_product');
  }

  // ── 3) Einheiten-Umrechnung: "Wie viel cm sind 3 m?" ──
  const conversion = q.match(/wie\s*viele?\s*([a-zA-Zä€]{1,4})\s*(?:sind|ist|ergibt|entsprechen)\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Zä€]{1,4})/i);
  if (conversion) {
    const targetUnit = conversion[1].toLowerCase();
    const from = toBase(Number(conversion[2]), conversion[3].toLowerCase());
    const target = UNIT_FACTORS[targetUnit];
    if (target && from.dim === target.dim) {
      const expected = from.value / target.factor;
      return compare(expected, answer, 'unit_conversion');
    }
    return NOT_APPLICABLE('unknown_units');
  }

  // ── 4) Rechenausdruck: "12 + 7", "Berechne 3 · 4 + 2" ──
  const expr = q.match(EXPRESSION_RE);
  if (expr) {
    const value = safeEvaluate(expr[1]);
    if (value !== null) {
      // Take a trailing unit from the question if present, e.g. "3 m + 2 m = ? m"
      const unitInQuestion = q.match(/\d\s*(mm|cm|dm|km|kg|mg|ml|cl|min|std|sek|[mgltsh€])\b/i);
      return compare(value, answer, 'arithmetic_expression', unitInQuestion ? unitInQuestion[1].toLowerCase() : null);
    }
  }

  return NOT_APPLICABLE('no_pattern_matched');
}
