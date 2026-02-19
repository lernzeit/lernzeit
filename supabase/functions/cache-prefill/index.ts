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

// ── Subject Domain Hints: all 10 subjects with open thematic categories ──
// Instead of fixed skill lists, we provide broad domain hints.
// Gemini autonomously selects a concrete sub-topic appropriate for the grade.
const SUBJECT_DOMAINS: Record<string, {
  domains: string[];
  ageHints: string;
  minGrade: number;
  maxGrade: number;
}> = {
  math: {
    domains: [
      'Zahlen & Operationen (Zählen, Grundrechenarten, Stellenwert)',
      'Brüche, Dezimalzahlen & Prozentrechnung',
      'Algebra: Terme, Gleichungen, Gleichungssysteme, Funktionen',
      'Geometrie: Flächen, Körper, Koordinaten, Winkel, Symmetrie',
      'Größen & Messen: Länge, Zeit, Geld, Gewicht, Volumen',
      'Daten & Zufall: Statistik, Wahrscheinlichkeit, Diagramme',
    ],
    ageHints: 'Zahlenräume wachsen mit der Klasse: ZR10 (Kl.1) → ZR100 (Kl.2) → ZR1000 (Kl.3) → Mio (Kl.4+). Ab Kl.5: negative Zahlen, Bruchrechnung, Algebra. Ab Kl.8: lineare Funktionen, Quadratik, Trigonometrie.',
    minGrade: 1,
    maxGrade: 10,
  },
  german: {
    domains: [
      'Grammatik: Wortarten, Satzglieder, Kasus, Zeiten, Modus',
      'Rechtschreibung & Zeichensetzung: Regeln und Ausnahmen',
      'Textkompetenz: Lesen, Verstehen, Analysieren',
      'Schreiben: Textsorten (Erzählen, Beschreiben, Erörtern, Analysieren)',
      'Literatur: Gedichte, Kurzgeschichten, Romane, Dramen',
      'Sprache & Kommunikation: Stilmittel, Rhetorik, Sprachgeschichte',
    ],
    ageHints: 'Kl.1–2: Laut-Buchstaben-Zuordnung, einfache Sätze. Kl.3–4: Wortarten, einfache Analyse. Kl.5–7: Satzglieder, Literaturanalyse, Erörterung. Kl.8–10: Stilmittel, Rhetorik, komplexe Textanalyse.',
    minGrade: 1,
    maxGrade: 10,
  },
  english: {
    domains: [
      'Grammar: tenses (Present, Past, Future, Perfect, Progressive)',
      'Grammar: modal verbs, conditionals, passive voice, reported speech',
      'Vocabulary: everyday topics, school, travel, technology, society',
      'Reading comprehension: texts, articles, stories, dialogues',
      'Writing skills: emails, essays, summaries, opinion texts',
      'Listening & speaking: phrases, functions, pragmatics',
    ],
    ageHints: 'Kl.5–6: Simple Present/Past, basic vocabulary, short texts. Kl.7–8: modals, conditionals type 1–2, passive. Kl.9–10: advanced grammar, complex texts, academic writing.',
    minGrade: 5,
    maxGrade: 10,
  },
  geography: {
    domains: [
      'Orientierung: Karten, Himmelsrichtungen, Maßstab, Koordinaten',
      'Deutschland: Bundesländer, Städte, Flüsse, Gebirge, Wirtschaft',
      'Europa: Länder, Hauptstädte, Gebirge, Flüsse, Klimazonen',
      'Weltgeografie: Kontinente, Ozeane, Länder, Großlandschaften',
      'Naturgeografie: Erosion, Tektonik, Vulkanismus, Klimasysteme',
      'Humangeografie: Bevölkerung, Migration, Globalisierung, Nachhaltigkeit',
    ],
    ageHints: 'Kl.5–6: Deutschland, Europa, einfache Kartenarbeit. Kl.7–8: Weltgeografie, Klimazonen, Naturgefahren. Kl.9–10: Globalisierung, Entwicklungsländer, komplexe Wechselwirkungen.',
    minGrade: 5,
    maxGrade: 10,
  },
  history: {
    domains: [
      'Antike: Griechenland, Rom, Ägypten, Mesopotamien',
      'Mittelalter: Feudalismus, Kirche, Kreuzzüge, Städte',
      'Frühe Neuzeit: Reformation, Entdeckungen, Absolutismus',
      'Neuzeit 19. Jh.: Industrialisierung, Nationalismus, Imperialismus',
      'Weltkriege & Weimarer Republik: Ursachen, Verlauf, Folgen',
      'Zeitgeschichte: Kalter Krieg, Teilung Deutschlands, Gegenwart',
    ],
    ageHints: 'Kl.6–7: Antike und Mittelalter. Kl.8: Neuzeit, Industrialisierung. Kl.9: Kaiserreich, WW1, Weimarer Republik. Kl.10: WW2, NS-Zeit, Nachkriegsgeschichte, Gegenwart.',
    minGrade: 5,
    maxGrade: 10,
  },
  physics: {
    domains: [
      'Mechanik: Kraft, Bewegung, Energie, Arbeit, Leistung, Druck',
      'Optik: Licht, Reflexion, Brechung, Linsen, Farben',
      'Elektrik & Magnetismus: Stromkreis, Spannung, Widerstand, Magnete',
      'Wärmelehre: Temperatur, Wärmeübertragung, Ausdehnung, Aggregatzustände',
      'Schwingungen & Wellen: Schall, Frequenz, Mechanische Wellen',
      'Energie & Umwelt: Energieformen, Umwandlung, Erneuerbare Energien',
    ],
    ageHints: 'Ab Kl.5: Optik, einfache Mechanik, Elektrik. Kl.7–8: Kraftgesetze, Energie, Wärme. Kl.9–10: Schwingungen, komplexe Mechanik, Energieerhaltung.',
    minGrade: 5,
    maxGrade: 10,
  },
  biology: {
    domains: [
      'Zelle & Zellbiologie: Aufbau, Organellen, Zellteilung',
      'Pflanzen: Aufbau, Photosynthese, Fortpflanzung, Ökosystem',
      'Tiere: Systematik, Verhalten, Anpassung, Ökologie',
      'Menschlicher Körper: Organsysteme, Gesundheit, Ernährung',
      'Genetik & Evolution: Vererbung, DNA, Mutation, Selektion',
      'Ökosysteme & Umwelt: Nahrungsnetze, Stoffkreisläufe, Naturschutz',
    ],
    ageHints: 'Kl.5–6: Pflanzen, Tiere, einfache Ökosysteme. Kl.7–8: Zelle, Körper, Ökologie. Kl.9–10: Genetik, Evolution, komplexe Ökosysteme.',
    minGrade: 5,
    maxGrade: 10,
  },
  chemistry: {
    domains: [
      'Stoffe & Stoffeigenschaften: Reinstoffe, Gemische, Trennverfahren',
      'Chemische Reaktionen: Verbrennung, Oxidation, Reduktion, Energetik',
      'Atombau & Periodensystem: Atomaufbau, Ionisierung, PSE-Trends',
      'Chemische Bindungen: Ionenbindung, Atombindung, Metallbindung',
      'Säuren, Basen & Salze: pH-Wert, Neutralisation, Eigenschaften',
      'Organische Chemie: Kohlenwasserstoffe, Alkohole, Alltagschemie',
    ],
    ageHints: 'Ab Kl.7: Stoffe und einfache Reaktionen. Kl.8: Atombau, PSE, Bindungen. Kl.9: Säuren/Basen, Salze. Kl.10: Organische Chemie, komplexe Reaktionen.',
    minGrade: 7,
    maxGrade: 10,
  },
  latin: {
    domains: [
      'Vokabular: Kernwortschatz, Wortfamilien, Fremdwortbedeutung',
      'Morphologie: Deklination (Nomen, Adjektive, Pronomen), Komparation',
      'Verbformen: Konjugation, Tempora (Präsens bis Plusquamperfekt), Modi',
      'Syntax: Satzglieder, Ablativus absolutus, AcI, Konjunktionssätze',
      'Textarbeit: Übersetzung, Interpretation, Literaturkenntnisse',
      'Antike Kultur & Geschichte: Rom, Mythologie, Alltagsleben',
    ],
    ageHints: 'Ab Kl.5: Grundvokabular, einfache Sätze, 1.–2. Deklination. Kl.7: alle Deklinationen, Tempora. Kl.9–10: komplexe Syntax, Lektüre (Caesar, Cicero, Ovid).',
    minGrade: 5,
    maxGrade: 10,
  },
  science: {
    domains: [
      'Natur & Lebewesen: Tiere, Pflanzen, Jahreszeiten, Lebensräume',
      'Menschlicher Körper & Gesundheit: Sinne, Organe, Ernährung, Hygiene',
      'Technik & Medien: einfache Maschinen, Werkzeuge, digitale Medien',
      'Gesellschaft & Gemeinschaft: Familie, Schule, Berufe, Regeln',
      'Raum & Zeit: Heimat, Deutschland, Jahreszeiten, Uhrzeit, Kalender',
      'Umwelt & Nachhaltigkeit: Müll, Energie, Wasser, Naturschutz',
    ],
    ageHints: 'Nur Sachkunde (Kl.1–4): altersgerechte, anschauliche Aufgaben. Kl.1–2: direkte Erfahrungswelt. Kl.3–4: erste systematische Betrachtungen.',
    minGrade: 1,
    maxGrade: 4,
  },
};

// Question type rotation — ensures variety per subject
const TYPE_ROTATION: Record<string, string[]> = {
  math:      ['MULTIPLE_CHOICE', 'FREETEXT', 'FILL_BLANK', 'MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MULTIPLE_CHOICE', 'FILL_BLANK'],
  german:    ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SORT', 'FREETEXT', 'MULTIPLE_CHOICE', 'MATCH', 'FILL_BLANK', 'FREETEXT'],
  english:   ['MULTIPLE_CHOICE', 'FILL_BLANK', 'FREETEXT', 'SORT', 'MULTIPLE_CHOICE', 'MATCH', 'FREETEXT', 'FILL_BLANK'],
  geography: ['MULTIPLE_CHOICE', 'MATCH', 'FREETEXT', 'MULTIPLE_CHOICE', 'SORT', 'MATCH'],
  history:   ['MULTIPLE_CHOICE', 'SORT', 'MATCH', 'FREETEXT', 'MULTIPLE_CHOICE', 'FILL_BLANK'],
  physics:   ['MULTIPLE_CHOICE', 'FREETEXT', 'FILL_BLANK', 'MULTIPLE_CHOICE', 'FREETEXT'],
  biology:   ['MULTIPLE_CHOICE', 'MATCH', 'FILL_BLANK', 'FREETEXT', 'MULTIPLE_CHOICE', 'SORT'],
  chemistry: ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCH', 'FREETEXT', 'MULTIPLE_CHOICE'],
  latin:     ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCH', 'SORT', 'FREETEXT', 'MULTIPLE_CHOICE'],
  science:   ['MULTIPLE_CHOICE', 'MATCH', 'FILL_BLANK', 'FREETEXT', 'MULTIPLE_CHOICE'],
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
- Wähle eigenständig ein konkretes, abwechslungsreiches Unterthema aus den gegebenen Domänen
- Antwort NUR als gültiges JSON-Objekt, ohne Markdown, ohne Erklärungen außerhalb des JSON`;
}

function buildQuestionPrompt(
  grade: number,
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionType: string,
): string {
  const subjectGerman = getSubjectGerman(subject);
  const ageContext = getAgeContext(grade);
  const difficultyLabel = {
    easy:   'AFB I (Grundwissen, Reproduzieren)',
    medium: 'AFB II (Anwenden, Verknüpfen)',
    hard:   'AFB III (Problemlösen, Reflektieren)',
  }[difficulty];

  const domainInfo = SUBJECT_DOMAINS[subject];
  const domainsHint = domainInfo.domains.map((d, i) => `  ${i + 1}. ${d}`).join('\n');

  const typeInstructions = getTypeInstructions(questionType);

  return `Erstelle eine Lernaufgabe für folgende Kombination:

KLASSENSTUFE: ${ageContext}
FACH: ${subjectGerman}
SCHWIERIGKEITSGRAD: ${difficulty} → ${difficultyLabel}
AUFGABENTYP: ${questionType}

THEMENBEREICH – Wähle eigenständig ein konkretes, lehrplangerechtes Unterthema aus diesen Domänen:
${domainsHint}

ALTERSHINWEIS: ${domainInfo.ageHints}

Wichtig: Das gewählte Unterthema muss exakt zur Klassenstufe ${grade} passen. Wähle ein möglichst abwechslungsreiches Thema, das nicht zu generisch ist.

${typeInstructions}

QUALITÄTSPRÜFUNG (vor der Ausgabe selbst durchführen):
□ Ist die Frage/Aufgabe für Klasse ${grade} angemessen?
□ Ist die angegebene Antwort fachlich korrekt?
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.75,
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gemini API error ${response.status}:`, errText.substring(0, 300));
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 403 || response.status === 401) throw new Error('AUTH_ERROR');
    return null;
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  if (!text) {
    const blockReason = result?.candidates?.[0]?.finishReason ?? result?.promptFeedback?.blockReason ?? 'unknown';
    console.warn('Empty Gemini response. Reason:', blockReason, JSON.stringify(result).substring(0, 300));
  }
  return text;
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
  // All grade×subject combinations covered by SUBJECT_DOMAINS, with school-logic constraints
  interface PrefillTarget { grade: number; subject: string; currentCount: number }
  const targets: PrefillTarget[] = [];

  const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ALL_SUBJECTS = Object.keys(SUBJECT_DOMAINS);

  const gradesToCheck = targetGrades ?? ALL_GRADES;
  const subjectsToCheck = targetSubjects ?? ALL_SUBJECTS;

  for (const grade of gradesToCheck) {
    for (const subject of subjectsToCheck) {
      const domainInfo = SUBJECT_DOMAINS[subject];
      if (!domainInfo) continue;

      // School-logic grade constraints
      if (grade < domainInfo.minGrade || grade > domainInfo.maxGrade) continue;

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

  // ── Step 2b: Load existing questions per target for deduplication ────────
  function normalizeMathExpr(text: string): string {
    return text.replace(/(\d+)\s*([+×*])\s*(\d+)/g, (_match, a, op, b) => {
      const sorted = [a, b].sort();
      return `${sorted[0]}${op}${sorted[1]}`;
    }).toLowerCase().trim();
  }

  function isDuplicate(newText: string, existingTexts: string[], subject: string): boolean {
    const normalizedNew = subject === 'math' ? normalizeMathExpr(newText) : newText.toLowerCase().trim();
    return existingTexts.some(existing => {
      const normalizedExisting = subject === 'math' ? normalizeMathExpr(existing) : existing.toLowerCase().trim();
      return normalizedNew === normalizedExisting;
    });
  }

  const existingQuestionsMap = new Map<string, string[]>();
  for (const target of targets) {
    const key = `${target.grade}-${target.subject}`;
    if (!existingQuestionsMap.has(key)) {
      const { data } = await adminClient
        .from('ai_question_cache')
        .select('question_text')
        .eq('grade', target.grade)
        .eq('subject', target.subject)
        .limit(200);
      existingQuestionsMap.set(key, (data ?? []).map(r => r.question_text));
    }
  }

  // ── Step 3: Generate questions with rate-limit-safe delays ───────────────
  const systemPrompt = buildSystemPrompt();
  let generated = 0;
  let failed = 0;
  const results: { grade: number; subject: string; type: string; status: string }[] = [];

  for (let i = 0; i < Math.min(maxQuestions, targets.length * 3); i++) {
    if (generated >= maxQuestions) break;

    const target = targets[i % targets.length];
    const { grade, subject } = target;

    const slotIndex = generated;
    const questionType = getQuestionType(subject, slotIndex);
    const difficulty = getDifficulty(slotIndex);

    const cacheKey = `${grade}-${subject}`;
    const existingTexts = existingQuestionsMap.get(cacheKey) ?? [];
    const excludeSample = existingTexts.slice(-15);

    console.log(`[${generated + 1}/${maxQuestions}] G${grade} ${subject} | ${questionType} | ${difficulty} | Existing: ${existingTexts.length}`);

    try {
      let userPrompt = buildQuestionPrompt(grade, subject, difficulty, questionType);
      if (excludeSample.length > 0) {
        userPrompt += `\n\nWICHTIG – Diese Fragen existieren bereits. Erstelle eine VÖLLIG ANDERE Frage:\n${excludeSample.map(t => `- "${t.substring(0, 80)}"`).join('\n')}`;
      }

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

      // ── Deduplication check ──
      const newText = validated.question_text as string;
      if (isDuplicate(newText, existingTexts, subject)) {
        console.warn(`⚠️ Duplicate detected, skipping: "${newText.substring(0, 60)}..."`);
        failed++;
        results.push({ grade, subject, type: questionType, status: 'duplicate_skipped' });
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
        existingTexts.push(newText);
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
