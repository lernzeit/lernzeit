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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🧪 Starting API tests...');

    // Test 1: Single question generation
    console.log('📝 Test 1: Single question generation');
    const singleTestResult = await supabase.functions.invoke('generate-questions', {
      body: {
        grade: 1,
        quarter: "Q1",
        domain: "Zahlen & Operationen",
        count: 1,
        difficulty: "AFB I"
      }
    });

    if (singleTestResult.error) {
      console.error('❌ Single test failed:', singleTestResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Single question test failed',
        details: singleTestResult.error
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Single test successful:', singleTestResult.data);

    if (!singleTestResult.data?.success) {
      console.error('❌ Single test API returned error:', singleTestResult.data);
      return new Response(JSON.stringify({
        success: false,
        error: 'Single question API returned error',
        details: singleTestResult.data
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test 2: Check if question was actually created
    console.log('🔍 Test 2: Checking if question was created');
    const { data: recentTemplates, error: queryError } = await supabase
      .from('templates')
      .select('id, created_at, student_prompt, domain')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ Query error:', queryError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Database query failed',
        details: queryError
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${recentTemplates?.length || 0} recent templates`);

    if (!recentTemplates || recentTemplates.length === 0) {
      console.error('❌ No recent templates found - question not created');
      return new Response(JSON.stringify({
        success: false,
        error: 'Question generation succeeded but no templates were created',
        singleTestResult: singleTestResult.data,
        recentTemplates: recentTemplates
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Question creation verified!');

    // Test 3: Start batch generation if single test passed
    console.log('🚀 Test 3: Starting batch generation');
    const batchResult = await supabase.functions.invoke('batch-generate-questions', {
      body: {}
    });

    if (batchResult.error) {
      console.error('❌ Batch generation failed:', batchResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Batch generation failed',
        details: batchResult.error,
        singleTestPassed: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🎉 All tests passed! Batch generation started.');

    return new Response(JSON.stringify({
      success: true,
      message: 'All tests passed and batch generation completed',
      singleTestResult: singleTestResult.data,
      recentTemplatesFound: recentTemplates.length,
      batchResult: batchResult.data,
      tests: {
        singleQuestionTest: '✅ PASSED',
        questionCreationTest: '✅ PASSED', 
        batchGenerationTest: '✅ PASSED'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Test runner error:', error);
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