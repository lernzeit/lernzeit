import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 TEST: Template Creation Function starting...');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    console.log('Environment variables check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      geminiApiKey: geminiApiKey ? 'SET' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test Gemini API call
    console.log('🤖 Testing Gemini API call...');
    
    const testPrompt = `Erstelle 1 einfache Mathematikaufgabe für Klasse 3:

{
  "grade": 3,
  "grade_app": 3,
  "quarter_app": "Q1",
  "domain": "Zahlen & Operationen",
  "subcategory": "Addition",
  "difficulty": "AFB I",
  "question_type": "multiple-choice",
  "student_prompt": "Was ist 5 + 3?",
  "variables": {"options": ["6", "7", "8", "9"], "correct_idx": 2},
  "solution": {"value": "8"},
  "unit": "",
  "distractors": ["6", "7", "9"],
  "explanation": "Um 5 + 3 zu berechnen, zählst du einfach 3 Zahlen weiter: 5, 6, 7, 8. Das Ergebnis ist 8.",
  "source_skill_id": "test_3_Q1_addition",
  "tags": ["Addition", "ZR_10"],
  "seed": "12345"
}

Gib nur das JSON zurück, ohne zusätzlichen Text.`;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('✅ Gemini API response received');
    
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No text generated from Gemini');
    }

    // Parse JSON from generated text
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in generated text');
    }

    const template = JSON.parse(jsonMatch[0]);
    console.log('📝 Template parsed successfully:', template.student_prompt);

    // Test database insertion
    console.log('💾 Testing database insertion...');
    
    const { data: insertedTemplate, error: insertError } = await supabase
      .from('templates')
      .insert([{
        ...template,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    console.log('✅ Template successfully inserted with ID:', insertedTemplate.id);

    // Count total templates
    const { data: countData, error: countError } = await supabase
      .from('templates')
      .select('id', { count: 'exact' });

    const totalCount = countData?.length || 0;

    return new Response(JSON.stringify({
      success: true,
      message: 'Template creation test successful',
      testResults: {
        geminiApiWorking: true,
        databaseInsertWorking: true,
        templateId: insertedTemplate.id,
        totalTemplatesInDB: totalCount
      },
      generatedTemplate: {
        question: template.student_prompt,
        explanation: template.explanation,
        type: template.question_type
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      testResults: {
        geminiApiWorking: false,
        databaseInsertWorking: false
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});