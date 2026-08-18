import { supabase } from '@/integrations/supabase/client';
import type { PreloadedQuestion } from '@/hooks/useQuestionPreloader';
import { getDemoQuestions } from '@/data/demoQuestions';

/**
 * Demo-Fragen für die Landingpage.
 *
 * Primärquelle sind echte, qualitätsgeprüfte Fragen aus `ai_question_cache`,
 * die über die SECURITY-DEFINER-RPC `get_demo_questions` auch anonym abrufbar
 * sind (nur Frageninhalte, kein Tabellenzugriff). Schlägt der Abruf fehl oder
 * liefert er nichts, greift der statisch gebündelte Pool als Fallback.
 */

const normalizeAnswer = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }
  return value;
};

const toOptions = (value: unknown): string[] | undefined => {
  const parsed = normalizeAnswer(value);
  if (!Array.isArray(parsed)) return undefined;
  const cleaned = parsed.map((o) => String(o).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
};

export async function fetchDemoQuestions(
  grade: number,
  subject: string,
  count: number
): Promise<{ questions: PreloadedQuestion[]; source: 'cache' | 'static' }> {
  try {
    const { data, error } = await supabase.rpc('get_demo_questions', {
      p_grade: grade,
      p_subject: subject,
      p_limit: count,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data
        .map((row: any, index: number): PreloadedQuestion | null => {
          const options = toOptions(row.options);
          const questionType = row.question_type === 'MULTIPLE_CHOICE' && options
            ? 'MULTIPLE_CHOICE'
            : 'FREETEXT';
          const correctAnswer = normalizeAnswer(row.correct_answer);

          if (!row.question_text || correctAnswer === null || correctAnswer === undefined) {
            return null;
          }

          return {
            id: `demo-cache-${grade}-${subject}-${index}-${Date.now()}`,
            grade: row.grade ?? grade,
            subject: row.subject ?? subject,
            difficulty: (row.difficulty as PreloadedQuestion['difficulty']) || 'medium',
            questionText: String(row.question_text),
            questionType,
            correctAnswer: typeof correctAnswer === 'object' ? String((correctAnswer as any).value ?? '') : correctAnswer,
            options: questionType === 'MULTIPLE_CHOICE' ? options : undefined,
            hint: row.hint || undefined,
            createdAt: new Date().toISOString(),
          };
        })
        .filter((q): q is PreloadedQuestion => q !== null && String(q.correctAnswer).length > 0);

      if (mapped.length > 0) {
        return { questions: mapped.slice(0, count), source: 'cache' };
      }
    }
  } catch (err) {
    console.warn('Demo-Fragen konnten nicht aus dem Cache geladen werden:', err);
  }

  return { questions: getDemoQuestions(grade, subject, count), source: 'static' };
}
