import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DuplicateGroup {
  normalized_prompt: string;
  duplicate_count: number;
  all_ids: string;
  earliest_created: string;
  original_prompts: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting duplicate cleanup process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Find all duplicate groups
    const { data: duplicates, error: findError } = await supabase.rpc('find_duplicate_templates');
    
    if (findError) {
      console.error('❌ Error finding duplicates:', findError);
      throw findError;
    }

    if (!duplicates || duplicates.length === 0) {
      console.log('✅ No duplicates found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No duplicates found', 
          deactivated_count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }

    let totalDeactivated = 0;
    const deactivationResults = [];

    // Step 2: Process each duplicate group
    for (const group of duplicates as DuplicateGroup[]) {
      console.log(`🔄 Processing duplicate group: "${group.normalized_prompt}" (${group.duplicate_count} duplicates)`);
      
      const allIds = group.all_ids.split(', ').map(id => id.trim());
      
      if (allIds.length > 1) {
        // Keep the first (oldest) ID, deactivate the rest
        const idsToDeactivate = allIds.slice(1);
        
        console.log(`  📝 Keeping oldest: ${allIds[0]}`);
        console.log(`  🗑️ Deactivating: ${idsToDeactivate.join(', ')}`);
        
        // Deactivate the duplicate templates
        const { error: deactivateError } = await supabase
          .from('templates')
          .update({ 
            status: 'INACTIVE',
            updated_at: new Date().toISOString()
          })
          .in('id', idsToDeactivate);

        if (deactivateError) {
          console.error(`❌ Error deactivating duplicates for "${group.normalized_prompt}":`, deactivateError);
          deactivationResults.push({
            normalized_prompt: group.normalized_prompt,
            success: false,
            error: deactivateError.message,
            attempted_count: idsToDeactivate.length
          });
        } else {
          console.log(`✅ Successfully deactivated ${idsToDeactivate.length} duplicates for "${group.normalized_prompt}"`);
          totalDeactivated += idsToDeactivate.length;
          deactivationResults.push({
            normalized_prompt: group.normalized_prompt,
            success: true,
            deactivated_count: idsToDeactivate.length,
            kept_id: allIds[0]
          });
        }
      }
    }

    console.log(`🎉 Duplicate cleanup completed. Total deactivated: ${totalDeactivated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Duplicate cleanup completed successfully`, 
        total_deactivated: totalDeactivated,
        duplicate_groups_processed: duplicates.length,
        results: deactivationResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Duplicate cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
