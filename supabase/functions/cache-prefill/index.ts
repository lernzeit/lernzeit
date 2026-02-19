import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limit: Gemini 2.5 Pro Free Tier = 5 RPM, 50 RPD ──
const DELAY_BETWEEN_REQUESTS_MS = 13_000; // ~4.6/min → under 5 RPM limit
const MAX_QUESTIONS_PER_RUN = 15;         // conserves daily quota (leaves buffer)
const MIN_CACHE_THRESHOLD = 20;           // generate until each combo has this many

// ── Curriculum: grade → subject → skill list (aligned with Lehrplan) ──
const CURRICULUM: Record<number, Record<string, string[]>> = {
  1: {
    math: [
      'Zählen bis 10; Anzahlen vergleichen und darstellen',
      'Addition und Subtraktion im Zahlenraum 10 ohne Übergang',
      'Zahlen bis 20 darstellen, ordnen und vergleichen',
      'Addition und Subtraktion im Zahlenraum 20 mit Zehnerübergang',
      'Zahlen bis 100 erkunden; Zehner und Einheiten',
      'Halbschriftliche Verfahren im Zahlenraum 100 ohne Übergang',
      'Längen schätzen und vergleichen (unstandardisiert)',
      'Einfache Strichlisten und Bilddiagramme lesen',
    ],
    german: [
      'Buchstaben und Laute; Laut-Buchstaben-Zuordnung',
      'Einfache Wörter lesen und schreiben',
      'Satzzeichen: Punkt, Fragezeichen, Ausrufezeichen',
      'Groß- und Kleinschreibung: Nomen erkennen',
    ],
  },
  2: {
    math: [
      'Addition und Subtraktion im Zahlenraum 100 halbschriftlich mit Übergang',
      'Einmaleins: 2er-, 5er-, 10er-Reihe; Tausch- und Verbundaufgaben',
      'Kleines Einmaleins vollständig (1–10); Umkehraufgaben',
      'Division als Aufteilen und Verteilen',
      'Standardverfahren Addition und Subtraktion (Zahlenraum 1000 vorbereiten)',
      'Geld: Einkaufssituationen bis 100 € (ohne Komma)',
      'Einheiten: cm–m; min–h; €–Cent (ganzzahlig)',
      'Säulen- und Bilddiagramme interpretieren',
    ],
    german: [
      'Wortarten: Nomen, Verben, Adjektive unterscheiden',
      'Satzglieder: Subjekt und Prädikat erkennen',
      'Rechtschreibung: Dehnung, Schärfung, Auslautverhärtung',
      'Texte lesen und Fragen dazu beantworten',
    ],
  },
  3: {
    math: [
      'Zahlenraum 1000: Ordnen, Runden, Zahlstrahl',
      'Schriftliche Addition und Subtraktion mit Übergang im Zahlenraum 1000',
      'Multiplikation: 1×n mit Strategie (ohne schriftlichen Algorithmus)',
      'Division mit Rest; Beziehungen zwischen Multiplikation und Division',
      'Schriftliche Multiplikation mit einstelligem Faktor',
      'Brüche als Teile vom Ganzen; einfache gleichnamige Vergleiche',
      'Fläche und Umfang: Formelverständnis U=2(a+b), A=a·b (ganzzahlig)',
      'Zeitspannen über Tagesgrenzen; Kalender',
    ],
    german: [
      'Satzarten und Satzzeichen; direkte Rede',
      'Verben konjugieren: Präsens, Präteritum, Perfekt',
      'Steigerung von Adjektiven (Komparativ, Superlativ)',
      'Texte strukturieren: Einleitung, Hauptteil, Schluss',
    ],
  },
  4: {
    math: [
      'Zahlenraum bis 1 Million: Stellenwert, Runden, Zahlbeziehungen',
      'Schriftliche Multiplikation: mehrstellig × mehrstellig',
      'Schriftliche Division: mehrstelliger Divisor (Standardverfahren)',
      'Brüche: Erweitern, Kürzen, gleichnamig addieren',
      'Dezimalzahlen: Brüche als Dezimalzahlen (endliche)',
      'Rechnen mit Dezimalzahlen: + − × ÷ (einfach, sachbezogen)',
      'Einheiten und Umrechnungen: mm–cm–m–km; g–kg; ml–l; € mit Komma',
      'Koordinatensystem (1. Quadrant): Punkte lesen und setzen',
    ],
    german: [
      'Kommasetzung bei Aufzählungen und Nebensätzen',
      'Kasus (Fälle): Nominativ, Genitiv, Dativ, Akkusativ',
      'Satzgefüge: Haupt- und Nebensätze',
      'Aufsatz: Berichten, Beschreiben, Erzählen',
    ],
  },
  5: {
    math: [
      'Negative Zahlen: Zahlengerade, Vergleiche, Addition und Subtraktion',
      'Brüche und Dezimalzahlen: Erweitern, Kürzen, Vergleich, Umwandlung',
      'Bruchrechnung: Addition, Subtraktion, Multiplikation, Division (sachbezogen)',
      'Proportionalität und Dreisatz: direkt proportional, Skalen',
      'Prozentrechnung (Grundideen): Prozentwert, Grundwert, Prozentsatz',
      'Lineare Gleichungen: ax + b = c lösen (einfach)',
      'Koordinatensystem: Tabellen ↔ Graphs',
      'Kreis: Umfang und Fläche (einfach)',
    ],
    german: [
      'Satzanalyse: Satzglieder (Subjekt, Prädikat, Objekte, Adverbiale)',
      'Wortbildung: Komposition, Derivation',
      'Rechtschreibstrategien: Wortverlängerung, Ableitungen',
      'Erörterung: Argumente strukturieren und belegen',
    ],
    english: [
      'Simple Present and Simple Past: regular and irregular verbs',
      'Questions and negations with do/does/did',
      'Vocabulary: school, hobbies, daily routine, family',
      'Reading comprehension: short texts about everyday topics',
    ],
  },
  6: {
    math: [
      'Prozentrechnung (Aufbau): Grundaufgaben, bequeme Prozentsätze',
      'Verhältnis und Skalierung: Anteile, Mischaufgaben (einfach)',
      'Rationale Zahlen: Rechnen mit Vorzeichen (einfach)',
      'Ganzrationale Potenzen: Quadrat, Kubik, Potenzschreibweise',
      'Lineare Gleichungen mit Klammern und Brüchen',
      'Direkte und indirekte Proportionalität: grafisch und rechnerisch',
      'Kreis: Umfang und Fläche mit Sachaufgaben',
      'Prismen und Zylinder: Oberfläche und Volumen',
    ],
    german: [
      'Indirekte Rede und Konjunktiv I',
      'Passiv: Formen und Verwendung',
      'Literatur: Gedichte analysieren (Metrum, Reim, Stilmittel)',
      'Argumentieren und Diskutieren: Meinungen begründen',
    ],
    english: [
      'Present Perfect with have/has; since and for',
      'Comparison of adjectives: comparative and superlative',
      'Conditional sentences type 1 (If ... will ...)',
      'Vocabulary: environment, travel, technology',
    ],
  },
  7: {
    math: [
      'Prozent und Zins: Zins, Tageszins, Zinseszins (iterativ)',
      'Terme umformen: Ausklammern, Klammerregeln, Distributivgesetz',
      'Rationale Zahlen sicher: + − × ÷ mit Brüchen und Dezimalzahlen',
      'Lineare Gleichungen sichern: mit Brüchen und Klammern',
      'Zuordnungen und Funktionen: direkt/indirekt proportional; Steigung',
      'Zylinder und Prismen: Netze, Schrägbild',
      'Prozentanwendung: Rabatt und Preiserhöhung',
      'Baumdiagramme (1–2 Stufen): absolute und relative Häufigkeit',
    ],
    german: [
      'Epochen der Literatur: Märchen, Fabeln, Novellen',
      'Rhetorische Mittel: Metapher, Vergleich, Personifikation, Ironie',
      'Erörterung: lineare und dialektische Argumentation',
      'Sprachgeschichte: Fremdwörter und Lehnwörter',
    ],
    english: [
      'Simple Past vs. Present Perfect: differences and usage',
      'Modal verbs: can, could, may, might, must, should, would',
      'Passive voice: Present and Past Passive',
      'Reading comprehension: articles, stories, dialogues',
    ],
  },
  8: {
    math: [
      'Lineare Funktionen: Darstellung, Steigung, Achsenabschnitt',
      'Lineare Gleichungssysteme: grafisch, Einsetz-, Gleichsetzungsverfahren',
      'Termumformungen (Routine): Distributivgesetz, Binomische Formeln',
      'Ähnlichkeit und Strahlensätze: Streckung, Verhältnisse, Anwendungen',
      'Kreis und Zylinder: Berechnungen und Anwendungen',
      'Modellieren mit linearen Funktionen',
      'Prozent und Zins (vertiefen): Tabellenkalkulation für Zinsen',
      'Stochastik: Vierfeldertafel, bedingte Häufigkeiten (einfach)',
    ],
    german: [
      'Dramenanalyse: Struktur, Konflikt, Figuren',
      'Sprachebenen: Dialekt, Standardsprache, Fachsprache',
      'Protokoll und Zusammenfassung schreiben',
      'Analyse von Sachtexten und Medientexten',
    ],
    english: [
      'Conditional sentences type 2 (If ... would ...)',
      'Reported speech: statements and questions',
      'Vocabulary: media, society, global issues',
      'Writing: argumentative essays and formal letters',
    ],
  },
  9: {
    math: [
      'Pythagoras (Anwendung): Strecken berechnen, Orthogonalität',
      'Trigonometrie: Sinus, Kosinus, Tangens im rechtwinkligen Dreieck',
      'Quadratische Gleichungen: x²=a; pq-Formel',
      'Quadratische Funktionen: Scheitel, Nullstellen, Graphen',
      'Kreisgeometrie: Kreissektor, zusammengesetzte Figuren',
      'Wurzeln und Potenzen: Potenzgesetze (einfach)',
      'Baumdiagramme (mehrstufig): erwartete Werte (einfach)',
      'Vektoren (Basis): Längen (Betrag) mit Pythagoras',
    ],
    german: [
      'Romananalyse: Perspektive, Erzählhaltung, Charakterentwicklung',
      'Argumentation und Rhetorik: Rede und Gegenrede',
      'Sprachwandel: historische Entwicklung des Deutschen',
      'Interpretation lyrischer Texte (moderne Lyrik)',
    ],
    english: [
      'Conditional sentences type 3 (If ... had ... would have ...)',
      'Vocabulary in context: global challenges, technology, culture',
      'Analysing poems and short stories in English',
      'Writing: opinion essays and narrative texts',
    ],
  },
  10: {
    math: [
      'Quadratische Funktionen (vertiefen): Scheitel-/Normalform, Transformationen',
      'Exponentialfunktionen: Wachstum (einfach), Parameter deuten',
      'Lineare und quadratische Gleichungssysteme (einfach)',
      'Zinseszins: Effektivzins (einfach)',
      'Ähnlichkeit und Strahlensätze: komplexe Anwendungen',
      'Bruchterme: Definitionsmenge, Bruchgleichungen (einfach)',
      'Wahrscheinlichkeit: Pfadregeln, einfache Formeln',
      'Statistik (vertieft): Streuungsmaße, Ausreißer, kritische Bewertung',
    ],
    german: [
      'Abiturrelevante Textformen: Textgebundene Erörterung',
      'Sprachkritik und Sprachmanipulation erkennen',
      'Literaturgeschichte: Weimarer Klassik bis Gegenwart',
      'Wissenschaftliches Schreiben: Zitieren, Belegen, Strukturieren',
    ],
    english: [
      'Advanced grammar: mixed conditionals, complex tenses',
      'Academic vocabulary and collocations',
      'Text analysis: newspapers, speeches, literary texts',
      'Writing: analytical essays and summaries in English',
    ],
  },
};

// Question type rotation — ensures variety per grade/subject combination
const TYPE_ROTATION: Record<string, string[]> = {
  math:      ['MULTIPLE_CHOICE', 'FREETEXT', 'FILL_BLANK', 'MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MULTIPLE_CHOICE', 'FILL_BLANK'],
  german:    ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SORT', 'FREETEXT', 'MULTIPLE_CHOICE', 'MATCH', 'FILL_BLANK', 'FREETEXT'],
  english:   ['MULTIPLE_CHOICE', 'FILL_BLANK', 'FREETEXT', 'SORT', 'MULTIPLE_CHOICE', 'MATCH', 'FREETEXT', 'FILL_BLANK'],
  default:   ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MULTIPLE_CHOICE', 'MATCH', 'FREETEXT'],
};

const DIFFICULTIES: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'medium', 'hard', 'medium', 'easy', 'hard', 'medium'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getQuestionType(subject: string, slotIndex: number): string {
  const rotation = TYPE_ROTATION[subject] ?? TYPE_ROTATION.default;
  return rotation[slotIndex % rotation.length];
}

function getDifficulty(slotIndex: number): 'easy' | 'medium' | 'hard' {
  return DIFFICULTIES[slotIndex % DIFFICULTIES.length];
}

function pickSkill(grade: number, subject: string, slotIndex: number): string {
  const skills = CURRICULUM[grade]?.[subject] ?? [];
  if (skills.length === 0) return '';
  return skills[slotIndex % skills.length];
}

function getSubjectGerman(subject: string): string {
  const map: Record<string, string> = {
    math: 'Mathematik', german: 'Deutsch', english: 'Englisch',
    geography: 'Geografie', history: 'Geschichte', physics: 'Physik',
    biology: 'Biologie', chemistry: 'Chemie', latin: 'Latein', science: 'Sachkunde',
  };
  return map[subject] ?? subject;
}

function getAgeContext(grade: number): string {
  const age = 5 + grade;
  return `Klasse ${grade} (ca. ${age}–${age + 1} Jahre alt)`;
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Du bist ein erfahrener deutscher Schulpädagoge und Aufgabenentwickler.
Du erstellst lehrplangerechte, pädagogisch hochwertige Lernaufgaben für deutsche Schüler.

DEINE QUALITÄTSSTANDARDS:
- Lehrplankonform und altersgerecht für die angegebene Klassenstufe
- Fachlich korrekt – überprüfe deine eigenen Antworten vor der Ausgabe
- Sprachlich klar, eindeutig und motivierend formuliert
- Aufgabenvielfalt: verschiedene kognitive Anforderungsbereiche (AFB I: Reproduzieren, AFB II: Zusammenhänge herstellen, AFB III: Reflektieren)
- Antwort NUR als gültiges JSON-Objekt, ohne Markdown, ohne Erklärungen außerhalb des JSON`;
}

function buildQuestionPrompt(
  grade: number,
  subject: string,
  skill: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionType: string,
): string {
  const subjectGerman = getSubjectGerman(subject);
  const ageContext = getAgeContext(grade);
  const difficultyLabel = { easy: 'AFB I (Grundwissen, Reproduzieren)', medium: 'AFB II (Anwenden, Verknüpfen)', hard: 'AFB III (Problemlösen, Reflektieren)' }[difficulty];

  const typeInstructions = getTypeInstructions(questionType);

  return `Erstelle eine Lernaufgabe für folgende Kombination:

KLASSENSTUFE: ${ageContext}
FACH: ${subjectGerman}
THEMA/KOMPETENZ: ${skill}
SCHWIERIGKEITSGRAD: ${difficulty} → ${difficultyLabel}
AUFGABENTYP: ${questionType}

${typeInstructions}

QUALITÄTSPRÜFUNG (vor der Ausgabe selbst durchführen):
□ Ist die Frage/Aufgabe für die Klassenstufe angemessen?
□ Ist die angegebene Antwort mathematisch/fachlich korrekt?
□ Ist die Aufgabe eindeutig und missverständnisfrei formuliert?
□ Passt der Fragetyp zur Aufgabenstellung?

Antworte AUSSCHLIESSLICH mit diesem JSON (kein Markdown, keine Erklärungen):
{
  "question_text": "Die vollständige Aufgabenstellung hier",
  "question_type": "${questionType}",
  "correct_answer": <korrekte Antwort im beschriebenen Format>,
  "options": <nur bei MULTIPLE_CHOICE: Array mit genau 4 Strings, sonst null>,
  "task": <nur bei FILL_BLANK: Satz mit ___ als Platzhalter, sonst null>,
  "hint": "Ein hilfreicher Hinweis für Schüler (max. 1 Satz)",
  "quality_check": "bestanden"
}`;
}

function getTypeInstructions(questionType: string): string {
  const instructions: Record<string, string> = {
    MULTIPLE_CHOICE: `MULTIPLE_CHOICE – Einfachauswahl mit 4 Optionen:
- correct_answer: Ganzzahl 0–3 (Index der richtigen Antwort)
- options: Array mit genau 4 Strings. Option am Index correct_answer ist korrekt.
- Distraktoren sollen plausibel aber eindeutig falsch sein
- Alle Optionen ähnlich lang und gleich plausibel formuliert`,

    FREETEXT: `FREETEXT – Offene Frage mit klar definierter Antwort:
- correct_answer: String mit der erwarteten Antwort (präzise, kurz)
- options: null
- Die Frage muss eine eindeutige, kurze Antwort haben (keine Meinungsfragen)
- Für Mathematik: Ergebnis als Zahl oder kurzer Ausdruck`,

    FILL_BLANK: `FILL_BLANK – Lückentext:
- task: Vollständiger Satz/Text mit ___ als Platzhalter für die Lücke(n)
- correct_answer: String oder Array mit den fehlenden Wörtern/Zahlen
- options: null
- Maximal 2 Lücken pro Aufgabe`,

    SORT: `SORT – Elemente in die richtige Reihenfolge bringen:
- correct_answer: Array mit Strings in der richtigen Reihenfolge
- options: Das GLEICHE Array in gemischter (falscher) Reihenfolge
- Mindestens 4, maximal 6 Elemente
- Beispiele: Zahlen sortieren, Ereignisse chronologisch ordnen, Satzteile ordnen`,

    MATCH: `MATCH – Zuordnungsaufgabe:
- correct_answer: Objekt mit Schlüssel-Wert-Paaren {"Begriff": "Erklärung"}
- options: null
- Mindestens 3, maximal 5 Paare
- Beispiele: Begriff ↔ Definition, Land ↔ Hauptstadt, Wort ↔ Übersetzung`,
  };
  return instructions[questionType] ?? instructions.MULTIPLE_CHOICE;
}

// ── Gemini 2.5 Pro API Call ───────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,       // slight creativity for variety, not too random
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json', // request JSON directly
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gemini API error ${response.status}:`, errText);
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 403 || response.status === 401) throw new Error('AUTH_ERROR');
    return null;
  }

  const result = await response.json();
  return result?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ── Question Parser & Validator ───────────────────────────────────────────────

function parseAndValidate(
  rawJson: string,
  grade: number,
  subject: string,
  difficulty: string,
): Record<string, unknown> | null {
  let parsed: Record<string, unknown>;
  try {
    // Gemini may still wrap in markdown occasionally despite responseMimeType
    const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('JSON parse failed for:', rawJson?.substring(0, 200));
    return null;
  }

  const qt = (parsed.question_type as string)?.toUpperCase();
  const validTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'FILL_BLANK', 'SORT', 'MATCH'];
  if (!validTypes.includes(qt)) {
    console.warn('Invalid question_type:', qt);
    return null;
  }

  const questionText = (parsed.question_text as string)?.trim();
  if (!questionText || questionText.length < 8) {
    console.warn('question_text too short or missing');
    return null;
  }

  // Type-specific validation
  if (qt === 'MULTIPLE_CHOICE') {
    const options = parsed.options as unknown[];
    const answer = parsed.correct_answer;
    if (!Array.isArray(options) || options.length !== 4) return null;
    if (typeof answer !== 'number' || answer < 0 || answer > 3) return null;
  }

  if (qt === 'SORT') {
    const answer = parsed.correct_answer;
    const opts = parsed.options;
    if (!Array.isArray(answer) || answer.length < 3) return null;
    if (!Array.isArray(opts) || opts.length !== answer.length) return null;
  }

  if (qt === 'MATCH') {
    const answer = parsed.correct_answer;
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return null;
    if (Object.keys(answer as object).length < 3) return null;
  }

  if (qt === 'FILL_BLANK') {
    if (!parsed.task || typeof parsed.task !== 'string') return null;
    if (!(parsed.task as string).includes('___')) return null;
  }

  return {
    grade,
    subject,
    difficulty,
    question_text: questionText,
    question_type: qt,
    correct_answer: parsed.correct_answer,
    options: parsed.options ?? null,
    task: parsed.task ?? null,
    hint: (parsed.hint as string)?.substring(0, 200) ?? null,
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Simple security: require a secret header for cron/admin calls
  const authHeader = req.headers.get('x-prefill-secret');
  const expectedSecret = Deno.env.get('CACHE_PREFILL_SECRET');
  if (expectedSecret && authHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Optional body params: override defaults for manual runs
  let targetGrades: number[] | null = null;
  let targetSubjects: string[] | null = null;
  let maxQuestions = MAX_QUESTIONS_PER_RUN;
  try {
    const body = await req.json().catch(() => ({}));
    targetGrades = body.grades ?? null;
    targetSubjects = body.subjects ?? null;
    maxQuestions = body.maxQuestions ?? MAX_QUESTIONS_PER_RUN;
  } catch { /* ignore */ }

  // ── Step 1: Get current cache stats ──────────────────────────────────────
  const { data: statsRows, error: statsErr } = await adminClient.rpc('get_cache_stats');
  if (statsErr) {
    console.error('get_cache_stats error:', statsErr);
    return new Response(JSON.stringify({ error: 'Failed to load cache stats' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Build lookup: { "grade-subject" → count }
  const cacheMap = new Map<string, number>();
  for (const row of (statsRows ?? [])) {
    cacheMap.set(`${row.grade}-${row.subject}`, Number(row.total_questions));
  }

  // ── Step 2: Build priority target list ───────────────────────────────────
  // All possible grade×subject combos that have curriculum data
  interface PrefillTarget { grade: number; subject: string; currentCount: number }
  const targets: PrefillTarget[] = [];

  const grades = targetGrades ?? Object.keys(CURRICULUM).map(Number);
  for (const grade of grades) {
    const subjectsForGrade = Object.keys(CURRICULUM[grade] ?? {});
    const subjects = targetSubjects ?? subjectsForGrade;
    for (const subject of subjects) {
      if (!CURRICULUM[grade]?.[subject]) continue;
      const current = cacheMap.get(`${grade}-${subject}`) ?? 0;
      if (current < MIN_CACHE_THRESHOLD) {
        targets.push({ grade, subject, currentCount: current });
      }
    }
  }

  // Sort by most underrepresented first
  targets.sort((a, b) => a.currentCount - b.currentCount);

  if (targets.length === 0) {
    console.log('✅ Cache is well-stocked — nothing to generate');
    return new Response(JSON.stringify({ success: true, message: 'Cache already sufficient', generated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`🎯 ${targets.length} combos below threshold. Generating up to ${maxQuestions} questions...`);

  // ── Step 3: Generate questions with rate-limit-safe delays ───────────────
  const systemPrompt = buildSystemPrompt();
  let generated = 0;
  let failed = 0;
  const results: { grade: number; subject: string; type: string; status: string }[] = [];

  for (let i = 0; i < Math.min(maxQuestions, targets.length * 3); i++) {
    if (generated >= maxQuestions) break;

    const target = targets[i % targets.length];
    const { grade, subject } = target;

    // Track slot per combo for type & difficulty rotation
    const slotIndex = generated;
    const questionType = getQuestionType(subject, slotIndex);
    const difficulty = getDifficulty(slotIndex);
    const skill = pickSkill(grade, subject, slotIndex);

    if (!skill) continue;

    console.log(`[${generated + 1}/${maxQuestions}] G${grade} ${subject} | ${questionType} | ${difficulty} | "${skill.substring(0, 40)}..."`);

    try {
      const userPrompt = buildQuestionPrompt(grade, subject, skill, difficulty, questionType);
      const rawJson = await callGemini(systemPrompt, userPrompt, GEMINI_API_KEY);

      if (!rawJson) {
        console.warn('Empty response from Gemini');
        failed++;
        results.push({ grade, subject, type: questionType, status: 'empty_response' });
        continue;
      }

      const validated = parseAndValidate(rawJson, grade, subject, difficulty);
      if (!validated) {
        console.warn('Validation failed for generated question');
        failed++;
        results.push({ grade, subject, type: questionType, status: 'validation_failed' });
        continue;
      }

      // ── Save to cache ──
      const { error: insertErr } = await adminClient.from('ai_question_cache').insert(validated);
      if (insertErr) {
        console.error('Cache insert error:', insertErr.message);
        failed++;
        results.push({ grade, subject, type: questionType, status: 'insert_failed' });
      } else {
        generated++;
        results.push({ grade, subject, type: questionType, status: 'ok' });
        console.log(`✅ Saved: G${grade} ${subject} ${questionType} (${difficulty})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'RATE_LIMIT') {
        console.warn('🚦 Rate limit hit — stopping early');
        break;
      }
      console.error('Generation error:', msg);
      failed++;
    }

    // Rate-limit-safe delay (Gemini 2.5 Pro: 5 RPM free tier)
    if (generated + failed < maxQuestions) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  const summary = {
    success: true,
    generated,
    failed,
    targetsFound: targets.length,
    results,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n📊 Run complete: ${generated} generated, ${failed} failed`);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
