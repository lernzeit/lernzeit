import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExplanationRequest {
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  grade: number;
  subject: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
      const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
      const { data, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authErr || !data?.user) {
        return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { question, correctAnswer, userAnswer, grade, subject }: ExplanationRequest = await req.json();

    const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');
    const safeQuestion = clip(question, 500);
    const safeCorrect = clip(correctAnswer, 500);
    const safeUser = userAnswer ? clip(userAnswer, 500) : undefined;
    const safeGrade = Number.isFinite(grade) ? Math.min(Math.max(Number(grade), 1), 10) : 1;
    const safeSubject = clip(subject, 50);

    console.log(`📚 Generating explanation for Grade ${safeGrade} ${safeSubject}`);

    const prompt = buildExplanationPrompt(safeQuestion, safeCorrect, safeUser, safeGrade, safeSubject);

    const { response } = await callAI({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: getSystemPrompt(safeGrade) },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' } as any,
    } as any, undefined, 'ai_explain');

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      throw new Error('No explanation generated');
    }

    // Parse structured JSON — model is instructed to return {verdict, verifiedCorrectAnswer, explanation}
    let parsed: { verdict?: string; verifiedCorrectAnswer?: string; explanation?: string } = {};
    try {
      const jsonText = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(jsonText);
    } catch (e) {
      // Fallback: treat entire response as plain explanation
      parsed = { explanation: raw, verdict: 'unclear' };
    }

    const explanation = (parsed.explanation || raw).trim();
    const verdict = parsed.verdict || 'unclear';
    const verifiedCorrectAnswer = parsed.verifiedCorrectAnswer || safeCorrect;

    console.log(`✅ Explanation generated (${explanation.length} chars, verdict=${verdict})`);

    return new Response(JSON.stringify({
      success: true,
      explanation,
      verdict,
      verifiedCorrectAnswer,
      grade,
      subject
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Explanation error:', error);
    
    // Fallback explanation
    const fallback = "Super, dass du es versucht hast! Manchmal braucht man einfach noch ein bisschen Übung. Versuche es gleich nochmal - du schaffst das! 💪";
    
    return new Response(JSON.stringify({
      success: true,
      explanation: fallback,
      isFallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSystemPrompt(grade: number): string {
  const ageDescriptions: Record<number, string> = {
    1: '6-7 Jahre alt',
    2: '7-8 Jahre alt',
    3: '8-9 Jahre alt',
    4: '9-10 Jahre alt',
    5: '10-11 Jahre alt',
    6: '11-12 Jahre alt',
    7: '12-13 Jahre alt',
    8: '13-14 Jahre alt',
    9: '14-15 Jahre alt',
    10: '15-16 Jahre alt'
  };

  const age = ageDescriptions[grade] || `${5 + grade}-${6 + grade} Jahre alt`;

  return `Du bist ein liebevoller, geduldiger Lehrer in DEUTSCHLAND, der einem Kind (${age}, ${grade}. Klasse) etwas erklärt.

WICHTIGE REGELN:
1. Sprich das Kind direkt an ("Du", nicht "man")
2. Verwende einfache Sprache passend zum Alter
3. Sei ermutigend und positiv
4. Erkläre Schritt für Schritt
5. Verwende konkrete Beispiele aus dem deutschen Alltag
6. Halte die Erklärung kurz (2-4 Sätze für jüngere, bis zu 5 Sätze für ältere)
7. Verwende passende Emojis sparsam
8. KEINE langen Texte oder komplizierte Begriffe
9. Verwende KEIN Markdown (keine **, keine ##, keine Listen mit -). Schreibe reinen Fließtext. Setze Wörter in Anführungszeichen statt sie fett zu markieren.

KRITISCH - DEUTSCHE SCHREIBWEISE:
- Verwende IMMER Euro (€), NIEMALS Dollar ($)
- Schreibe Zahlen mit Komma als Dezimaltrennzeichen (z.B. 3,50 €)
- Verwende das deutsche "mal" oder "×" für Multiplikation, nicht "times"
- Datumsformat: TT.MM.JJJJ
- Uhrzeiten: 14:30 Uhr (nicht 2:30 PM)
- Maßeinheiten: km, m, cm, kg, g, l, ml
- Bei Geldbeträgen immer € verwenden`;
}

function buildExplanationPrompt(
  question: string, 
  correctAnswer: string, 
  userAnswer: string | undefined, 
  grade: number, 
  subject: string
): string {
  const subjectGerman = getSubjectGerman(subject);

  let gradeHint = '';
  if (grade <= 2) gradeHint = 'Sehr einfache Wörter und kurze Sätze.';
  else if (grade <= 4) gradeHint = 'Schritt für Schritt, mit Alltagsbeispielen (Euro).';
  else if (grade <= 6) gradeHint = 'Erkläre das Konzept dahinter.';
  else gradeHint = 'Erkläre das Prinzip und die Methode.';

  return `Du prüfst und erklärst eine ${subjectGerman}-Aufgabe für die Klasse ${grade}.

AUFGABE: ${question}
ANGEGEBENE RICHTIGE ANTWORT: ${correctAnswer}
ANTWORT DES KINDES: ${userAnswer ?? '(keine)'}

SCHRITT 1 — Prüfe unabhängig, was tatsächlich die korrekte Antwort ist. Ignoriere zunächst die "angegebene richtige Antwort".
SCHRITT 2 — Vergleiche mit der "angegebenen richtigen Antwort" UND mit der "Antwort des Kindes".
SCHRITT 3 — Bestimme das verdict:
  • "stated_correct" — Die angegebene Antwort ist korrekt, das Kind lag falsch.
  • "user_correct"   — Die Antwort des Kindes ist korrekt, die angegebene Antwort ist FALSCH.
  • "both_correct"   — Beide sind akzeptabel (z.B. Synonym, Rundung).
  • "both_wrong"     — Weder die angegebene noch die des Kindes stimmt.
  • "unclear"        — Nicht eindeutig entscheidbar.

SCHRITT 4 — Schreibe eine kindgerechte Erklärung (2-4 Sätze, ${gradeHint}). Deutsche Schreibweise: Euro (€), Komma-Dezimal, deutsche Einheiten. KEIN Markdown.
  • Bei "user_correct": lobe das Kind ("Du hattest recht!") und erkläre kurz, warum SEINE Antwort stimmt.
  • Bei "stated_correct" oder "both_wrong": erkläre freundlich die tatsächlich richtige Antwort.

ANTWORTE AUSSCHLIESSLICH als JSON-Objekt (kein Markdown, kein Code-Block):
{
  "verdict": "stated_correct" | "user_correct" | "both_correct" | "both_wrong" | "unclear",
  "verifiedCorrectAnswer": "<die tatsächlich korrekte Antwort als String>",
  "explanation": "<kindgerechte Erklärung als reiner Fließtext>"
}`;
}

function getSubjectGerman(subject: string): string {
  const map: Record<string, string> = {
    'math': 'Mathematik',
    'german': 'Deutsch',
    'english': 'Englisch',
    'geography': 'Geographie',
    'history': 'Geschichte',
    'physics': 'Physik',
    'biology': 'Biologie',
    'chemistry': 'Chemie',
    'latin': 'Latein',
    'science': 'Sachkunde'
  };
  return map[subject.toLowerCase()] || subject;
}
