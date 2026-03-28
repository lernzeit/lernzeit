import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";

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

    // ── Grade constraints for subjects ──
    const SUBJECT_GRADE_CONSTRAINTS: Record<string, { min: number; max: number }> = {
      math: { min: 1, max: 10 }, german: { min: 1, max: 10 },
      science: { min: 1, max: 4 }, english: { min: 3, max: 10 },
      geography: { min: 5, max: 10 }, history: { min: 5, max: 10 },
      physics: { min: 5, max: 10 }, biology: { min: 5, max: 10 },
      chemistry: { min: 7, max: 10 }, latin: { min: 5, max: 10 },
    };
    const constraint = SUBJECT_GRADE_CONSTRAINTS[subject];
    if (constraint && (grade < constraint.min || grade > constraint.max)) {
      return new Response(JSON.stringify({
        success: false,
        error: `${subject} ist für Klasse ${grade} nicht verfügbar`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Extract exclude list for deduplication (max 20 texts, validated)
    const excludeTexts: string[] = Array.isArray(body.excludeTexts)
      ? (body.excludeTexts as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .slice(0, 20)
      : [];

    // Extract optional topicHint for learning plan focus
    const topicHint: string | undefined = typeof body.topicHint === 'string' && body.topicHint.length > 0
      ? (body.topicHint as string).slice(0, 200)
      : undefined;
    
    console.log(`🎯 Generating question: Grade ${grade}, Subject: ${subject}, Difficulty: ${difficulty}, Excluding: ${excludeTexts.length} texts${topicHint ? `, Topic: ${topicHint}` : ''}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      console.error('Neither LOVABLE_API_KEY nor GEMINI_API_KEY is configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Konfigurationsfehler. Bitte kontaktiere den Support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const prompt = buildQuestionPrompt(grade, subject, difficulty, questionType, excludeTexts, topicHint);

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

    let question: any = null;
    let rawType: string | undefined;
    let rawCorrectAnswer: any;
    let rawOptions: any;
    let rawQuestionText: string | undefined;
    let lastError = '';

    // Tool definition for structured output
    const questionTool = {
      type: "function" as const,
      function: {
        name: "submit_question",
        description: "Submit a generated educational question with all required fields",
        parameters: {
          type: "object",
          properties: {
            question_text: { type: "string", description: "The question text in German" },
            question_type: { type: "string", enum: ["MULTIPLE_CHOICE", "FREETEXT", "SORT", "MATCH", "DRAG_DROP", "FILL_BLANK"] },
            correct_answer: { description: "The correct answer: number (MC index 0-3), string (FREETEXT), array (SORT/DRAG_DROP), or object (MATCH pairs)" },
            options: { description: "Array of 4 options for MULTIPLE_CHOICE, shuffled items for SORT, or null" },
            hint: { type: "string", description: "Optional hint for the student" },
            task: { type: "string", description: "Task instruction for FILL_BLANK/DRAG_DROP, or null" }
          },
          required: ["question_text", "question_type", "correct_answer"]
        }
      }
    };

    // ── SINGLE AI attempt (callAI handles Lovable→Gemini fallback internally) ──
    try {
      console.log('🤖 Generating question via callAI (single attempt)');
      const { response, usedFallback } = await callAI({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        tools: [questionTool],
        tool_choice: { type: "function", function: { name: "submit_question" } },
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Got response${usedFallback ? ' (Gemini fallback)' : ''}`);
        
        const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
        const content = result.choices?.[0]?.message?.content;
        
        if (toolCall?.function?.arguments) {
          try {
            question = typeof toolCall.function.arguments === 'string' 
              ? JSON.parse(toolCall.function.arguments) 
              : toolCall.function.arguments;
            console.log('🔧 Parsed from tool_call arguments');
          } catch (e) {
            console.warn('⚠️ Failed to parse tool_call arguments:', e);
          }
        } else if (content) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              question = JSON.parse(jsonMatch[0]);
              console.log('📝 Parsed from content fallback');
            }
          } catch (e) {
            console.warn('⚠️ Failed to parse content:', e);
          }
        }
      } else if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Zu viele Anfragen. Bitte warte einen Moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorText = await response.text();
        lastError = `AI error: ${response.status}`;
        console.error(`AI error: ${response.status} - ${errorText}`);
      }
    } catch (aiError) {
      lastError = `AI call failed: ${(aiError as Error).message}`;
      console.error(lastError);
    }

    // ── Validate & normalize the AI response ──
    if (question) {
      rawType = question.question_type ?? question.questionType;
      rawCorrectAnswer = tryParseStructuredValue(question.correct_answer ?? question.correctAnswer);
      rawOptions = tryParseStructuredValue(question.options ?? null);
      rawQuestionText = question.question_text ?? question.questionText;
      const rawTask = typeof question.task === 'string' ? question.task : null;

      if (rawType === 'MULTIPLE_CHOICE') {
        const directOptions = extractChoiceOptions(rawOptions);
        const taskOptions = extractChoiceOptions(rawTask);
        const normalizedOptions = directOptions.length >= 2 ? directOptions : taskOptions;
        rawOptions = normalizedOptions.length > 0 ? normalizedOptions : null;

        if (typeof rawCorrectAnswer === 'string') {
          const trimmed = rawCorrectAnswer.trim();
          const index = Number(trimmed);
          if (Number.isInteger(index) && normalizedOptions[index] !== undefined) {
            rawCorrectAnswer = index;
          }
        }

        if (typeof rawCorrectAnswer === 'object' && rawCorrectAnswer && 'value' in rawCorrectAnswer) {
          const nestedValue = (rawCorrectAnswer as { value?: unknown }).value;
          if (typeof nestedValue === 'string') {
            const index = Number(nestedValue.trim());
            if (Number.isInteger(index) && normalizedOptions[index] !== undefined) {
              rawCorrectAnswer = index;
            }
          }
        }
      }

      if (rawType === 'SORT') {
        const normalizedOrder = Array.isArray(rawCorrectAnswer)
          ? sanitizeStringArray(rawCorrectAnswer)
          : sanitizeStringArray((rawCorrectAnswer as { order?: unknown } | null)?.order);
        rawCorrectAnswer = { order: normalizedOrder };
        rawOptions = shuffleArray(normalizedOrder);
      }

      if (rawType === 'MATCH' && rawCorrectAnswer && typeof rawCorrectAnswer === 'object' && !Array.isArray(rawCorrectAnswer)) {
        const metaKeys = ['pairs', 'value', 'order', 'blanks', 'alternatives', 'placements'];
        const pairEntries = Object.entries(rawCorrectAnswer).filter(([key, value]) => !metaKeys.includes(key) && String(value).trim());
        if (pairEntries.length > 0) {
          rawCorrectAnswer = Object.fromEntries(pairEntries);
          rawOptions = {
            leftItems: pairEntries.map(([left]) => left),
            rightItems: shuffleArray(pairEntries.map(([, right]) => String(right)))
          };
        }
      }

      if (rawType === 'FILL_BLANK') {
        const blanks = extractFillBlankAnswers(rawCorrectAnswer);
        rawCorrectAnswer = { blanks };
      }

      if (!isRenderableQuestionPayload(rawType, rawCorrectAnswer, rawOptions, rawQuestionText, rawTask)) {
        lastError = `invalid ${String(rawType).toLowerCase()} payload`;
        console.warn(`⚠️ Unrenderable: ${lastError}`);
        question = null;
      }

      const isEmptyAnswer = rawCorrectAnswer === null || 
        rawCorrectAnswer === undefined || 
        rawCorrectAnswer === '' || 
        (Array.isArray(rawCorrectAnswer) && rawCorrectAnswer.length === 0) ||
        (typeof rawCorrectAnswer === 'object' && !Array.isArray(rawCorrectAnswer) && Object.keys(rawCorrectAnswer).length === 0);
      
      if (question && isEmptyAnswer) {
        lastError = 'empty correct_answer';
        console.warn('⚠️ Empty correct_answer');
        question = null;
      }

      if (question && (!rawQuestionText || rawQuestionText.trim() === '')) {
        lastError = 'empty question_text';
        console.warn('⚠️ Empty question_text');
        question = null;
      }
    }

    // If AI failed, try serving from cache
    if (!question || !rawQuestionText) {
      console.warn(`⚠️ AI generation failed (${lastError}). Trying cache fallback...`);
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const cacheClient = createClient(supabaseUrl, serviceRoleKey);
        
        let cacheQuery = cacheClient
          .from('ai_question_cache')
          .select('*')
          .eq('grade', grade)
          .eq('subject', subject)
          .eq('difficulty', difficulty)
          .order('times_served', { ascending: true })
          .limit(5);

        const { data: cachedQuestions } = await cacheQuery;
        
        if (cachedQuestions && cachedQuestions.length > 0) {
          // Pick a random one from least-served
          const picked = cachedQuestions[Math.floor(Math.random() * cachedQuestions.length)];
          console.log(`✅ Cache fallback: serving cached question ${picked.id}`);
          
          // Update times_served
          EdgeRuntime.waitUntil(
            cacheClient.from('ai_question_cache')
              .update({ times_served: picked.times_served + 1, last_served_at: new Date().toISOString() })
              .eq('id', picked.id)
              .then(() => {})
          );
          
          return new Response(JSON.stringify({
            success: true,
            question: {
              id: crypto.randomUUID(),
              grade: picked.grade,
              subject: picked.subject,
              difficulty: picked.difficulty,
              questionText: picked.question_text,
              questionType: picked.question_type,
              correctAnswer: tryParseStructuredValue(picked.correct_answer),
              options: tryParseStructuredValue(picked.options),
              hint: picked.hint,
              task: picked.task,
              createdAt: new Date().toISOString()
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (cacheErr) {
        console.error('Cache fallback failed:', cacheErr);
      }
      
      console.error(`❌ All ${MAX_ATTEMPTS} attempts AND cache fallback failed.`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Fehler bei der Fragengenerierung. Bitte versuche es erneut.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (rawType === 'MATCH' && rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      console.log(`🔀 MATCH question prepared with ${(rawOptions as { leftItems?: unknown[] }).leftItems?.length || 0} pairs`);
    }

    const enhancedQuestion = {
      id: crypto.randomUUID(),
      grade,
      subject,
      difficulty,
      questionText: rawQuestionText,
      questionType: rawType,
      correctAnswer: rawCorrectAnswer,
      options: rawOptions,
      hint: question.hint || null,
      task: typeof question.task === 'string' ? question.task : null,
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

function tryParseStructuredValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
}

function extractChoiceOptions(value: unknown): string[] {
  const parsed = tryParseStructuredValue(value);

  if (Array.isArray(parsed)) {
    return sanitizeStringArray(parsed);
  }

  if (typeof parsed !== 'string') return [];

  return Array.from(
    new Set(
      parsed
        .replace(/\r/g, '\n')
        .split(/[\n,;|]+/)
        .map((entry) => entry.replace(/^[\s•\-–—]*(?:[A-Z]\)|\d+[.)])?\s*/i, '').trim())
        .filter(Boolean)
    )
  );
}

function extractFillBlankAnswers(value: unknown): string[] {
  const parsed = tryParseStructuredValue(value);

  if (Array.isArray(parsed)) {
    return sanitizeStringArray(parsed);
  }

  if (parsed && typeof parsed === 'object' && 'blanks' in parsed) {
    return sanitizeStringArray((parsed as { blanks?: unknown }).blanks);
  }

  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function hasNonEmptyTextAnswer(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;

  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value?: unknown }).value;
    return typeof nested === 'string'
      ? nested.trim().length > 0
      : typeof nested === 'number';
  }

  return typeof value === 'number';
}

function isRenderableQuestionPayload(
  questionType: unknown,
  correctAnswer: unknown,
  options: unknown,
  questionText: unknown,
  task: unknown
): boolean {
  if (typeof questionText !== 'string' || questionText.trim().length === 0) return false;

  switch (questionType) {
    case 'MULTIPLE_CHOICE': {
      const choiceOptions = extractChoiceOptions(options);
      if (choiceOptions.length < 2) return false;

      if (typeof correctAnswer === 'number') {
        return correctAnswer >= 0 && correctAnswer < choiceOptions.length;
      }

      if (typeof correctAnswer === 'string') {
        const trimmed = correctAnswer.trim();
        if (!trimmed) return false;
        const index = Number(trimmed);
        return Number.isInteger(index)
          ? index >= 0 && index < choiceOptions.length
          : choiceOptions.includes(trimmed);
      }

      if (correctAnswer && typeof correctAnswer === 'object' && 'value' in correctAnswer) {
        const nested = (correctAnswer as { value?: unknown }).value;
        if (typeof nested === 'number') {
          return nested >= 0 && nested < choiceOptions.length;
        }
        if (typeof nested === 'string') {
          const trimmed = nested.trim();
          return trimmed.length > 0;
        }
      }

      return false;
    }

    case 'FREETEXT':
      return hasNonEmptyTextAnswer(correctAnswer);

    case 'SORT': {
      const order = sanitizeStringArray((correctAnswer as { order?: unknown } | null)?.order);
      return order.length >= 2;
    }

    case 'MATCH': {
      if (!options || typeof options !== 'object' || Array.isArray(options)) return false;
      const leftItems = sanitizeStringArray((options as { leftItems?: unknown }).leftItems);
      const rightItems = sanitizeStringArray((options as { rightItems?: unknown }).rightItems);
      return leftItems.length >= 2 && rightItems.length >= 2 && leftItems.length === rightItems.length;
    }

    case 'FILL_BLANK': {
      const blanks = extractFillBlankAnswers(correctAnswer);
      const blankText = typeof questionText === 'string' && questionText.includes('___');
      const blankTask = typeof task === 'string' && task.includes('___');
      return blanks.length > 0 && (blankText || blankTask || typeof task === 'string');
    }

    case 'DRAG_DROP': {
      if (!options || typeof options !== 'object' || Array.isArray(options)) return false;
      const items = sanitizeStringArray((options as { items?: unknown }).items);
      const categories = sanitizeStringArray((options as { categories?: unknown }).categories);
      const placements = (correctAnswer as { placements?: unknown } | null)?.placements;
      return items.length >= 2 && categories.length >= 2 && placements && typeof placements === 'object' && !Array.isArray(placements);
    }

    default:
      return false;
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSystemPrompt(): string {
  return `Du bist ein erfahrener Grundschul- und Sekundarschulpädagoge aus Deutschland. 
Deine Aufgabe ist es, qualitativ hochwertige, altersgerechte Lernfragen auf Deutsch zu erstellen.

REGELN:
- Alle Fragen und Antworten auf Deutsch
- Altersgerecht und lehrplankonform für die angegebene Klassenstufe
- Klar formuliert, eindeutig und pädagogisch wertvoll
- Antworte NUR mit gültigem JSON, ohne Markdown oder Erklärungen

SPRACHREGELN FÜR KLEINE KINDER (Klasse 1-2):
- Maximal 1 kurzer Satz als Frage (max 10-12 Wörter)
- Nur einfache, alltägliche Wörter, die ein 6-7-Jähriges Kind versteht
- Keine Fachbegriffe, keine verschachtelten Sätze, keine Nebensätze
- Direkte, klare Aufforderungen: "Rechne", "Was ist", "Wie viele"
- Beispiel GUT: "Was ist 3 + 5?"
- Beispiel GUT: "Wie viele Äpfel sind es?"
- Beispiel SCHLECHT: "Berechne die Summe der folgenden Zahlen"
- Beispiel SCHLECHT: "Welches der folgenden Ergebnisse ist korrekt, wenn man..."

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
  excludeTexts?: string[],
  topicHint?: string
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

  let topicNote = '';
  if (topicHint) {
    topicNote = `\n\nTHEMENSCHWERPUNKT (Lernplan): Fokussiere die Frage auf das Thema "${topicHint}". Die Frage soll dieses Thema direkt behandeln oder eng damit zusammenhängen.`;
  }

  let youngLanguageNote = '';
  if (grade <= 2) {
    youngLanguageNote = `\n\nSPRACHE FÜR KLEINE KINDER (Klasse ${grade}):
- Maximal 1 kurzer Satz als Fragetext (max ${grade === 1 ? '10' : '12'} Wörter)
- Nur einfache, alltägliche Wörter
- Keine Fachbegriffe, keine langen zusammengesetzten Wörter
- Beispiel gut: "Was ist 3 + 5?"
- Beispiel gut: "Wie viele Äpfel sind es?"  
- Beispiel schlecht: "Berechne die Summe der folgenden Zahlen"
- Beispiel schlecht: "Ermittle das Ergebnis der nachstehenden Rechenoperation"`;
  }

  const subjectScope = getSubjectContentScope(subject, grade);

  return `Erstelle eine ${difficultyGuide.label} Lernfrage für Klasse ${grade} im Fach ${subjectGerman}.

WICHTIG – FACHBINDUNG: Die Frage MUSS ausschließlich zum Fach ${subjectGerman} gehören. Erstelle KEINE fachfremden Inhalte (z.B. keine Rechenaufgaben im Fach Deutsch, keine Grammatik im Fach Mathematik).

FACHSPEZIFISCHER INHALT FÜR ${subjectGerman.toUpperCase()}:
${subjectScope}

KLASSENSTUFE: ${gradeGuidelines}
SCHWIERIGKEIT: ${difficultyGuide.description}
FRAGETYP: ${questionType}${exclusionNote}${topicNote}${youngLanguageNote}

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
  if (grade === 1) return 'Grundschule Klasse 1: NUR ganz kurze, einfache Sätze. Maximal 10 Wörter pro Frage. Zahlenraum bis 20. Nur einfache Alltagswörter, die ein 6-Jähriges Kind kennt. Keine Fachbegriffe, keine Nebensätze.';
  if (grade === 2) return 'Grundschule Klasse 2: Kurze, einfache Sätze. Maximal 12 Wörter pro Frage. Zahlenraum bis 100. Nur einfache Alltagswörter. Keine Fachbegriffe.';
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
  // Vary question types for diversity — all types should appear regularly
  const rand = Math.random();
  
  if (subject === 'math') {
    if (grade <= 4) {
      // Grundschule Mathe: MC, Freitext, Sortieren, Zuordnung
      if (rand < 0.35) return 'MULTIPLE_CHOICE';
      if (rand < 0.65) return 'FREETEXT';
      if (rand < 0.80) return 'SORT';
      return 'MATCH';
    }
    // Ab Klasse 5: volle Vielfalt
    if (rand < 0.30) return 'FREETEXT';
    if (rand < 0.55) return 'MULTIPLE_CHOICE';
    if (rand < 0.70) return 'FILL_BLANK';
    if (rand < 0.82) return 'SORT';
    return 'MATCH';
  }

  if (subject === 'science') {
    // Sachkunde (Klasse 1-4): MC, MATCH, SORT
    if (rand < 0.40) return 'MULTIPLE_CHOICE';
    if (rand < 0.65) return 'MATCH';
    if (rand < 0.85) return 'SORT';
    return 'FREETEXT';
  }
  
  if (subject === 'german') {
    if (rand < 0.25) return 'MULTIPLE_CHOICE';
    if (rand < 0.45) return 'FREETEXT';
    if (rand < 0.60) return 'FILL_BLANK';
    if (rand < 0.75) return 'SORT';
    return 'MATCH';
  }
  
  // Default (english, geography, history, etc.): alle Typen
  if (rand < 0.30) return 'MULTIPLE_CHOICE';
  if (rand < 0.50) return 'FREETEXT';
  if (rand < 0.65) return 'MATCH';
  if (rand < 0.80) return 'SORT';
  return 'FILL_BLANK';
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
    
    'DRAG_DROP': `Erstelle eine Drag-and-Drop-Zuordnungsaufgabe.
- options: Objekt mit { "items": ["Element 1", "Element 2"], "categories": ["Kategorie A", "Kategorie B"] }
- correct_answer: Objekt mit { "placements": { "Kategorie A": ["passendes Element"], "Kategorie B": ["anderes Element"] } }
- task: Kurze Anweisung zum Zuordnen
- Mindestens 2 Kategorien und mindestens 4 Elemente insgesamt`,
    
    'FILL_BLANK': `Erstelle eine Lückentextaufgabe.
- question_text: Der Satz mit ___ für die Lücke(n). WICHTIG: question_text MUSS mindestens ein ___ (drei Unterstriche) enthalten!
- task: Kurze Anweisung (z.B. "Setze das passende Tunwort (Verb) in die Lücke ein.")
- correct_answer: String oder Array mit den fehlenden Wörtern
- options: null
- GROSS-/KLEINSCHREIBUNG: Die korrekte Antwort muss die deutsche Rechtschreibung korrekt wiedergeben. Wenn das Wort mitten im Satz steht, gilt: Nomen groß, Verben/Adjektive klein. Beispiel: "Die Katze ___ auf dem Dach." → correct_answer: "saß" (klein, weil Verb mitten im Satz).
- GRUNDFORM-HINWEIS (WICHTIG für Deutsch-Fragen): Wenn ein Verb oder Adjektiv in konjugierter/flektierter Form eingesetzt werden muss, schreibe die Grundform (Infinitiv) in Klammern direkt hinter die Lücke im question_text. Beispiel: "Der Vogel ___ (singen) im Garten." → correct_answer: "singt". So weiß das Kind, welches Wort gemeint ist, und muss nur die richtige Form finden.
- Für Nomen (Substantive) ist kein Grundform-Hinweis nötig, da sie eindeutig sind.`
  };
  
  return instructions[questionType] || instructions['MULTIPLE_CHOICE'];
}

function getSubjectContentScope(subject: string, grade: number): string {
  const scopes: Record<string, (g: number) => string> = {
    'math': (g) => g <= 4
      ? 'Zahlen, Grundrechenarten, Geometrie, Größen & Messen, Sachaufgaben. Keine Textanalyse, keine Grammatik.'
      : 'Algebra, Brüche, Dezimalzahlen, Gleichungen, Funktionen, Geometrie, Stochastik. Keine sprachlichen Analysen.',
    'german': (g) => g <= 4
      ? 'Rechtschreibung, Grammatik (Wortarten, Satzglieder), Lesen & Textverständnis, Wortschatz, Alphabet, Silben. KEINE Rechenaufgaben, KEINE Zahlenrätsel, KEINE Mathematik.'
      : 'Grammatik (Satzglieder, Zeitformen, Konjugation, Deklination), Rechtschreibung, Textanalyse, Literatur, Aufsatz, Wortschatz. KEINE Rechenaufgaben, KEINE Mathematik.',
    'english': (g) => g <= 6
      ? 'Vokabeln, einfache Grammatik (Simple Present/Past), Leseverständnis auf Englisch. Keine deutschen Grammatikfragen.'
      : 'Grammatik (Tenses, Conditionals, Passive), Vokabeln, Textverständnis, Redewendungen. Alles auf Englisch.',
    'geography': () => 'Erdkunde: Länder, Hauptstädte, Kontinente, Klima, Landschaften, Karten. Keine Mathe, keine Grammatik.',
    'history': () => 'Geschichte: Epochen, Ereignisse, Persönlichkeiten, Ursachen & Folgen. Keine Mathe, keine Grammatik.',
    'physics': () => 'Physik: Mechanik, Elektrizität, Optik, Wärmelehre, Formeln & Berechnungen. Nur physikalische Inhalte.',
    'biology': () => 'Biologie: Zellen, Pflanzen, Tiere, Ökologie, Körper, Evolution. Keine Mathe, keine Grammatik.',
    'chemistry': () => 'Chemie: Stoffe, Reaktionen, Periodensystem, Bindungen. Nur chemische Inhalte.',
    'latin': () => 'Latein: Deklination, Konjugation, Übersetzung, Vokabeln, römische Kultur. Keine modernen Sprachen.',
    'science': () => 'Sachkunde: Natur, Tiere, Pflanzen, Jahreszeiten, Wetter, Technik im Alltag. Altersgerecht für Grundschule.',
  };
  const fn = scopes[subject];
  return fn ? fn(grade) : 'Erstelle eine fachlich korrekte Frage zum angegebenen Fach.';
}
