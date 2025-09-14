import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('🔄 Starting template statistics recount...');

    // Get all templates that should have stats
    const { data: templates, error } = await supabaseClient
      .from('templates')
      .select('id')
      .eq('status', 'ACTIVE');

    if (error) throw error;

    console.log(`📊 Recounting stats for ${templates?.length || 0} templates`);

    let updatedCount = 0;
    const batchSize = 50;

    // Process in batches to avoid timeouts
    if (templates && templates.length > 0) {
      for (let i = 0; i < templates.length; i += batchSize) {
        const batch = templates.slice(i, i + batchSize);
        
        for (const template of batch) {
          try {
            // Reset stats to 0 - they will be recalculated from actual usage logs
            await supabaseClient
              .from('templates')
              .update({
                plays: 0,
                correct: 0,
                rating_sum: 0,
                rating_count: 0,
                last_validated: new Date().toISOString()
              })
              .eq('id', template.id);
              
            updatedCount++;
          } catch (updateError) {
            console.warn(`⚠️ Failed to reset stats for template ${template.id}:`, updateError);
          }
        }
        
        console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(templates.length/batchSize)}`);
      }
    }

    console.log(`🎯 Template stats recount complete: ${updatedCount} templates reset`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Template statistics reset for ${updatedCount} templates`,
        templatesProcessed: updatedCount,
        totalTemplates: templates?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('❌ Template stats recount error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Template statistics recount failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});