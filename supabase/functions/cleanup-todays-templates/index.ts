import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action = 'analyze', days = 1 } = await req.json().catch(() => ({}));
    
    // Compute analysis window in UTC
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(end);
    start.setDate(end.getDate() - Math.max(1, Number(days)));

    console.log(`🕒 Analyzing templates created between ${start.toISOString()} and ${end.toISOString()} (last ${days} day(s))`);

    if (action === 'analyze') {
      // First, analyze what we have
      const { data: todaysTemplates, error: fetchError } = await supabaseClient
        .from('templates')
        .select('id, created_at, student_prompt, grade, domain, quality_score, status')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch templates: ${fetchError.message}`);
      }

      // Analyze quality issues
      const qualityIssues = {
        containsOptions: 0,
        lowQuality: 0,
        missingPrompt: 0,
        total: todaysTemplates?.length || 0
      };

      const problematicTemplates = [];

      todaysTemplates?.forEach(template => {
        let hasIssues = false;
        const issues = [];

        // Check for options in student_prompt
        if (template.student_prompt?.includes('A:') || 
            template.student_prompt?.includes('B:') || 
            template.student_prompt?.includes('C:')) {
          qualityIssues.containsOptions++;
          issues.push('Options in prompt');
          hasIssues = true;
        }

        // Check for low quality
        if (!template.quality_score || template.quality_score < 0.7) {
          qualityIssues.lowQuality++;
          issues.push('Low quality score');
          hasIssues = true;
        }

        // Check for missing prompt
        if (!template.student_prompt || template.student_prompt.trim().length < 10) {
          qualityIssues.missingPrompt++;
          issues.push('Missing/short prompt');
          hasIssues = true;
        }

        if (hasIssues) {
          problematicTemplates.push({
            id: template.id,
            grade: template.grade,
            domain: template.domain,
            quality_score: template.quality_score,
            issues: issues,
            prompt_preview: template.student_prompt?.substring(0, 100) + '...'
          });
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            total_templates: qualityIssues.total,
            quality_issues: qualityIssues,
            problematic_count: problematicTemplates.length,
            sample_problems: problematicTemplates.slice(0, 10), // First 10 examples
            recommendation: qualityIssues.total > 1000 ? 'CRITICAL: Mass cleanup needed' : 'Normal cleanup sufficient'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'cleanup') {
      // Perform the actual cleanup
      console.log('🧹 Starting cleanup of problematic templates...');

      // First, get all problematic templates from today
      const { data: problematicTemplates, error: fetchError } = await supabaseClient
        .from('templates')
        .select('id, student_prompt, quality_score')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .or('student_prompt.ilike.%A:%,student_prompt.ilike.%B:%,student_prompt.ilike.%C:%,quality_score.lt.0.7');

      if (fetchError) {
        throw new Error(`Failed to fetch problematic templates: ${fetchError.message}`);
      }

      const idsToDelete = problematicTemplates?.map(t => t.id) || [];
      
      if (idsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${idsToDelete.length} problematic templates...`);

        // Delete in batches to avoid timeout
        const batchSize = 100;
        let deletedCount = 0;
        
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          
          const { error: deleteError } = await supabaseClient
            .from('templates')
            .delete()
            .in('id', batch);

          if (deleteError) {
            console.error(`❌ Error deleting batch ${i}-${i + batchSize}:`, deleteError);
            throw new Error(`Failed to delete templates: ${deleteError.message}`);
          }

          deletedCount += batch.length;
          console.log(`✅ Deleted batch ${i}-${i + batchSize} (${deletedCount}/${idsToDelete.length})`);
        }

        // After deletion, count remaining in range
        const { count: remaining } = await supabaseClient
          .from('templates')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString());

        return new Response(
          JSON.stringify({
            success: true,
            cleanup_result: {
              deleted_count: deletedCount,
              remaining_in_range: remaining ?? null,
              message: `Successfully cleaned up ${deletedCount} problematic templates (window: last ${days} day(s))`
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            cleanup_result: {
              deleted_count: 0,
              message: 'No problematic templates found to delete'
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } else if (action === 'delete_all_today') {
      // Nuclear option: delete ALL templates from today
      console.log('☢️ NUCLEAR CLEANUP: Deleting ALL templates from today...');

      const { data: allToday, error: fetchError } = await supabaseClient
        .from('templates')
        .select('id')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch today's templates: ${fetchError.message}`);
      }

      const allIds = allToday?.map(t => t.id) || [];

      if (allIds.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from('templates')
          .delete()
          .in('id', allIds);

        if (deleteError) {
          throw new Error(`Failed to delete all templates: ${deleteError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            nuclear_cleanup: {
              deleted_count: allIds.length,
              message: `NUCLEAR: Deleted ALL ${allIds.length} templates from today`
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Cleanup function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});