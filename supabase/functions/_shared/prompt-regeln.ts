/**
 * Prompt-Regeln aus Nutzer-Feedback (Tabelle `prompt_rules`).
 *
 * Eine Stelle für Auswahl und Format, genutzt vom Live-Pfad (ai-question-generator),
 * der Vorproduktion (cache-prefill) und dem Modellvergleich. Bis 01.11.2026 lud die
 * Vorproduktion ALLE aktiven Regeln (zuletzt 28) in jeden Prompt, der Live-Pfad
 * kürzte jede Regel nach 100 Zeichen mitten im Satz ab.
 *
 * Regeln sind Hinweise, keine Verbote: höchstens MAX_REGELN_JE_PROMPT pro Frage,
 * Fach-Regeln vor fachübergreifenden, dann nach Zahl der Meldungen.
 */

export const MAX_REGELN_JE_PROMPT = 3;
/** Obergrenze, die analyze-feedback beim Aufräumen einhält. */
export const MAX_AKTIVE_REGELN = 12;
export const MAX_REGELN_JE_FACH = 2;
export const MAX_REGELN_ALLGEMEIN = 4;
export const MAX_REGEL_ZEICHEN = 180;

export interface PromptRegel {
  id: string;
  rule_text: string;
  subject: string | null;
  grade_min: number | null;
  grade_max: number | null;
  source_feedback_count: number;
}

/** Passende Regeln für Fach und Klasse, die relevantesten zuerst. Rein, ohne Datenbank. */
export function waehleRegeln(
  regeln: PromptRegel[],
  fach: string,
  klasse: number,
  max = MAX_REGELN_JE_PROMPT,
): PromptRegel[] {
  return regeln
    .filter((r) => (r.subject == null || r.subject === fach)
      && (r.grade_min == null || r.grade_min <= klasse)
      && (r.grade_max == null || r.grade_max >= klasse))
    .sort((a, b) => {
      const fachA = a.subject ? 1 : 0;
      const fachB = b.subject ? 1 : 0;
      if (fachA !== fachB) return fachB - fachA;
      return (b.source_feedback_count ?? 0) - (a.source_feedback_count ?? 0);
    })
    .slice(0, max);
}

/** Block für den System-Prompt; leer ohne Regeln. */
export function regelBlock(regeln: PromptRegel[]): string {
  if (regeln.length === 0) return '';
  return '\n\nHINWEISE AUS NUTZER-FEEDBACK (beachten, ohne die Themenwahl einzuschränken):\n'
    + regeln.map((r) => `- ${r.rule_text.trim()}`).join('\n');
}

// deno-lint-ignore no-explicit-any
type Client = { from: (t: string) => any };

/** Alle aktiven Regeln (einmal je Lauf laden, dann je Frage mit waehleRegeln filtern). */
export async function ladeAktiveRegeln(client: Client): Promise<PromptRegel[]> {
  try {
    const { data, error } = await client
      .from('prompt_rules')
      .select('id, rule_text, subject, grade_min, grade_max, source_feedback_count')
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []) as PromptRegel[];
  } catch (e) {
    console.warn('Prompt-Regeln nicht geladen:', e);
    return [];
  }
}
