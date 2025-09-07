import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // DIAGNOSIS: Check all critical components
    const results = {
      timestamp: new Date().toISOString(),
      environment: {},
      database: {},
      geminiApi: {},
      templateGeneration: {}
    };

    // 1. Environment Check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    results.environment = {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...' || 'MISSING'
    };

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    // 2. Database Connection Test
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: dbTest, error: dbError } = await supabase
      .from('templates')
      .select('COUNT(*)')
      .limit(1);
    
    results.database = {
      connected: !dbError,
      error: dbError?.message || null,
      testQuery: !!dbTest
    };

    // 3. Gemini API Test
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say 'API Test Success'" }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      })
    });

    results.geminiApi = {
      status: geminiResponse.status,
      ok: geminiResponse.ok,
      hasResponse: geminiResponse.status === 200
    };

    if (geminiResponse.ok) {
      const geminiData = await geminiResponse.json();
      results.geminiApi.generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'NO_TEXT';
    }

    // 4. Template Generation Test (MINIMAL)
    if (results.database.connected && results.geminiApi.ok) {
      const templateTest = {
        grade: 4,
        grade_app: 4,
        quarter_app: "Q4",
        domain: "Zahlen & Operationen",
        subcategory: "Test",
        difficulty: "AFB I", 
        question_type: "multiple-choice",
        student_prompt: "Diagnostic Test: Was ist 2 + 2?",
        variables: {"options": ["3", "4", "5", "6"], "correct_idx": 1},
        solution: {"value": "4"},
        unit: "",
        distractors: ["3", "5", "6"],
        explanation: "2 + 2 = 4. Das ist eine einfache Addition.",
        source_skill_id: "diagnostic_test",
        tags: ["diagnostic", "test"],
        seed: "999999"
      };

      const { data: insertTest, error: insertError } = await supabase
        .from('templates')
        .insert([templateTest])
        .select()
        .single();

      results.templateGeneration = {
        insertAttempted: true,
        insertSuccess: !insertError,
        insertError: insertError?.message || null,
        templateId: insertTest?.id || null
      };
    }

    return new Response(JSON.stringify({
      success: true,
      diagnosis: results,
      summary: {
        envOk: results.environment.hasSupabaseUrl && results.environment.hasServiceKey && results.environment.hasGeminiKey,
        dbOk: results.database.connected,
        geminiOk: results.geminiApi.ok,
        templateOk: results.templateGeneration.insertSuccess
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});