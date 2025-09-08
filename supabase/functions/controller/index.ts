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
    console.log('🎮 Controller function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase credentials missing');
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Count existing templates
    const { count: beforeCount } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Templates before generation: ${beforeCount}`);

    // Invoke batch generation
    console.log('🚀 Triggering batch generation...');
    const { data: batchResult, error: batchError } = await supabase.functions.invoke('batch-generate-questions', {
      body: { trigger: 'controller' }
    });

    if (batchError) {
      console.error('❌ Batch generation error:', batchError);
      return new Response(JSON.stringify({ 
        error: 'Batch generation failed', 
        details: batchError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Batch generation completed:', batchResult);

    // Wait a moment for insertions to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Count templates after generation
    const { count: afterCount } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true });

    const newTemplatesCount = (afterCount || 0) - (beforeCount || 0);
    console.log(`📈 New templates created: ${newTemplatesCount}`);

    // Get a sample of the newest templates
    const { data: sampleTemplates } = await supabase
      .from('templates')
      .select('id, student_prompt, grade, domain, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('🎯 Controller completed successfully');

    return new Response(JSON.stringify({
      success: true,
      templatesBefore: beforeCount,
      templatesAfter: afterCount,
      newTemplates: newTemplatesCount,
      batchResult: batchResult,
      sampleTemplates: sampleTemplates,
      message: `Controller executed successfully. Created ${newTemplatesCount} new templates.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Controller error:', error);
    return new Response(JSON.stringify({ 
      error: 'Controller failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});