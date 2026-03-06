import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const VALID_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const VALID_SUBJECTS = ['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin', 'science'] as const;
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const VALID_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH', 'DRAG_DROP', 'FILL_BLANK'] as const;

type ValidGrade = typeof VALID_GRADES[number];
type ValidSubject = typeof VALID_SUBJECTS[number];
type ValidDifficulty = typeof VALID_DIFFICULTIES[number];
type ValidQuestionType = typeof VALID_QUESTION_TYPES[number];

interface QuestionRequest {
  grade: ValidGrade;
  subject: ValidSubject;
  difficulty?: ValidDifficulty;
  questionType?: ValidQuestionType;
  excludeTexts?: string[];
}

// Validation helpers
function isValidGrade(val: unknown): val is ValidGrade {
  return typeof val === 'number' && VALID_GRADES.includes(val as ValidGrade);
}

function isValidSubject(val: unknown): val is ValidSubject {
  return typeof val === 'string' && VALID_SUBJECTS.includes(val.toLowerCase() as ValidSubject);
}

function isValidDifficulty(val: unknown): val is ValidDifficulty {
  return typeof val === 'string' && VALID_DIFFICULTIES.includes(val as ValidDifficulty);
}

function isValidQuestionType(val: unknown): val is ValidQuestionType {
  return typeof val === 'string' && VALID_QUESTION_TYPES.includes(val as ValidQuestionType);
}

// Sanitize error messages to prevent information leakage
function getSafeErrorMessage(error: Error): string {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('api key') || message.includes('apikey') || message.includes('lovable_api')) {
    return 'Konfigurationsfehler. Bitte kontaktiere den Support.';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Zu viele Anfragen. Bitte warte einen Moment.';
  }
  if (message.includes('credits') || message.includes('402')) {
    return 'API-Kontingent erschöpft. Bitte kontaktiere den Support.';
  }
  if (message.includes('parse') || message.includes('json')) {
    return 'Fehler bei der Fragengenerierung. Bitte versuche es erneut.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'Netzwerkfehler. Bitte prüfe deine Verbindung.';
  }
  
  return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültiges Anfrageformat' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (typeof requestBody !== 'object' || requestBody === null) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültiges Anfrageformat' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = requestBody as Record<string, unknown>;

    // Validate grade
    if (!isValidGrade(body.grade)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültige Klassenstufe (1-10)' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate subject
    if (!isValidSubject(body.subject)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültiges Fach' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate optional difficulty
    const difficulty: ValidDifficulty = isValidDifficulty(body.difficulty) 
      ? body.difficulty as ValidDifficulty 
      : 'medium';

    // Validate optional questionType
    const questionType: ValidQuestionType | undefined = isValidQuestionType(body.questionType) 
      ? body.questionType as ValidQuestionType 
      : undefined;

    const grade = body.grade as ValidGrade;
    const subject = (body.subject as string).toLowerCase() as ValidSubject;
    
    // Extract exclude list for deduplication (max 20 texts, validated)
    const excludeTexts: string[] = Array.isArray(body.excludeTexts)
      ? (body.excludeTexts as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .slice(0, 20)
      : [];
    
    console.log(`🎯 Generating question: Grade ${grade}, Subject: ${subject}, Difficulty: ${difficulty}, Excluding: ${excludeTexts.length} texts`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Konfigurationsfehler. Bitte kontaktiere den Support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const prompt = buildQuestionPrompt(grade, subject, difficulty, questionType, excludeTexts);

    // Load active prompt rules from DB
    let rulesBlock = '';
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const ruleClient = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: rules } = await ruleClient
        .from('prompt_rules')
        .select('rule_text')
        .eq('is_active', true)
        .or(`subject.is.null,subject.eq.${subject}`)
        .or(`grade_min.is.null,grade_min.lte.${grade}`)
        .or(`grade_max.is.null,grade_max.gte.${grade}`);

      if (rules && rules.length > 0) {
        rulesBlock = '\n\nZUSÄTZLICHE QUALITÄTSREGELN (aus Nutzer-Feedback):\n' +
          rules.map((r: { rule_text: string }) => `- ${r.rule_text}`).join('\n');
        console.log(`📏 Injecting ${rules.length} prompt rules`);
      }
    } catch (rulesErr) {
      console.warn('Could not load prompt rules:', rulesErr);
    }

    const systemPrompt = getSystemPrompt() + rulesBlock;

    const models = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'];
    let content: string | null = null;

    for (const model of models) {
      try {
        console.log(`🤖 Trying model: ${model}`);
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.9,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Zu viele Anfragen. Bitte warte einen Moment.' 
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'API-Kontingent erschöpft. Bitte kontaktiere den Support.' 
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const errorText = await response.text();
          console.error(`AI Gateway error with ${model}: ${response.status} - ${errorText}`);
          continue; // Try next model
        }

        const result = await response.json();
        content = result.choices?.[0]?.message?.content || null;

        if (content) {
          console.log(`✅ Got response from ${model}`);
          break;
        } else {
          console.warn(`⚠️ Empty content from ${model}, trying next...`);
        }
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError);
        continue;
      }
    }

    if (!content) {
      console.error('All models failed to generate content');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Fehler bei der Fragengenerierung. Bitte versuche es erneut.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 AI Response received');

    // Parse JSON from response
    let question: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      question = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Fehler bei der Fragengenerierung. Bitte versuche es erneut.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and enhance question structure
    const enhancedQuestion = {
      id: crypto.randomUUID(),
      grade,
      subject,
      difficulty,
      questionText: question.question_text || question.questionText,
      questionType: question.question_type || question.questionType,
      correctAnswer: question.correct_answer || question.correctAnswer,
      options: question.options || null,
      hint: question.hint || null,
      task: question.task || null,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ Generated: ${enhancedQuestion.questionType} - ${enhancedQuestion.questionText?.substring(0, 50)}...`);

    // ── Fire-and-forget cache write ─────────────────────────────────────
    // Save to ai_question_cache asynchronously — user doesn't wait for this
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && enhancedQuestion.questionText) {
      const saveToCache = async () => {
        try {
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await adminClient.from('ai_question_cache').insert({
            grade,
            subject,
            difficulty,
            question_text: enhancedQuestion.questionText,
            question_type: enhancedQuestion.questionType,
            correct_answer: enhancedQuestion.correctAnswer,
            options: enhancedQuestion.options,
            hint: enhancedQuestion.hint,
            task: enhancedQuestion.task
          });
          console.log('💾 Question saved to cache');
        } catch (cacheErr) {
          // Non-critical: cache write failure doesn't affect the user
          console.warn('Cache write failed (non-critical):', cacheErr);
        }
      };

      // Non-blocking: run after response is sent
      EdgeRuntime.waitUntil(saveToCache());
    }
    // ───────────────────────────────────────────────────────────────────

    return new Response(JSON.stringify({
      success: true,
      question: enhancedQuestion
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Question generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: getSafeErrorMessage(error as Error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSystemPrompt(): string {
  return `Du bist ein erfahrener Grundschul- und Sekundarschulpädagoge aus Deutschland. 
Deine Aufgabe ist es, qualitativ hochwertige, altersgerechte Lernfragen auf Deutsch zu erstellen.

REGELN:
- Alle Fragen und Antworten auf Deutsch
- Altersgerecht und lehrplankonform für die angegebene Klassenstufe
- Klar formuliert, eindeutig und pädagogisch wertvoll
- Antworte NUR mit gültigem JSON, ohne Markdown oder Erklärungen

KRITISCHE REGEL FÜR MATHEMATIK:
- Bei Mathematik-Fragen ist die Antwort IMMER NUR eine Zahl (z.B. "10", nicht "10 Murmeln", nicht "10 Brötchen").
- Keine Einheiten, keine Wörter in der Antwort – NUR die reine Zahl.
- Bei Multiple-Choice: Auch die Optionen enthalten NUR Zahlen, keine Einheiten.
- PRÜFE JEDE BERECHNUNG DOPPELT: Rechne die Aufgabe selbst Schritt für Schritt durch und stelle sicher, dass die korrekte Antwort mathematisch stimmt.
- Beispiel: "Ein Bäcker hat 25 Brötchen und verkauft 10. Wie viele hat er übrig?" → correct_answer: "15", NICHT "15 Brötchen"

VERBOTENE FRAGENTYPEN (STRIKT EINHALTEN):
1. KEINE offenen Erläuterungsfragen als FREETEXT: Fragen wie "Erkläre den Unterschied zwischen Klima und Wetter" oder "Beschreibe..." erfordern lange Antworten und sind NUR als MULTIPLE_CHOICE erlaubt. FREETEXT-Antworten müssen IMMER kurz sein: maximal 1-3 Wörter oder eine Zahl. Wenn die korrekte Antwort mehr als 3 Wörter hätte, mache eine MULTIPLE_CHOICE-Frage daraus.
2. KEINE Vergleichsfragen ohne konkrete Daten: Fragen wie "Was ist länger: ein Bleistift oder ein Lineal?" sind VERBOTEN, weil sie ohne konkrete Maße nicht eindeutig beantwortbar sind. Vergleichsfragen NUR mit konkreten Zahlen stellen (z.B. "Was ist länger: 15 cm oder 2 dm?").
3. KEINE Tautologien: Fragen, deren Antwort bereits in der Frage steht, sind VERBOTEN (z.B. "Wie lang ist ein Bleistift, wenn er 15 cm lang ist?" → Antwort: 15).
4. KEINE Emoji-Vergleiche: Emojis haben keine physische Größe. Fragen wie "Was ist größer: 🐘 oder 🐁?" sind VERBOTEN. Verwende stattdessen Textnamen oder konkrete Maße.
5. KEINE mehrdeutigen Antworten: Jede Frage muss genau EINE eindeutige korrekte Antwort haben. Wenn mehrere Antworten plausibel wären, formuliere die Frage präziser oder verwende MULTIPLE_CHOICE.`;
}

function buildQuestionPrompt(
  grade: number, 
  subject: string, 
  difficulty: string, 
  requestedType?: string,
  excludeTexts?: string[]
): string {
  const subjectGerman = getSubjectGerman(subject);
  const gradeGuidelines = getGradeGuidelines(grade);
  const difficultyGuide = getDifficultyGuidelines(difficulty, grade);
  const questionType = requestedType || selectQuestionType(subject, grade);
  const typeInstructions = getTypeSpecificInstructions(questionType);

  let exclusionNote = '';
  if (excludeTexts && excludeTexts.length > 0) {
    exclusionNote = `\n\nWICHTIG - Vermeide Fragen die diesen ähnlich sind:\n${excludeTexts.slice(0, 10).map(t => `- "${t.substring(0, 80)}"`).join('\n')}\nGeneriere eine völlig andere Frage!`;
  }

  return `Erstelle eine ${difficultyGuide.label} Lernfrage für Klasse ${grade} im Fach ${subjectGerman}.

KLASSENSTUFE: ${gradeGuidelines}
SCHWIERIGKEIT: ${difficultyGuide.description}
FRAGETYP: ${questionType}${exclusionNote}

${typeInstructions}

Antworte mit diesem JSON-Format:
{
  "question_text": "Die Frage hier",
  "question_type": "${questionType}",
  "correct_answer": <korrekte Antwort im passenden Format>,
  "options": <Array von Optionen nur bei MULTIPLE_CHOICE, sonst null>,
  "hint": "Optionaler Hinweis für schwierige Aufgaben",
  "task": <Aufgabenstellung für FILL_BLANK, sonst null>
}`;
}

function getSubjectGerman(subject: string): string {
  const map: Record<string, string> = {
    'math': 'Mathematik',
    'german': 'Deutsch',
    'english': 'Englisch',
    'geography': 'Geografie',
    'history': 'Geschichte',
    'physics': 'Physik',
    'biology': 'Biologie',
    'chemistry': 'Chemie',
    'latin': 'Latein',
    'science': 'Sachkunde'
  };
  return map[subject] || subject;
}

function getGradeGuidelines(grade: number): string {
  if (grade <= 2) return 'Grundschule Klasse 1-2: Einfache Konzepte, kurze Sätze, Zahlen bis 100, Buchstaben';
  if (grade <= 4) return 'Grundschule Klasse 3-4: Grundrechenarten, einfache Texte, Sachkunde';
  if (grade <= 6) return 'Sekundarstufe I Klasse 5-6: Brüche, Dezimalzahlen, Grammatik, Geschichte';
  if (grade <= 8) return 'Sekundarstufe I Klasse 7-8: Algebra, Gleichungen, Literatur, Wissenschaften';
  return 'Sekundarstufe I Klasse 9-10: Erweiterte Algebra, Trigonometrie, komplexe Analysen';
}

function getDifficultyGuidelines(difficulty: string, grade: number): { label: string; description: string } {
  const guidelines: Record<string, { label: string; description: string }> = {
    'easy': {
      label: 'leichte',
      description: `Grundlegendes Verständnis, direkte Anwendung von Konzepten für Klasse ${grade}`
    },
    'medium': {
      label: 'mittelschwere',
      description: `Anwendung und Verknüpfung von Konzepten, typisches Klassenniveau ${grade}`
    },
    'hard': {
      label: 'schwere',
      description: `Kritisches Denken, mehrschrittige Probleme, erweiterte Konzepte für Klasse ${grade}`
    }
  };
  return guidelines[difficulty] || guidelines['medium'];
}

function selectQuestionType(subject: string, grade: number): string {
  // Vary question types for diversity
  const rand = Math.random();
  
  if (subject === 'math') {
    if (grade <= 4) return rand < 0.5 ? 'FREETEXT' : 'MULTIPLE_CHOICE';
    return rand < 0.4 ? 'FREETEXT' : rand < 0.7 ? 'MULTIPLE_CHOICE' : 'FILL_BLANK';
  }
  
  if (subject === 'german') {
    if (rand < 0.35) return 'MULTIPLE_CHOICE';
    if (rand < 0.65) return 'FREETEXT';
    if (rand < 0.80) return 'SORT';
    return 'FILL_BLANK';
  }
  
  // Default: mix of types
  if (rand < 0.5) return 'MULTIPLE_CHOICE';
  if (rand < 0.75) return 'FREETEXT';
  return 'SORT';
}

function getTypeSpecificInstructions(questionType: string): string {
  const instructions: Record<string, string> = {
    'MULTIPLE_CHOICE': `Erstelle eine Multiple-Choice-Frage mit genau 4 Antwortoptionen.
- correct_answer: Index der korrekten Antwort (0-3)
- options: Array mit genau 4 Strings ["Option A", "Option B", "Option C", "Option D"]
- Bei Mathematik: Optionen sind NUR Zahlen (z.B. ["10", "15", "20", "25"]), KEINE Einheiten!
- Eine klar korrekte Antwort, plausible Distraktoren
- WICHTIG: Rechne die Aufgabe selbst durch und prüfe, dass correct_answer auf die tatsächlich richtige Option zeigt!`,
    
    'FREETEXT': `Erstelle eine offene Frage mit einer klar definierten korrekten Antwort.
- correct_answer: String mit der erwarteten Antwort
- Bei Mathematik: correct_answer ist NUR eine Zahl (z.B. "15"), KEINE Einheiten!
- options: null
- Die Frage sollte eine eindeutige kurze Antwort haben
- WICHTIG: Rechne die Aufgabe selbst durch und stelle sicher, dass correct_answer mathematisch korrekt ist!`,
    
    'SORT': `Erstelle eine Sortieraufgabe.
- correct_answer: Array von Strings in der richtigen Reihenfolge
- options: Das gleiche Array, gemischt (für die Anzeige)
- Beispiel: Ereignisse chronologisch sortieren, Zahlen der Größe nach`,
    
    'MATCH': `Erstelle eine Zuordnungsaufgabe.
- correct_answer: Object mit Schlüssel-Wert-Paaren {"Begriff1": "Definition1", "Begriff2": "Definition2"}
- options: null
- Minimum 3, Maximum 5 Zuordnungspaare`,
    
    'DRAG_DROP': `Erstelle eine Lückentextaufgabe zum Einsetzen.
- correct_answer: Array der einzusetzenden Wörter in richtiger Reihenfolge
- task: Der Satz mit ___ für die Lücken
- options: Array der verfügbaren Wörter (inklusive 1-2 Distraktoren)`,
    
    'FILL_BLANK': `Erstelle eine Lückentextaufgabe.
- task: Der Satz mit ___ für die Lücke(n)
- correct_answer: String oder Array mit den fehlenden Wörtern
- options: null`
  };
  
  return instructions[questionType] || instructions['MULTIPLE_CHOICE'];
}
