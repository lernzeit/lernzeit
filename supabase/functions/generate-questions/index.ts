import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Starting question generation...');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key missing');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase credentials missing');
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { grade = 1, quarter = 'Q2', domain = 'Zahlen & Operationen', count = 5, difficulty = 'AFB I' } = await req.json().catch(() => ({}));

    console.log(`📚 Generating ${count} questions for Grade ${grade}, ${quarter}, ${domain}`);

    // Create OpenAI prompt for mathematical questions
    const prompt = `Erstelle ${count} deutsche Mathematik-Aufgaben für Klasse ${grade} im Quartal ${quarter} im Bereich "${domain}" mit Schwierigkeitsgrad ${difficulty}.

Für jede Aufgabe gib zurück:
- student_prompt: Die Aufgabenstellung auf Deutsch
- solution: Die korrekte Antwort als Zahl oder Text
- distractors: 3-4 falsche Antwortmöglichkeiten
- explanation: Kurze Erklärung der Lösung
- question_type: "MultipleChoice"

Beispiel-Format:
{
  "questions": [
    {
      "student_prompt": "Wie viel ist 5 + 3?",
      "solution": "8",
      "distractors": ["6", "7", "9", "10"],
      "explanation": "5 + 3 = 8. Wir zählen 3 zu 5 dazu.",
      "question_type": "MultipleChoice"
    }
  ]
}

Antworte nur mit gültigem JSON.`;

    console.log('🤖 Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein Mathematik-Lehrer. Erstelle hochwertige Lernaufgaben im JSON-Format.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');

    let questionsData;
    try {
      const content = data.choices[0].message.content;
      questionsData = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const questions = questionsData.questions || [];
    console.log(`📝 Processing ${questions.length} questions...`);

    let insertedCount = 0;
    const errors = [];

    for (const question of questions) {
      try {
        console.log(`📌 Inserting question: ${question.student_prompt?.substring(0, 50)}...`);
        
        const { error } = await supabase
          .from('templates')
          .insert({
            student_prompt: question.student_prompt,
            solution: JSON.stringify({ value: question.solution }),
            distractors: JSON.stringify(question.distractors || []),
            explanation: question.explanation,
            question_type: question.question_type || 'MultipleChoice',
            difficulty: difficulty,
            grade: grade,
            grade_app: grade,
            quarter_app: quarter,
            domain: domain,
            subcategory: 'Generated',
            tags: ['AI-Generated', domain.replace(/\s+/g, '_')],
            variables: {},
            status: 'ACTIVE'
          });

        if (error) {
          console.error('❌ Database insertion error:', error);
          errors.push(error.message);
        } else {
          insertedCount++;
          console.log(`✅ Question ${insertedCount} inserted successfully`);
        }
      } catch (insertError) {
        console.error('❌ Question processing error:', insertError);
        errors.push(insertError.message);
      }
    }

    console.log(`🎉 Generation complete: ${insertedCount}/${questions.length} questions inserted`);

    return new Response(JSON.stringify({
      success: true,
      generated: questions.length,
      inserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully generated and inserted ${insertedCount} questions`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});