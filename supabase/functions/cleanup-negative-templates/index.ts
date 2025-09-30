import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting cleanup of templates with negative feedback...');

    // Step 1: Analyze feedback per template
    const { data: feedbackStats, error: statsError } = await supabase
      .rpc('get_template_feedback_stats');

    if (statsError) {
      console.error('Error fetching feedback stats:', statsError);
      throw statsError;
    }

    console.log(`📊 Analyzed ${feedbackStats?.length || 0} templates with feedback`);

    let deletedCount = 0;
    let flaggedCount = 0;

    for (const stat of feedbackStats || []) {
      const {
        template_id,
        total_feedback,
        thumbs_down_count,
        too_hard_count,
        too_easy_count,
        thumbs_up_count,
        negative_ratio
      } = stat;

      // Delete criteria:
      // 1. At least 5 feedback entries
      // 2. More than 70% negative feedback (thumbs_down or too_hard)
      // 3. Less than 20% positive feedback (thumbs_up)
      
      const shouldDelete = 
        total_feedback >= 5 &&
        negative_ratio > 0.7 &&
        (thumbs_up_count / total_feedback) < 0.2;

      if (shouldDelete) {
        console.log(`🗑️ Deleting template ${template_id} - ${total_feedback} feedback, ${(negative_ratio * 100).toFixed(0)}% negative`);
        
        const { error: deleteError } = await supabase
          .from('templates')
          .update({ status: 'DELETED', validation_status: 'deleted_negative_feedback' })
          .eq('id', template_id);

        if (deleteError) {
          console.error(`Failed to delete template ${template_id}:`, deleteError);
        } else {
          deletedCount++;
        }
      } else if (total_feedback >= 3 && negative_ratio > 0.5) {
        // Flag for review if 50-70% negative
        console.log(`⚠️ Flagging template ${template_id} - ${total_feedback} feedback, ${(negative_ratio * 100).toFixed(0)}% negative`);
        
        const { error: flagError } = await supabase
          .from('templates')
          .update({ validation_status: 'flagged_moderate_negative' })
          .eq('id', template_id);

        if (!flagError) {
          flaggedCount++;
        }
      }
    }

    const result = {
      success: true,
      message: `Cleanup complete: ${deletedCount} templates deleted, ${flaggedCount} flagged`,
      stats: {
        analyzed: feedbackStats?.length || 0,
        deleted: deletedCount,
        flagged: flaggedCount
      }
    };

    console.log('✅ Cleanup result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
