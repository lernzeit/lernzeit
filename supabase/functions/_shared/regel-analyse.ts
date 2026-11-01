/**
 * Reine Logik für analyze-feedback (ohne Datenbank, ohne KI-Aufruf), getestet in
 * regel-analyse_test.ts.
 *
 * Ein Lauf = EIN KI-Aufruf: Die KI bekommt das bestehende Regelwerk und das neue
 * Feedback in kompakter Form und gibt das vollständige, bereinigte Regelwerk zurück.
 * Bis 01.11.2026 gab es je Feedback-Gruppe einen eigenen Aufruf (~35 s je Stück);
 * die Funktion lief in die Zeitgrenze, bevor sie das Feedback als erledigt
 * markierte, und der nächste Lauf erzeugte dieselben Regeln noch einmal.
 */
import {
  MAX_AKTIVE_REGELN,
  MAX_REGEL_ZEICHEN,
  MAX_REGELN_ALLGEMEIN,
  MAX_REGELN_JE_FACH,
} from './prompt-regeln.ts';

/** Feedback-Arten, aus denen Regeln entstehen können. too_hard/too_easy sind
 *  persönlich, good_question würde die Fragen eher einengen als verbessern. */
export const REGEL_ARTEN = ['wrong_answer', 'confusing_question', 'other', 'wrong_question_type', 'inappropriate'];
/** Ab so vielen Meldungen derselben Art in einem Fach zeigt die KI Beispiele. */
export const MIN_GRUPPE = 3;
/** Automatischer Lauf nur, wenn genug neues Feedback da ist. */
export const MIN_FEEDBACK_FUER_LAUF = 10;

export const FAECHER = ['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin'];

const FACH_MAP: Record<string, string> = {
  mathematik: 'math', mathe: 'math', math: 'math',
  deutsch: 'german', german: 'german',
  englisch: 'english', english: 'english',
  erdkunde: 'geography', geographie: 'geography', geography: 'geography',
  geschichte: 'history', history: 'history',
  physik: 'physics', physics: 'physics',
  biologie: 'biology', biology: 'biology',
  chemie: 'chemistry', chemistry: 'chemistry',
  latein: 'latin', latin: 'latin',
};

export function normalisiereFach(f: string | null | undefined): string | null {
  if (!f) return null;
  return FACH_MAP[f.toLowerCase()] ?? null;
}

export interface Feedback {
  id: string;
  feedback_type: string;
  category: string | null;
  grade: number | null;
  question_content: string | null;
  question_type: string | null;
  feedback_details: unknown;
}

export interface BestehendeRegel {
  id: string;
  rule_text: string;
  subject: string | null;
  grade_min: number | null;
  grade_max: number | null;
  source_feedback_count: number;
  manuell: boolean;
}

export interface Gruppe {
  fach: string | null;
  art: string;
  anzahl: number;
  klassen: number[];
  ids: string[];
  beispiele: string[];
}

const kurz = (t: string, n: number) => {
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

function detailText(d: unknown): string {
  if (d == null) return '';
  if (typeof d === 'string') return d;
  try { return JSON.stringify(d); } catch { return ''; }
}

/** Feedback nach Fach und Art bündeln, größte Gruppen zuerst, höchstens 15. */
export function gruppiere(feedback: Feedback[]): Gruppe[] {
  const map = new Map<string, Gruppe>();
  for (const fb of feedback) {
    if (!REGEL_ARTEN.includes(fb.feedback_type)) continue;
    const fach = normalisiereFach(fb.category);
    const key = `${fach ?? '-'}|${fb.feedback_type}`;
    let g = map.get(key);
    if (!g) { g = { fach, art: fb.feedback_type, anzahl: 0, klassen: [], ids: [], beispiele: [] }; map.set(key, g); }
    g.anzahl++;
    g.ids.push(fb.id);
    if (fb.grade && !g.klassen.includes(fb.grade)) g.klassen.push(fb.grade);
    if (g.beispiele.length < 4) {
      const det = kurz(detailText(fb.feedback_details), 120);
      g.beispiele.push(`Kl. ${fb.grade ?? '?'}, ${fb.question_type ?? '?'}: "${kurz(fb.question_content ?? '', 130)}"${det ? ` – Meldung: ${det}` : ''}`);
    }
  }
  return [...map.values()]
    .map((g) => ({ ...g, klassen: g.klassen.sort((a, b) => a - b) }))
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 15);
}

export function baueAnalysePrompt(regeln: BestehendeRegel[], gruppen: Gruppe[]): string {
  const bereich = (r: BestehendeRegel) =>
    `${r.subject ?? 'alle Fächer'}, ${r.grade_min || r.grade_max ? `Kl. ${r.grade_min ?? 1}–${r.grade_max ?? 10}` : 'alle Klassen'}`;
  const fest = regeln.filter((r) => r.manuell);
  const auto = regeln.filter((r) => !r.manuell);
  const gruppenText = gruppen.length === 0 ? '(kein neues Feedback)' : gruppen.map((g) =>
    `• ${g.fach ?? 'ohne Fach'} / ${g.art}: ${g.anzahl} Meldungen, Klassen ${g.klassen.join(', ') || '?'}` +
    (g.anzahl >= MIN_GRUPPE ? '\n' + g.beispiele.map((b) => `    - ${b}`).join('\n') : '')
  ).join('\n');

  return `Du pflegst das Regelwerk eines KI-Fragengenerators für Schulkinder (Klasse 1–10).
Jede Regel wird in Prompts eingefügt und kostet bei jeder Frage Geld. Pro Frage werden höchstens 3 passende Regeln verwendet.

Der Grund-Prompt verlangt bereits: fachlich korrekte, selbst geprüfte Antwort; klare, eindeutige Formulierung;
passender Fragetyp; sofort lösbar mit einem Denkschritt; MATCH nur 1:1-Paare; SORT nur echte Reihenfolgen.
Regeln, die nur das wiederholen (z. B. "Stelle sicher, dass die Antwort korrekt ist"), sind überflüssig.

FESTE REGELN (vom Betreiber, nicht ändern, nicht wiederholen):
${fest.length ? fest.map((r) => `- [${bereich(r)}] ${r.rule_text}`).join('\n') : '(keine)'}

BISHERIGE AUTOMATISCHE REGELN (mit id):
${auto.length ? auto.map((r) => `- id=${r.id} [${bereich(r)}, ${r.source_feedback_count} Meldungen] ${r.rule_text}`).join('\n') : '(keine)'}

NEUES FEEDBACK VON NUTZERN:
${gruppenText}

AUFGABE: Gib das vollständige neue Regelwerk der automatischen Regeln zurück.
- Fasse doppelte und ähnliche Regeln zu einer zusammen; behalte dann die id der besten.
- Streiche überflüssige, zu allgemeine oder durch das Feedback nicht gestützte Regeln (einfach weglassen).
- Neue Regel nur für ein wiederkehrendes, konkretes Muster (mind. ${MIN_GRUPPE} Meldungen), das sich durch eine Anweisung beheben lässt.
- Regeln dürfen Themen, Fragetypen oder Schwierigkeit NICHT verbieten oder einengen. Sie beschreiben, WIE eine Frage gut wird, nicht WORÜBER.
- Einzelne falsche Fragen sind kein Muster (die werden ohnehin aus dem Vorrat entfernt).
- Jede Regel ein kurzer Imperativsatz, höchstens ${MAX_REGEL_ZEICHEN} Zeichen, auf Deutsch.
- Insgesamt höchstens ${MAX_AKTIVE_REGELN - fest.length} Regeln, je Fach höchstens ${MAX_REGELN_JE_FACH}, fachübergreifend höchstens ${MAX_REGELN_ALLGEMEIN}.
- Weniger ist besser. Ein leeres Regelwerk ist erlaubt.
- fach: einer von ${FAECHER.join(', ')} oder null für alle Fächer. klasse_von/klasse_bis: null für alle Klassen.`;
}

export const REGELWERK_TOOL = {
  type: 'function' as const,
  function: {
    name: 'regelwerk_speichern',
    description: 'Das vollständige, bereinigte Regelwerk der automatischen Regeln',
    parameters: {
      type: 'object',
      properties: {
        regeln: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'id einer bisherigen Regel, die weitergeführt wird; leer für neue Regeln' },
              text: { type: 'string' },
              fach: { type: 'string', description: 'Fachkürzel oder leer für alle Fächer' },
              klasse_von: { type: 'integer' },
              klasse_bis: { type: 'integer' },
            },
            required: ['text'],
          },
        },
      },
      required: ['regeln'],
    },
  },
};

export interface ZielRegel {
  id: string | null;
  text: string;
  fach: string | null;
  klasse_von: number | null;
  klasse_bis: number | null;
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-zäöüß0-9]+/g, ' ').trim();

/** KI-Antwort prüfen und auf die Grenzen kürzen. Unbekannte ids werden zu neuen Regeln. */
export function pruefeRegelwerk(roh: unknown, bisher: BestehendeRegel[]): ZielRegel[] {
  const liste = (roh && typeof roh === 'object' && Array.isArray((roh as { regeln?: unknown }).regeln))
    ? (roh as { regeln: unknown[] }).regeln : [];
  const autoIds = new Set(bisher.filter((r) => !r.manuell).map((r) => r.id));
  const festTexte = new Set(bisher.filter((r) => r.manuell).map((r) => norm(r.rule_text)));
  const maxGesamt = MAX_AKTIVE_REGELN - bisher.filter((r) => r.manuell).length;
  const gesehen = new Set<string>();
  const genutzteIds = new Set<string>();
  const jeFach = new Map<string, number>();
  const out: ZielRegel[] = [];

  for (const e of liste) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text.replace(/\s+/g, ' ').replace(/^["„]|["“]$/g, '').trim() : '';
    if (text.length < 15 || text.length > MAX_REGEL_ZEICHEN + 20) continue;
    const n = norm(text);
    if (gesehen.has(n) || festTexte.has(n)) continue;

    const fachRoh = typeof o.fach === 'string' ? o.fach.trim() : '';
    const fach = fachRoh && fachRoh !== 'null' ? normalisiereFach(fachRoh) : null;
    if (fachRoh && fachRoh !== 'null' && !fach) continue;

    const kl = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10 ? v : null);
    let von = kl(o.klasse_von);
    let bis = kl(o.klasse_bis);
    if (von && bis && von > bis) [von, bis] = [bis, von];
    if (von === 1 && bis === 10) { von = null; bis = null; }

    const schluessel = fach ?? '-';
    const grenze = fach ? MAX_REGELN_JE_FACH : MAX_REGELN_ALLGEMEIN;
    if ((jeFach.get(schluessel) ?? 0) >= grenze) continue;
    if (out.length >= maxGesamt) break;

    const idRoh = typeof o.id === 'string' ? o.id.trim() : '';
    const id = autoIds.has(idRoh) && !genutzteIds.has(idRoh) ? idRoh : null;
    if (id) genutzteIds.add(id);

    gesehen.add(n);
    jeFach.set(schluessel, (jeFach.get(schluessel) ?? 0) + 1);
    out.push({ id, text, fach, klasse_von: von, klasse_bis: bis });
  }
  return out;
}
