import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateQuestionsRequest {
  topic_id: string;
  count: number;
  trigger?: 'manual' | 'cron';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic_id, count = 10, trigger = 'manual' }: GenerateQuestionsRequest = await req.json();
    
    console.log(`🎯 Generating ${count} questions for topic ${topic_id} (trigger: ${trigger})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get topic details
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topic_id)
      .single();

    if (topicError || !topic) {
      throw new Error(`Topic not found: ${topicError?.message}`);
    }

    console.log(`📚 Topic: ${topic.title} (Grade ${topic.grade}, ${topic.subject})`);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build simplified prompt
    const prompt = buildQuestionGenerationPrompt(topic, count);

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
          { role: 'system', content: 'Du bist ein erfahrener Pädagoge, der qualitativ hochwertige Lernfragen erstellt.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
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
    let questions: any[];
    try {
      const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', generatedContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    console.log(`✅ Parsed ${questions.length} questions from AI`);

    // Insert questions into database
    const questionsToInsert = questions.map(q => ({
      topic_id: topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      options: q.options || null,
      quality_score: 0.8,
      is_active: true
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedQuestions?.length || 0} questions`);

    return new Response(JSON.stringify({
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        grade: topic.grade,
        subject: topic.subject
      },
      generated_count: insertedQuestions?.length || 0,
      requested_count: count,
      questions: insertedQuestions,
      trigger
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

function buildQuestionGenerationPrompt(topic: any, count: number): string {
  return `Erstelle ${count} hochwertige Lernfragen für folgendes Thema:

**Thema:** ${topic.title}
**Klassenstufe:** ${topic.grade}
**Fach:** ${topic.subject}
**Beschreibung:** ${topic.description || 'Keine weitere Beschreibung'}

**WICHTIGE ANFORDERUNGEN:**

1. **Fragetypen:** Mische verschiedene Typen:
   - MULTIPLE_CHOICE: 4 Antwortoptionen, genau 1 richtig
   - FREETEXT: Kind gibt Antwort als Text/Zahl ein
   - SORT: 4-6 Elemente in richtige Reihenfolge bringen
   - MATCH: 4-6 Elemente einander zuordnen

2. **Altersgerecht:** Sprache muss für Klassenstufe ${topic.grade} verständlich sein

3. **Konkret:** Verwende konkrete Zahlen, Namen, Beispiele (z.B. "Lisa hat 5 Äpfel")

4. **Keine Erklärungen:** Generiere KEINE Erklärungen in den Fragen (werden später on-demand erstellt)

5. **JSON Format:** Antworte NUR mit einem JSON-Array (kein Markdown, keine zusätzlichen Texte):

[
  {
    "question_text": "Fragetext hier",
    "question_type": "MULTIPLE_CHOICE",
    "correct_answer": {"value": "A"},
    "options": ["Option A (richtig)", "Option B", "Option C", "Option D"]
  },
  {
    "question_text": "Fragetext hier",
    "question_type": "FREETEXT",
    "correct_answer": {"value": "42"},
    "options": null
  },
  {
    "question_text": "Sortiere die Zahlen aufsteigend:",
    "question_type": "SORT",
    "correct_answer": {"order": ["1", "5", "12", "23"]},
    "options": ["23", "5", "1", "12"]
  },
  {
    "question_text": "Ordne die Hauptstädte zu:",
    "question_type": "MATCH",
    "correct_answer": {"pairs": [["Deutschland", "Berlin"], ["Frankreich", "Paris"]]},
    "options": {
      "leftItems": ["Deutschland", "Frankreich"],
      "rightItems": ["Berlin", "Paris"]
    }
  }
]

**Beispiele für Klassenstufe ${topic.grade}:**
${getGradeExamples(topic.grade, topic.subject, topic.title)}

Generiere jetzt ${count} verschiedene Fragen im JSON-Format:`;
}

function getGradeExamples(grade: number, subject: string, title: string): string {
  if (grade === 1 && subject === 'math') {
    return `
- "Wie viele Äpfel sind das?" (Bild mit 7 Äpfeln) → FREETEXT: {"value": "7"}
- "Was ist 3 + 4?" → MULTIPLE_CHOICE mit Optionen [6, 7, 8, 9]
- "Sortiere die Zahlen: 9, 2, 5, 1" → SORT`;
  } else if (grade === 5 && title.includes('Einheiten')) {
    return `
- "Wie viele Meter sind 3 Kilometer?" → FREETEXT: {"value": "3000"}
- "Ordne zu: 1000g = ?" → MATCH mit kg, g, mg
- "Was ist größer: 2,5 km oder 2400 m?" → MULTIPLE_CHOICE`;
  }
  return '(Passe die Schwierigkeit an die Klassenstufe an)';
}
