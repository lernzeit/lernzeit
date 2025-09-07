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
    console.log('🎯 Controller: Starting batch generation and verification...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check current templates count
    const { data: beforeCount, error: beforeError } = await supabase
      .from('templates')
      .select('count', { count: 'exact' })
      .limit(0);

    if (beforeError) {
      console.error('❌ Error counting templates before:', beforeError);
      throw beforeError;
    }

    const templatesBefore = beforeCount || 0;
    console.log(`📊 Templates before generation: ${templatesBefore}`);

    // Start batch generation
    console.log('🚀 Starting batch generation...');
    const { data: batchResult, error: batchError } = await supabase.functions.invoke('batch-generate-questions', {
      body: {}
    });

    if (batchError) {
      console.error('❌ Batch generation error:', batchError);
      throw batchError;
    }

    console.log('✅ Batch generation completed:', batchResult);

    // Wait a bit for insertions to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check templates count after
    const { data: afterCount, error: afterError } = await supabase
      .from('templates')
      .select('count', { count: 'exact' })
      .limit(0);

    if (afterError) {
      console.error('❌ Error counting templates after:', afterError);
      throw afterError;
    }

    const templatesAfter = afterCount || 0;
    const newTemplates = templatesAfter - templatesBefore;

    console.log(`📊 Templates after generation: ${templatesAfter}`);
    console.log(`🎉 New templates created: ${newTemplates}`);

    // Get sample of new templates
    const { data: sampleTemplates, error: sampleError } = await supabase
      .from('templates')
      .select('id, student_prompt, domain, grade')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleError) {
      console.error('❌ Error fetching sample templates:', sampleError);
    }

    const success = newTemplates > 0;
    console.log(`${success ? '✅' : '❌'} Generation ${success ? 'successful' : 'failed'}`);

    return new Response(JSON.stringify({
      success,
      templatesBefore,
      templatesAfter,
      newTemplatesCreated: newTemplates,
      batchResult,
      sampleTemplates: sampleTemplates || [],
      message: success 
        ? `Successfully created ${newTemplates} new templates` 
        : 'No new templates were created'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Controller error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});