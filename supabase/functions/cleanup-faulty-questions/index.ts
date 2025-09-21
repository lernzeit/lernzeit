import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting cleanup of faulty questions...');

    // Identify faulty templates
    const { data: faultyTemplates, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .or(
        'student_prompt.is.null,' +
        'student_prompt.eq."",' +
        'solution.is.null,' +
        'explanation.is.null,' +
        'explanation.eq."",' +
        'student_prompt.like.%undefined%,' +
        'student_prompt.like.%null%,' +
        'student_prompt.like.%NaN%,' +
        'student_prompt.like.%[object Object]%'
      );

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${faultyTemplates?.length || 0} potentially faulty templates`);

    // Updated more precise search for faulty multiple-choice questions
    const { data: mcTemplates, error: mcError } = await supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .in('question_type', ['multiple-choice', 'MULTIPLE_CHOICE']);

    if (mcError) {
      throw mcError;
    }

    const faultyMcTemplates = mcTemplates?.filter(template => {
      const distractors = template.distractors;
      
      // Check if distractors is null, empty, or improperly formatted
      if (!distractors) return true;
      
      // If it's an array but empty or too small
      if (Array.isArray(distractors) && distractors.length < 2) return true;
      
      // If it's an object but missing options or insufficient options
      if (typeof distractors === 'object' && distractors !== null) {
        if (!distractors.options) return true;
        if (!Array.isArray(distractors.options)) return true;
        if (distractors.options.length < 3) return true;
      }
      
      return false;
    }) || [];

    console.log(`Found ${faultyMcTemplates.length} multiple-choice templates without proper distractors`);

    // Combine all faulty templates
    const allFaultyIds = [
      ...(faultyTemplates?.map(t => t.id) || []),
      ...faultyMcTemplates.map(t => t.id)
    ];

    const uniqueFaultyIds = [...new Set(allFaultyIds)];

    if (uniqueFaultyIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No faulty questions found',
          cleaned: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark faulty templates as DELETED instead of actually deleting them
    const { error: updateError } = await supabase
      .from('templates')
      .update({ 
        status: 'DELETED',
        updated_at: new Date().toISOString()
      })
      .in('id', uniqueFaultyIds);

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully marked ${uniqueFaultyIds.length} faulty templates as DELETED`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${uniqueFaultyIds.length} faulty questions`,
        cleaned: uniqueFaultyIds.length,
        details: {
          generalFaulty: faultyTemplates?.length || 0,
          faultyMultipleChoice: faultyMcTemplates.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});