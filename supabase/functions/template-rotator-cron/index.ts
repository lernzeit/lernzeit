import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Template rotator cron job started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      processed: 0,
      archived: 0,
      generated: 0,
      errors: [] as string[]
    };

    // Step 1: Analyze and archive low-performing templates
    const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const domains = [
      'Zahlen & Operationen',
      'Raum & Form', 
      'Größen & Messen',
      'Daten & Zufall',
      'Gleichungen & Funktionen'
    ];

    for (const grade of grades) {
      for (const domain of domains) {
        try {
          console.log(`🔍 Processing Grade ${grade}, ${domain}`);

          // Get templates with performance data
          const { data: templates, error: fetchError } = await supabase
            .from('templates')
            .select('id, quality_score, plays, correct, created_at')
            .eq('grade', grade)
            .eq('domain', domain)
            .eq('status', 'ACTIVE');

          if (fetchError) {
            results.errors.push(`Fetch error for ${grade}-${domain}: ${fetchError.message}`);
            continue;
          }

          if (!templates || templates.length === 0) continue;

          // Archive templates with poor performance (minimum 20 plays to have reliable data)
          const lowPerformers = templates.filter(template => {
            if (template.plays < 20) return false; // Need enough data
            
            const successRate = template.correct / template.plays;
            const qualityScore = template.quality_score || 0;
            
            // Archive if both quality and success rate are low
            return qualityScore < 0.5 && successRate < 0.3;
          });

          if (lowPerformers.length > 0) {
            const { error: archiveError } = await supabase
              .from('templates')
              .update({ 
                status: 'ARCHIVED',
                updated_at: new Date().toISOString()
              })
              .in('id', lowPerformers.map(t => t.id));

            if (archiveError) {
              results.errors.push(`Archive error for ${grade}-${domain}: ${archiveError.message}`);
            } else {
              results.archived += lowPerformers.length;
              console.log(`📦 Archived ${lowPerformers.length} low performers for ${grade}-${domain}`);
            }
          }

          // Check if we need more templates (target: 60 active per grade-domain)
          const activeCount = templates.length - lowPerformers.length;
          if (activeCount < 40) {
            console.log(`📊 Template count low (${activeCount}) for ${grade}-${domain}, triggering generation`);

            // Trigger generation for this combination
            const { error: generateError } = await supabase.functions.invoke('batch-generate-questions', {
              body: {
                grade,
                domain,
                batchSize: 20,
                prioritizeGaps: true,
                targetQuality: 0.8
              }
            });

            if (generateError) {
              results.errors.push(`Generation error for ${grade}-${domain}: ${generateError.message}`);
            } else {
              results.generated += 20; // Estimated
            }
          }

          results.processed++;
          
          // Small delay between combinations
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Error processing ${grade}-${domain}:`, error);
          results.errors.push(`${grade}-${domain}: ${error.message}`);
        }
      }
    }

    // Step 2: Update template statistics
    await updateTemplateStatistics(supabase);

    // Step 3: Clean up old archived templates (older than 6 months)
    await cleanupOldTemplates(supabase);

    console.log(`🎯 Template rotation complete: 
      - Processed: ${results.processed} combinations
      - Archived: ${results.archived} low performers  
      - Generated: ${results.generated} new templates
      - Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Template rotation complete: processed ${results.processed} combinations`,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Template rotator cron error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Template rotation failed', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function updateTemplateStatistics(supabase: any) {
  console.log('📈 Updating template statistics...');

  try {
    // Calculate success rates and update quality scores
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, plays, correct, quality_score')
      .eq('status', 'ACTIVE')
      .gt('plays', 0);

    if (error) throw error;

    for (const template of templates || []) {
      const successRate = template.correct / template.plays;
      
      // Blend original quality score with actual performance
      const newQualityScore = (template.quality_score * 0.7) + (successRate * 0.3);
      
      await supabase
        .from('templates')
        .update({ 
          quality_score: Math.min(1, Math.max(0, newQualityScore)),
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);
    }

    console.log(`✅ Updated statistics for ${templates?.length || 0} templates`);
  } catch (error) {
    console.error('Error updating template statistics:', error);
  }
}

async function cleanupOldTemplates(supabase: any) {
  console.log('🗑️ Cleaning up old archived templates...');

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } = await supabase
      .from('templates')
      .delete()
      .eq('status', 'ARCHIVED')
      .lt('updated_at', sixMonthsAgo.toISOString());

    if (error) throw error;

    console.log(`✅ Cleaned up archived templates older than 6 months`);
  } catch (error) {
    console.error('Error cleaning up old templates:', error);
  }
}