import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateQuestionRequest {
  topic_id: string;
  grade: number;
  subject: string;
  topic_title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic_id, grade, subject, topic_title }: GenerateQuestionRequest = await req.json();
    
    console.log(`🎯 Generating realtime question: ${topic_title} (Grade ${grade}, ${subject})`);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build prompt for single question
    const prompt = buildSingleQuestionPrompt(grade, subject, topic_title);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein erfahrener Pädagoge, der kindgerechte Lernfragen erstellt.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.8, // Höhere Varianz für unterschiedliche Fragen
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    const generatedContent = aiResult.choices[0].message.content;

    console.log('🤖 AI Response received');

    // Parse JSON response
    let question: any;
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      question = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', generatedContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    console.log(`✅ Generated question: ${question.question_text}`);

    // Return question directly (no DB storage)
    return new Response(JSON.stringify({
      success: true,
      question: {
        id: crypto.randomUUID(), // Temporary ID for frontend tracking
        topic_id,
        grade,
        subject,
        topic_title,
        question_text: question.question_text,
        question_type: question.question_type,
        correct_answer: question.correct_answer,
        options: question.options || null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Question generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildSingleQuestionPrompt(grade: number, subject: string, topic_title: string): string {
  return `Erstelle EINE hochwertige Lernfrage für:

**Klassenstufe:** ${grade}
**Fach:** ${subject}
**Thema:** ${topic_title}

**WICHTIGE ANFORDERUNGEN:**

1. **Fragetyp wählen** (zufällig einer von):
   - MULTIPLE_CHOICE: 4 Antwortoptionen, genau 1 richtig
   - FREETEXT: Kind gibt Antwort als Text/Zahl ein
   - SORT: 4-6 Elemente in richtige Reihenfolge bringen
   - MATCH: 4-6 Elemente einander zuordnen

2. **Altersgerecht:** Sprache muss für Klassenstufe ${grade} verständlich sein

3. **Konkret & Kreativ:** 
   - Verwende konkrete Zahlen, Namen, Alltagssituationen
   - Mach die Frage interessant und abwechslungsreich
   - KEINE langweiligen Standard-Aufgaben

4. **Keine Erklärung:** Generiere KEINE Erklärung (wird bei Bedarf später erstellt)

5. **JSON Format:** Antworte NUR mit einem JSON-Objekt (kein Markdown):

**Beispiel MULTIPLE_CHOICE:**
{
  "question_text": "Lisa kauft 3 Äpfel für je 45 Cent. Wie viel bezahlt sie?",
  "question_type": "MULTIPLE_CHOICE",
  "correct_answer": {"value": "1,35€"},
  "options": ["1,35€", "1,45€", "1,25€", "1,50€"]
}

**Beispiel FREETEXT:**
{
  "question_text": "Wie viele Minuten sind 2,5 Stunden?",
  "question_type": "FREETEXT",
  "correct_answer": {"value": "150"}
}

**Beispiel SORT:**
{
  "question_text": "Ordne die Zahlen aufsteigend:",
  "question_type": "SORT",
  "correct_answer": {"order": ["23", "89", "145", "678"]},
  "options": ["145", "23", "678", "89"]
}

**Beispiel MATCH:**
{
  "question_text": "Ordne die Zahlen den richtigen Ergebnissen zu:",
  "question_type": "MATCH",
  "correct_answer": {
    "pairs": [
      ["10 - 4", "6"],
      ["5 + 3", "8"],
      ["3 × 2", "6"]
    ]
  },
  "options": {
    "leftItems": ["10 - 4", "5 + 3", "3 × 2"],
    "rightItems": ["6", "8", "6"]
  }
}

**Wichtig für Klassenstufe ${grade}:**
${getGradeGuidelines(grade)}

Generiere jetzt EINE kreative Frage im JSON-Format:`;
}

function getGradeGuidelines(grade: number): string {
  if (grade === 1) {
    return `
- Zahlenraum bis 20
- Einfache Plus/Minus ohne Übergang
- Konkrete Gegenstände (Äpfel, Stifte, Bälle)
- Sehr kurze, klare Sätze`;
  } else if (grade === 2) {
    return `
- Zahlenraum bis 100
- Einmaleins-Aufgaben (2er, 5er, 10er)
- Alltagssituationen (Einkaufen, Spielplatz)
- Kurze, verständliche Sätze`;
  } else if (grade === 3) {
    return `
- Zahlenraum bis 1000
- Schriftliche Rechenverfahren (einfach)
- Division mit/ohne Rest
- Sachaufgaben mit 2-3 Schritten`;
  } else if (grade === 4) {
    return `
- Zahlenraum bis 1 Million
- Alle Rechenarten kombiniert
- Brüche (Grundlagen)
- Komplexere Sachaufgaben`;
  } else if (grade >= 5) {
    return `
- Große Zahlen, Dezimalzahlen
- Bruchrechnung, Prozente
- Einheitenumrechnung
- Mehrstufige Sachaufgaben`;
  }
  return '- Passe die Schwierigkeit an die Klassenstufe an';
}
