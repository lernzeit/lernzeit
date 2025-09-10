import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 GENERATE-QUESTIONS STARTING...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('ENV CHECK:', {
      openai: !!openaiApiKey,
      supabase_url: !!supabaseUrl,
      service_key: !!supabaseServiceKey
    });

    if (!openaiApiKey) {
      console.error('❌ NO OPENAI KEY');
      return new Response(JSON.stringify({ error: 'OpenAI API key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { grade = 1, quarter = 'Q1', domain = 'Zahlen & Operationen', count = 1 } = body;

    console.log(`🎯 GENERATING ${count} questions for Grade ${grade}, ${quarter}, ${domain}`);

    const prompt = `Erstelle genau ${count} mathematische Aufgabe für Klasse ${grade}, Quartal ${quarter}, Bereich ${domain}.

Antworte nur mit diesem JSON Format:
[{
  "student_prompt": "Aufgabentext",
  "solution": {"value": "42"},
  "explanation": "Kurze Erklärung",
  "question_type": "FREETEXT",
  "tags": ["math"]
}]`;

    console.log('🤖 CALLING OPENAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 1000
      }),
    });

    console.log(`🔍 OPENAI RESPONSE STATUS: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ OPENAI ERROR: ${openaiResponse.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        error: 'OpenAI failed',
        status: openaiResponse.status,
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;
    console.log('✅ OPENAI CONTENT RECEIVED:', content?.substring(0, 100));

    let questions;
    try {
      questions = JSON.parse(content);
      if (!Array.isArray(questions)) questions = [questions];
    } catch (e) {
      console.error('❌ PARSE ERROR:', e.message);
      return new Response(JSON.stringify({ error: 'Parse failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📝 PARSED ${questions.length} QUESTIONS, INSERTING...`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const insertResults = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      const templateData = {
        student_prompt: question.student_prompt || `Generated question ${i + 1}`,
        solution: question.solution || { value: "1" },
        explanation: question.explanation || "Auto-generated",
        question_type: question.question_type || 'FREETEXT',
        variables: question.variables || {},
        tags: question.tags || [],
        grade: parseInt(grade),
        grade_app: parseInt(grade),
        quarter_app: quarter,
        domain: domain,
        subcategory: 'AI-Generated',
        difficulty: 'medium',
        status: 'ACTIVE'
      };

      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select();

      if (error) {
        console.error(`❌ INSERT ERROR ${i}:`, error.message);
        insertResults.push({ success: false, error: error.message });
      } else {
        console.log(`✅ INSERTED QUESTION ${i + 1}`);
        insertResults.push({ success: true, data });
      }
    }

    const successCount = insertResults.filter(r => r.success).length;
    console.log(`🎯 COMPLETED: ${successCount}/${questions.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      generated: questions.length,
      inserted: successCount,
      message: `Generated ${questions.length}, inserted ${successCount}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ 
      error: 'Function failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});