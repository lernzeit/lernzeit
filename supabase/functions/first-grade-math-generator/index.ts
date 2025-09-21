import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 10, domain = "Zahlen & Operationen", quarter = "Q1" } = await req.json();
    
    console.log(`🎯 FIRST-GRADE GENERATOR: Creating ${count} questions for ${domain} ${quarter}`);

    const prompt = `Du bist Experte für erste Klasse Mathematik (6-7 Jahre, Deutschland).
Erstelle genau ${count} altersgerechte Aufgaben für:
- Bereich: ${domain}
- Quartal: ${quarter} 
- Zahlenraum: 0-20 (Zehnerübergang erlaubt bei Q2+)

ERSTE KLASSE REGELN:
✅ Einfache, klare Sprache (keine Fachbegriffe)
✅ Visuelle Elemente nutzen: 🟢🔴⭐🍎🚗🐶🐱
✅ Nur MULTIPLE_CHOICE oder FREETEXT
✅ Lösungen müssen eindeutig sein
✅ 3-4 plausible Distractors bei Multiple Choice

ZAHLENRAUM-REGELN:
- Q1: Hauptsächlich 0-10, einfache Addition/Subtraktion ohne Übergang
- Q2+: 0-20 mit Zehnerübergang erlaubt (z.B. 8+5=13, 14-6=8)
- Vergleichsoperatoren (<, >, =): z.B. "8 __ 12 (setze <, >, = ein)"
- Grundformen: Kreis 🔵, Dreieck 🔺, Quadrat ⬜, Rechteck ▬

BEISPIELE:
MULTIPLE_CHOICE:
{
  "student_prompt": "🍎🍎🍎 + 🍎🍎 = ?",
  "solution": {"value": "5"},
  "distractors": ["3", "4", "6"],
  "question_type": "MULTIPLE_CHOICE",
  "explanation": "3 Äpfel plus 2 Äpfel sind zusammen 5 Äpfel.",
  "tags": ["Addition", "ZR_10"]
}

FREETEXT/VERGLEICH:
{
  "student_prompt": "Setze das richtige Zeichen ein: 8 __ 12",
  "solution": {"value": "<"},
  "distractors": [],
  "question_type": "FREETEXT",
  "explanation": "8 ist kleiner als 12, deshalb kommt das Zeichen < dazwischen.",
  "tags": ["Vergleich", "ZR_20"]
}

WICHTIG: Antwort nur als JSON-Array ohne Zusatztext:
[{"student_prompt": "...", "solution": {"value": "..."}, "distractors": [...], "question_type": "MULTIPLE_CHOICE", "explanation": "...", "tags": [...]}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();
    
    console.log('🤖 Raw OpenAI response:', generatedContent);

    // Parse JSON response
    let questions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = generatedContent.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      throw new Error('Failed to parse generated questions as JSON');
    }

    if (!Array.isArray(questions)) {
      throw new Error('Generated content is not an array of questions');
    }

    console.log(`✅ Parsed ${questions.length} questions successfully`);

    // Validate and enhance each question
    const processedQuestions = [];
    for (const [index, question] of questions.entries()) {
      try {
        // Basic validation
        if (!question.student_prompt || !question.solution?.value || !question.question_type) {
          console.warn(`⚠️ Question ${index + 1} missing required fields, skipping`);
          continue;
        }

        // Ensure proper structure
        const processedQuestion = {
          student_prompt: question.student_prompt,
          solution: question.solution,
          distractors: question.distractors || [],
          question_type: question.question_type.toUpperCase(),
          explanation: question.explanation || '',
          tags: question.tags || [],
          // Metadata for templates table
          grade: 1,
          grade_app: 1,
          domain: domain,
          subcategory: "Grundrechenarten", // Default for first grade
          quarter_app: quarter,
          difficulty: "easy", // First grade is always easy
          status: "ACTIVE", // Set directly to ACTIVE for testing
          variables: {},
          quality_score: 0.9, // High score for AI-generated first grade content
          validation_status: "approved",
          is_parametrized: false
        };

        processedQuestions.push(processedQuestion);
        console.log(`✅ Question ${index + 1} processed: ${question.student_prompt.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Error processing question ${index + 1}:`, error);
      }
    }

    if (processedQuestions.length === 0) {
      throw new Error('No valid questions were generated');
    }

    // Insert into database
    console.log(`💾 Inserting ${processedQuestions.length} first-grade questions into database...`);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('templates')
      .insert(processedQuestions)
      .select('id, student_prompt, question_type');

    if (insertError) {
      console.error('❌ Database insertion failed:', insertError);
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedData.length} first-grade templates`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully generated ${insertedData.length} first-grade math questions`,
      questions: insertedData,
      metadata: {
        domain,
        quarter,
        grade: 1,
        count: insertedData.length,
        status: "ACTIVE"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ First-grade generator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});