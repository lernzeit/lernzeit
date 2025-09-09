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
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { grade = 1, quarter = 'Q1', domain = 'Zahlen & Operationen', count = 2, difficulty = 'medium' } = body;

    console.log(`📚 Generating ${count} questions for Grade ${grade}, ${quarter}, ${domain}`);

    // Construct prompt for OpenAI
    const prompt = `Du bist ein deutscher Grundschullehrer und erstellst mathematische Aufgaben.

Erstelle genau ${count} verschiedene Aufgaben für:
- Klassenstufe: ${grade}
- Quartal: ${quarter} 
- Bereich: ${domain}
- Schwierigkeit: ${difficulty}

Jede Aufgabe soll als JSON-Objekt formatiert sein mit:
{
  "student_prompt": "Die Aufgabenstellung für Schüler",
  "solution": {"value": "Die korrekte Antwort"},
  "explanation": "Kurze Erklärung der Lösung",
  "question_type": "FREETEXT",
  "distractors": null,
  "variables": {},
  "tags": ["passende", "tags"]
}

Antworte NUR mit einem JSON-Array der Aufgaben, ohne zusätzlichen Text.`;

    console.log('🤖 Calling OpenAI API...');

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für deutsche Grundschulmathematik.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ OpenAI API error: ${openaiResponse.status} ${errorText}`);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed', 
        status: openaiResponse.status,
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0]?.message?.content;

    if (!generatedContent) {
      console.error('❌ No content generated from OpenAI');
      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ OpenAI response received, parsing questions...');

    // Parse the generated questions
    let questions;
    try {
      questions = JSON.parse(generatedContent);
      if (!Array.isArray(questions)) {
        questions = [questions];
      }
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse generated questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📝 Parsed ${questions.length} questions, inserting into database...`);

    // Insert questions into database
    const insertPromises = questions.map(async (question, index) => {
      try {
        const templateData = {
          student_prompt: question.student_prompt || `Generated question ${index + 1}`,
          solution: question.solution || { value: "1" },
          explanation: question.explanation || "Automatisch generierte Erklärung",
          question_type: question.question_type || 'FREETEXT',
          distractors: question.distractors,
          variables: question.variables || {},
          tags: question.tags || [],
          grade: parseInt(grade),
          grade_app: parseInt(grade),
          quarter_app: quarter,
          domain: domain,
          subcategory: 'Generated',
          difficulty: difficulty,
          status: 'ACTIVE'
        };

        const { data, error } = await supabase
          .from('templates')
          .insert(templateData)
          .select();

        if (error) {
          console.error(`❌ Database insert error for question ${index + 1}:`, error);
          return { success: false, error: error.message };
        }

        console.log(`✅ Question ${index + 1} inserted successfully`);
        return { success: true, data };
      } catch (err) {
        console.error(`❌ Exception inserting question ${index + 1}:`, err);
        return { success: false, error: err.message };
      }
    });

    const results = await Promise.all(insertPromises);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`📊 Insertion completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      generated: questions.length,
      inserted: successCount,
      errors: errorCount,
      message: `Generated ${questions.length} questions, inserted ${successCount} successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Generate questions error:', error);
    return new Response(JSON.stringify({ 
      error: 'Function failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});