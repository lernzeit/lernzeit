import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReviewItem } from '@/hooks/useReviewQueue';
import type { PreloadedQuestion, useQuestionPreloader } from '@/hooks/useQuestionPreloader';

/*
 * Berichtigung (11.10.2026): Falsch beantwortete Aufgaben liegen in
 * review_queue und werden einen Tag spaeter faellig. Hier werden sie fuer das
 * Kind sichtbar: Zahl auf dem Start, eigene kurze Runde je Fach. Richtig
 * berichtigt verlaesst die Aufgabe die Kiste (LearningGame).
 */
export const BERICHTIGUNG_JE_RUNDE = 5;

export function useBerichtigung(kindId?: string, klasse?: number) {
  const [faellig, setFaellig] = useState(0);
  const [spaeter, setSpaeter] = useState(0);

  const laden = useCallback(async () => {
    if (!kindId || !klasse) return;
    const jetzt = new Date().toISOString();
    const basis = () =>
      supabase.from('review_queue').select('id', { count: 'exact', head: true })
        .eq('user_id', kindId).eq('grade', klasse).eq('is_retired', false).eq('was_reported', false);
    const [a, b] = await Promise.all([basis().lte('next_review_at', jetzt), basis().gt('next_review_at', jetzt)]);
    setFaellig(a.count ?? 0);
    setSpaeter(b.count ?? 0);
  }, [kindId, klasse]);

  useEffect(() => {
    void laden();
  }, [laden]);

  /** Aufgaben fuer eine Runde: das Fach mit den meisten faelligen, hoechstens fuenf. */
  const runde = useCallback(async (): Promise<{ fach: string; aufgaben: ReviewItem[] } | null> => {
    if (!kindId || !klasse) return null;
    const { data } = await supabase.from('review_queue').select('*')
      .eq('user_id', kindId).eq('grade', klasse).eq('is_retired', false).eq('was_reported', false)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true }).limit(50);
    const alle = (data ?? []) as ReviewItem[];
    if (alle.length === 0) return null;
    const je = new Map<string, ReviewItem[]>();
    for (const a of alle) je.set(a.subject, [...(je.get(a.subject) ?? []), a]);
    const [fach, aufgaben] = [...je.entries()].sort((x, y) => y[1].length - x[1].length)[0];
    return { fach, aufgaben: aufgaben.slice(0, BERICHTIGUNG_JE_RUNDE) };
  }, [kindId, klasse]);

  return { faellig, spaeter, laden, runde };
}

/** Aufgabe aus der Kiste im Format des Spiels (id = Zeile in review_queue). */
export function berichtigungZuFrage(item: ReviewItem): PreloadedQuestion {
  return {
    id: item.id,
    grade: item.grade,
    subject: item.subject,
    difficulty: 'medium',
    questionText: item.question_text,
    questionType: item.question_type as PreloadedQuestion['questionType'],
    correctAnswer: item.correct_answer,
    options: item.options,
    hint: item.hint,
    createdAt: '',
  };
}

type Vorlader = ReturnType<typeof useQuestionPreloader>;

/**
 * Liefert die Aufgaben einer Berichtigung so, wie LearningGame sie sonst vom
 * Vorlader bekommt. Keine KI, kein Cache: nur die eigenen Fehler.
 */
export function useBerichtigungsVorlader(aufgaben: ReviewItem[] | undefined): Vorlader {
  const fragen = useMemo(() => (aufgaben ?? []).map(berichtigungZuFrage), [aufgaben]);
  const getQuestion = useCallback((i: number) => fragen[i] ?? null, [fragen]);
  const isQuestionReady = useCallback((i: number) => i < fragen.length, [fragen]);
  const nichts = useCallback(() => {}, []);
  return useMemo(() => ({
    questions: fragen,
    isInitialLoading: false,
    loadingProgress: fragen.length,
    totalQuestions: fragen.length,
    error: fragen.length ? null : 'Gerade gibt es nichts zu berichtigen.',
    getQuestion,
    isQuestionReady,
    updateDifficulty: nichts,
    cancelLoading: nichts,
    reload: nichts,
  }), [fragen, getQuestion, isQuestionReady, nichts]) as unknown as Vorlader;
}
