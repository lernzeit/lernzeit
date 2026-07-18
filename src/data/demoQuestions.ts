import type { PreloadedQuestion } from '@/hooks/useQuestionPreloader';

// Statisch gebündelte Demo-Fragen. Werden benutzt, wenn kein authentifizierter
// User vorhanden ist (Demo-Modus auf der Landingpage). So braucht die Demo
// keinen Edge-Function-Aufruf und funktioniert immer sofort.

type DemoQuestion = Omit<PreloadedQuestion, 'id' | 'createdAt'>;

const now = () => new Date().toISOString();

const POOL: Record<number, Record<string, DemoQuestion[]>> = {
  1: {
    math: [
      { grade: 1, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 3 + 4?', correctAnswer: '7' },
      { grade: 1, subject: 'math', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welche Zahl kommt nach 8?', options: ['6', '7', '9', '10'], correctAnswer: '9' },
      { grade: 1, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 10 - 6?', correctAnswer: '4' },
      { grade: 1, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 5 + 5?', correctAnswer: '10' },
      { grade: 1, subject: 'math', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welche Zahl ist größer?', options: ['7', '9'], correctAnswer: '9' },
      { grade: 1, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 2 + 6?', correctAnswer: '8' },
    ],
    german: [
      { grade: 1, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort beginnt mit „B"?', options: ['Apfel', 'Ball', 'Ente'], correctAnswer: 'Ball' },
      { grade: 1, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Wie viele Silben hat „Banane"?', options: ['1', '2', '3', '4'], correctAnswer: '3' },
      { grade: 1, subject: 'german', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie heißt das Gegenteil von „groß"?', correctAnswer: 'klein' },
      { grade: 1, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welcher Buchstabe fehlt: „Hun_"?', options: ['d', 't', 'k'], correctAnswer: 'd' },
      { grade: 1, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort ist ein Tier?', options: ['Auto', 'Katze', 'Stuhl'], correctAnswer: 'Katze' },
    ],
  },
  3: {
    math: [
      { grade: 3, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 7 · 6?', correctAnswer: '42' },
      { grade: 3, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist 125 + 78?', correctAnswer: '203' },
      { grade: 3, subject: 'math', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Wie viel ist 56 : 8?', options: ['6', '7', '8', '9'], correctAnswer: '7' },
      { grade: 3, subject: 'math', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Wie viel ist 9 · 8?', correctAnswer: '72' },
      { grade: 3, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist 300 - 145?', correctAnswer: '155' },
      { grade: 3, subject: 'math', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welche Zahl gerundet auf Zehner ergibt 80?', options: ['74', '77', '83', '86'], correctAnswer: '77' },
    ],
    german: [
      { grade: 3, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort ist ein Nomen?', options: ['laufen', 'schnell', 'Haus', 'blau'], correctAnswer: 'Haus' },
      { grade: 3, subject: 'german', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie heißt der Plural von „Buch"?', correctAnswer: 'Bücher' },
      { grade: 3, subject: 'german', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort wird großgeschrieben?', options: ['schnell', 'baum', 'Hund', 'lachen'], correctAnswer: 'Hund' },
      { grade: 3, subject: 'german', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort ist ein Verb?', options: ['Sonne', 'schön', 'singen', 'rot'], correctAnswer: 'singen' },
      { grade: 3, subject: 'german', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie heißt das Gegenteil von „hell"?', correctAnswer: 'dunkel' },
    ],
    english: [
      { grade: 3, subject: 'english', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Was heißt „Hund" auf Englisch?', options: ['cat', 'dog', 'horse', 'bird'], correctAnswer: 'dog' },
      { grade: 3, subject: 'english', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Was heißt „rot" auf Englisch?', correctAnswer: 'red' },
      { grade: 3, subject: 'english', difficulty: 'easy', questionType: 'MULTIPLE_CHOICE', questionText: 'Was heißt „Apfel" auf Englisch?', options: ['banana', 'apple', 'orange'], correctAnswer: 'apple' },
      { grade: 3, subject: 'english', difficulty: 'easy', questionType: 'FREETEXT', questionText: 'Was heißt „Buch" auf Englisch?', correctAnswer: 'book' },
      { grade: 3, subject: 'english', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Was heißt „Schule" auf Englisch?', options: ['school', 'street', 'shop'], correctAnswer: 'school' },
    ],
  },
  5: {
    math: [
      { grade: 5, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist 1/2 + 1/4?', correctAnswer: '3/4' },
      { grade: 5, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist 20 % von 150?', correctAnswer: '30' },
      { grade: 5, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist -5 + 12?', correctAnswer: '7' },
      { grade: 5, subject: 'math', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welcher Bruch ist am größten?', options: ['1/2', '2/5', '3/4', '1/3'], correctAnswer: '3/4' },
      { grade: 5, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist 3,5 · 4?', correctAnswer: '14' },
    ],
    german: [
      { grade: 5, subject: 'german', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welcher Satz ist richtig?', options: ['Er geht ins Haus.', 'Er gehen ins Haus.', 'Er geht in Haus.'], correctAnswer: 'Er geht ins Haus.' },
      { grade: 5, subject: 'german', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie heißt der Plural von „Kind"?', correctAnswer: 'Kinder' },
      { grade: 5, subject: 'german', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welches Wort ist ein Adjektiv?', options: ['Freude', 'freundlich', 'freuen'], correctAnswer: 'freundlich' },
    ],
    english: [
      { grade: 5, subject: 'english', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Choose the correct form: „She ___ to school every day."', options: ['go', 'goes', 'going'], correctAnswer: 'goes' },
      { grade: 5, subject: 'english', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Was heißt „gestern" auf Englisch?', correctAnswer: 'yesterday' },
      { grade: 5, subject: 'english', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'What is the past tense of „go"?', options: ['goed', 'went', 'gone'], correctAnswer: 'went' },
    ],
  },
  7: {
    math: [
      { grade: 7, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Löse: 2x + 6 = 20. x = ?', correctAnswer: '7' },
      { grade: 7, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel sind 15 % von 240?', correctAnswer: '36' },
      { grade: 7, subject: 'math', difficulty: 'hard', questionType: 'FREETEXT', questionText: 'Vereinfache: 3(x + 2) - 2x. Ergebnis:', correctAnswer: 'x + 6' },
      { grade: 7, subject: 'math', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welcher Bruch ist gleich 0,75?', options: ['1/4', '2/3', '3/4', '4/5'], correctAnswer: '3/4' },
    ],
    german: [
      { grade: 7, subject: 'german', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Welche Zeitform: „Ich bin gelaufen."', options: ['Präsens', 'Präteritum', 'Perfekt', 'Futur'], correctAnswer: 'Perfekt' },
      { grade: 7, subject: 'german', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie heißt das Gegenteil von „mutig"?', correctAnswer: 'ängstlich' },
    ],
    english: [
      { grade: 7, subject: 'english', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Choose the correct tense: „I ___ my homework yesterday."', options: ['do', 'did', 'done'], correctAnswer: 'did' },
      { grade: 7, subject: 'english', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'What is the past tense of „write"?', correctAnswer: 'wrote' },
    ],
  },
  9: {
    math: [
      { grade: 9, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Löse: x² = 49. x = ? (positive Lösung)', correctAnswer: '7' },
      { grade: 9, subject: 'math', difficulty: 'hard', questionType: 'FREETEXT', questionText: 'Wie lang ist die Hypotenuse bei a=3, b=4?', correctAnswer: '5' },
      { grade: 9, subject: 'math', difficulty: 'medium', questionType: 'FREETEXT', questionText: 'Wie viel ist √81?', correctAnswer: '9' },
    ],
    english: [
      { grade: 9, subject: 'english', difficulty: 'medium', questionType: 'MULTIPLE_CHOICE', questionText: 'Choose: „If I ___ rich, I would travel."', options: ['am', 'was', 'were', 'be'], correctAnswer: 'were' },
    ],
  },
};

const findClosestGrade = (grade: number): number => {
  const grades = Object.keys(POOL).map(Number).sort((a, b) => a - b);
  return grades.reduce((prev, curr) =>
    Math.abs(curr - grade) < Math.abs(prev - grade) ? curr : prev
  , grades[0]);
};

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function getDemoQuestions(
  grade: number,
  subject: string,
  count: number
): PreloadedQuestion[] {
  const targetGrade = POOL[grade] ? grade : findClosestGrade(grade);
  const bySubject = POOL[targetGrade] || {};
  const pool = bySubject[subject] || bySubject['math'] || [];

  if (pool.length === 0) return [];

  const shuffled = shuffle(pool);
  const selected: DemoQuestion[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(shuffled[i % shuffled.length]);
  }

  return selected.map((q, idx) => ({
    ...q,
    id: `demo-${grade}-${subject}-${idx}-${Date.now()}`,
    createdAt: now(),
  })) as PreloadedQuestion[];
}

export const isDemoSubjectSupported = (grade: number, subject: string): boolean => {
  const targetGrade = POOL[grade] ? grade : findClosestGrade(grade);
  return !!POOL[targetGrade]?.[subject];
};