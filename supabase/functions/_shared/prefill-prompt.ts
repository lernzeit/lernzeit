/**
 * Prompt-Bausteine des Vorrat-Generators (`cache-prefill`).
 *
 * Ausgelagert am 27.09.2026 fuer den Modellvergleich (`modell-vergleich`):
 * Beide muessen exakt denselben Prompt schicken, sonst vergleicht man Prompts
 * statt Modelle. Inhalt unveraendert aus cache-prefill/index.ts uebernommen.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  answerableFromMemoryRule,
  answerFormatRule,
  mentalMathConstraint,
  theoryInstruction,
  THEORY_SUBJECTS,
  type QuestionCategory,
} from './question-prompt.ts';
import { cleanHint, hatCodeReste, parseChoiceOptions } from './choice-options.ts';
// ── Subject Domain Hints: all 10 subjects with open thematic categories ──
// Instead of fixed skill lists, we provide broad domain hints.
// Gemini autonomously selects a concrete sub-topic appropriate for the grade.
export const SUBJECT_DOMAINS: Record<string, {
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
export const TYPE_ROTATION: Record<string, string[]> = {
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

export const DIFFICULTIES: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'medium', 'hard', 'medium', 'easy', 'hard', 'medium'];

/** Typen, die für Theoriefragen taugen — SORT fällt weg, Begriffe haben keine Reihenfolge. */
export const THEORY_TYPE_ROTATION = ['MULTIPLE_CHOICE', 'FREETEXT', 'MATCH', 'MULTIPLE_CHOICE', 'FILL_BLANK'];

export function getQuestionType(subject: string, slotIndex: number, category: QuestionCategory = 'calculation'): string {
  const rotation = category === 'theory'
    ? THEORY_TYPE_ROTATION
    : (TYPE_ROTATION[subject] ?? TYPE_ROTATION.default);
  return rotation[slotIndex % rotation.length];
}

export function getDifficulty(slotIndex: number): 'easy' | 'medium' | 'hard' {
  return DIFFICULTIES[slotIndex % DIFFICULTIES.length];
}

export function getSubjectGerman(subject: string): string {
  const map: Record<string, string> = {
    math: 'Mathematik', german: 'Deutsch', english: 'Englisch',
    geography: 'Geografie', history: 'Geschichte', physics: 'Physik',
    biology: 'Biologie', chemistry: 'Chemie', latin: 'Latein', science: 'Sachkunde',
  };
  return map[subject] ?? subject;
}

export function getAgeContext(grade: number): string {
  const age = 5 + grade;
  return `Klasse ${grade} (ca. ${age}–${age + 1} Jahre alt)`;
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

export function buildSystemPrompt(category: QuestionCategory = 'calculation', subject = ''): string {
  const answerRule = answerFormatRule(category, subject);
  return `Du bist ein erfahrener deutscher Schulpädagoge und Aufgabenentwickler.
Du erstellst lehrplangerechte, pädagogisch hochwertige Lernaufgaben für deutsche Schüler.

DEINE QUALITÄTSSTANDARDS:
- Lehrplankonform und altersgerecht für die angegebene Klassenstufe
- Fachlich korrekt – überprüfe deine eigenen Antworten vor der Ausgabe
- Sprachlich klar, eindeutig und motivierend formuliert
${answerableFromMemoryRule()}
- Themenvielfalt statt Aufgabenverschachtelung: variiere das Unterthema, nicht die Anzahl der Denkschritte
- Wähle eigenständig ein konkretes, abwechslungsreiches Unterthema aus den gegebenen Domänen${answerRule ? `\n${answerRule}` : ''}
- Antwort NUR als gültiges JSON-Objekt, ohne Markdown, ohne Erklärungen außerhalb des JSON`;
}

export function buildQuestionPrompt(
  grade: number,
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionType: string,
  category: QuestionCategory = 'calculation',
): string {
  const subjectGerman = getSubjectGerman(subject);
  const ageContext = getAgeContext(grade);
  // Bewusst NICHT die AFB-Systematik: AFB III ("Problemlösen, Reflektieren") ist
  // per Definition mehrschrittig und hat genau die Aufgaben erzeugt, die den
  // Spielfluss zerstoeren. Schwierigkeit skaliert hier ueber Zahlenraum und
  // Begriffstiefe, die Schrittzahl bleibt konstant bei eins.
  const difficultyLabel = {
    easy:   'sicheres Grundwissen, kleine Zahlen — ein Schritt',
    medium: 'typisches Klassenniveau, gewohnter Zahlenraum — ein Schritt',
    hard:   'oberer Zahlenraum der Klasse oder anspruchsvollerer Fachbegriff — weiterhin ein Schritt',
  }[difficulty];

  const domainInfo = SUBJECT_DOMAINS[subject];
  const domainsHint = domainInfo.domains.map((d, i) => `  ${i + 1}. ${d}`).join('\n');

  const typeInstructions = getTypeInstructions(questionType);

  // Kategorie-Block nur für die rechenlastigen Fächer; alle übrigen bleiben unverändert.
  const categoryNote = (THEORY_SUBJECTS as readonly string[]).includes(subject)
    ? `\n${category === 'theory' ? theoryInstruction(subject, grade) : mentalMathConstraint()}\n`
    : '';

  return `Erstelle eine Lernaufgabe für folgende Kombination:

KLASSENSTUFE: ${ageContext}
FACH: ${subjectGerman}
SCHWIERIGKEITSGRAD: ${difficulty} → ${difficultyLabel}
AUFGABENTYP: ${questionType}

THEMENBEREICH – Wähle eigenständig ein konkretes, lehrplangerechtes Unterthema aus diesen Domänen:
${domainsHint}

ALTERSHINWEIS: ${domainInfo.ageHints}

Wichtig: Das gewählte Unterthema muss exakt zur Klassenstufe ${grade} passen. Wähle ein möglichst abwechslungsreiches Thema, das nicht zu generisch ist.
${categoryNote}
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

export function getTypeInstructions(questionType: string): string {
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

// ── Question Parser & Validator ───────────────────────────────────────────────

export function parseAndValidate(
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
    // Klammer- und Anfuehrungszeichenreste entfernen (Befund 29.09.2026:
    // Kinder sahen `[„Taiga“` als Antwort). Bleiben Reste, wird verworfen.
    const options = parseChoiceOptions(parsed.options);
    const answer = parsed.correct_answer;
    if (options.length !== 4 || hatCodeReste(options)) return null;
    if (typeof answer !== 'number' || answer < 0 || answer > 3) return null;
    parsed.options = options;
  }

  if (qt === 'SORT') {
    const answer = parsed.correct_answer;
    const opts = parsed.options;
    if (!Array.isArray(answer) || answer.length < 3 || answer.length > 6) return null;
    if (!Array.isArray(opts) || opts.length !== answer.length) return null;
  }

  if (qt === 'MATCH') {
    const answer = parsed.correct_answer;
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return null;
    const matchCount = Object.keys(answer as object).length;
    if (matchCount < 3 || matchCount > 5) return null;
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
    hint: cleanHint(parsed.hint),
  };
}

/**
 * Aktive Regeln aus `prompt_rules` (Nutzer-Feedback) als Block fuer den
 * System-Prompt. Leer, wenn keine Regeln aktiv sind oder das Laden scheitert.
 */
export async function loadRulesBlock(client: ReturnType<typeof createClient>): Promise<{ block: string; count: number }> {
  try {
    const { data: rules } = await client
      .from('prompt_rules')
      .select('rule_text')
      .eq('is_active', true);

    if (rules && rules.length > 0) {
      return {
        block: '\n\nZUSÄTZLICHE QUALITÄTSREGELN (aus Nutzer-Feedback):\n' +
          rules.map((r: { rule_text: string }) => `- ${r.rule_text}`).join('\n'),
        count: rules.length,
      };
    }
  } catch (rulesErr) {
    console.warn('Could not load prompt rules:', rulesErr);
  }
  return { block: '', count: 0 };
}
