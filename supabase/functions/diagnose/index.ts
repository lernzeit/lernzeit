import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('🔍 Starting diagnosis...');
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {},
      apiTest: {},
      databaseTest: {}
    };

    // Check environment variables
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    diagnostics.environment = {
      hasOpenAIKey: !!openaiKey,
      openAIKeyLength: openaiKey ? openaiKey.length : 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrl: supabaseUrl
    };

    console.log('Environment check:', diagnostics.environment);

    if (!openaiKey) {
      diagnostics.apiTest.error = 'OpenAI API key missing';
      return new Response(JSON.stringify(diagnostics), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test OpenAI API directly
    console.log('🤖 Testing OpenAI API...');
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Say "API test successful" and nothing else.' }
          ],
          max_completion_tokens: 50
        }),
      });

      const openaiResult = await openaiResponse.json();
      
      diagnostics.apiTest = {
        status: openaiResponse.status,
        ok: openaiResponse.ok,
        hasChoices: !!openaiResult.choices,
        message: openaiResult.choices?.[0]?.message?.content || 'No content',
        error: openaiResult.error || null
      };
      
      console.log('OpenAI test result:', diagnostics.apiTest);
      
    } catch (error) {
      diagnostics.apiTest.error = error.message;
      console.error('OpenAI test failed:', error);
    }

    // Test database connection
    console.log('💾 Testing database...');
    try {
      const supabase = createClient(supabaseUrl!, supabaseKey!);
      
      // Test read
      const { data: templates, error: readError } = await supabase
        .from('templates')
        .select('id, created_at')
        .limit(1);

      if (readError) throw readError;

      // Test write with a simple template
      const testTemplate = {
        grade: 1,
        grade_app: 1,
        quarter_app: "Q1",
        domain: "Test",
        subcategory: "Diagnosis",
        difficulty: "easy",
        question_type: "freetext",
        student_prompt: "Test diagnosis question",
        variables: {},
        solution: { value: "42" },
        unit: "",
        distractors: [],
        explanation: "This is a test",
        source_skill_id: "test",
        tags: ["test"],
        seed: 123456
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('templates')
        .insert([testTemplate])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Clean up test template
      await supabase
        .from('templates')
        .delete()
        .eq('id', insertResult.id);

      diagnostics.databaseTest = {
        canRead: true,
        canWrite: true,
        canDelete: true,
        testTemplateId: insertResult.id
      };
      
      console.log('Database test successful:', diagnostics.databaseTest);
      
    } catch (error) {
      diagnostics.databaseTest.error = error.message;
      console.error('Database test failed:', error);
    }

    // Summary
    const allGood = diagnostics.environment.hasOpenAIKey && 
                   diagnostics.apiTest.ok && 
                   diagnostics.databaseTest.canWrite;
    
    diagnostics.summary = {
      status: allGood ? 'READY' : 'ISSUES_FOUND',
      readyForGeneration: allGood,
      issues: []
    };

    if (!diagnostics.environment.hasOpenAIKey) {
      diagnostics.summary.issues.push('OpenAI API key missing');
    }
    
    if (!diagnostics.apiTest.ok) {
      diagnostics.summary.issues.push('OpenAI API not accessible');
    }
    
    if (!diagnostics.databaseTest.canWrite) {
      diagnostics.summary.issues.push('Database write access failed');
    }

    console.log('🏁 Diagnosis complete:', diagnostics.summary);

    return new Response(JSON.stringify(diagnostics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Diagnosis error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});