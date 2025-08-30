import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    console.log('🔍 Phase 3: Debugging Gemini API integration');
    
    // Get environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!geminiApiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'GEMINI_API_KEY not configured',
        status: 'failed'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Test 1: Check templates count
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('id, domain, grade, status, qscore')
      .eq('domain', 'Zahlen & Operationen')
      .eq('status', 'ACTIVE')
      .limit(10);
      
    console.log('📊 Template Status Check:', {
      total: templates?.length || 0,
      active: templates?.filter(t => t.status === 'ACTIVE').length || 0,
      high_quality: templates?.filter(t => (t.qscore || 0) > 0.7).length || 0
    });
    
    // Test 2: Call Gemini API directly
    const testPrompt = `Erstelle eine einfache Mathematikaufgabe für Klasse 1:
    - Multiple-Choice Format
    - Addition im Zahlenraum bis 10
    - Kindgerechte Sprache
    
    Antworte nur mit JSON:
    {
      "question": "Frage hier",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Erklärung hier"
    }`;
    
    console.log('🤖 Testing Gemini API call...');
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });
    
    const geminiResult = await geminiResponse.json();
    console.log('🤖 Gemini API Response Status:', geminiResponse.status);
    
    if (!geminiResponse.ok) {
      console.error('❌ Gemini API Error:', geminiResult);
      return new Response(JSON.stringify({
        error: 'Gemini API call failed',
        details: geminiResult,
        status: 'api_error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Test 3: Try to insert a test template
    const testTemplate = {
      domain: 'Zahlen & Operationen',
      grade: 1,
      grade_app: 1,
      quarter_app: 'Q1',
      question_type: 'MultipleChoice',
      student_prompt: 'Test question: What is 2 + 2?',
      difficulty: 'AFB I',
      qscore: 0.8,
      status: 'ACTIVE',
      variables: {},
      solution: { correct_answer: '4' },
      distractors: { options: ['2', '3', '4', '5'] }
    };
    
    const { data: insertedTemplate, error: insertError } = await supabase
      .from('templates')
      .insert(testTemplate)
      .select()
      .single();
    
    console.log('💾 Template insertion test:', {
      success: !insertError,
      error: insertError?.message,
      template_id: insertedTemplate?.id
    });
    
    // Test 4: Check if question_factory_v2 function exists
    const { data: functionTest, error: functionError } = await supabase.functions.invoke('question_factory_v2', {
      body: { grade: 1, subject: 'mathematik' }
    });
    
    console.log('🔧 Function test result:', {
      success: !functionError,
      error: functionError?.message,
      response: functionTest
    });
    
    return new Response(JSON.stringify({
      status: 'debug_complete',
      tests: {
        gemini_api_key: !!geminiApiKey,
        gemini_api_call: geminiResponse.ok,
        template_count: templates?.length || 0,
        active_templates: templates?.filter(t => t.status === 'ACTIVE').length || 0,
        template_insertion: !insertError,
        function_call: !functionError
      },
      gemini_response: geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
      recommendations: [
        !geminiApiKey ? 'Configure GEMINI_API_KEY' : null,
        !geminiResponse.ok ? 'Fix Gemini API authentication' : null,
        (templates?.filter(t => t.status === 'ACTIVE').length || 0) === 0 ? 'No active templates found' : null,
        insertError ? 'Database insertion failed' : null,
        functionError ? 'Edge function not working' : null
      ].filter(Boolean)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Debug function error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      status: 'debug_failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});