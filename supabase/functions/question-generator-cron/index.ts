import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting automatic question generation cron job');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, grade, subject, title')
      .eq('is_active', true);

    if (topicsError) {
      throw new Error(`Failed to fetch topics: ${topicsError.message}`);
    }

    console.log(`📚 Found ${topics?.length || 0} active topics`);

    const results = [];
    const MIN_QUESTIONS = 50;
    const GENERATE_COUNT = 20;

    // Check each topic and generate if needed
    for (const topic of topics || []) {
      const { count, error: countError } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topic.id)
        .eq('is_active', true);

      if (countError) {
        console.error(`❌ Error counting questions for topic ${topic.id}:`, countError);
        continue;
      }

      const currentCount = count || 0;
      console.log(`📊 Topic "${topic.title}" (${topic.grade}/${topic.subject}): ${currentCount} questions`);

      if (currentCount < MIN_QUESTIONS) {
        console.log(`⚠️ Below threshold, generating ${GENERATE_COUNT} new questions...`);

        try {
          // Call generate-questions edge function
          const { data: generateResult, error: generateError } = await supabase.functions.invoke(
            'generate-questions',
            {
              body: {
                topic_id: topic.id,
                count: GENERATE_COUNT,
                trigger: 'cron'
              }
            }
          );

          if (generateError) {
            console.error(`❌ Generation failed for topic ${topic.id}:`, generateError);
            results.push({
              topic_id: topic.id,
              topic_title: topic.title,
              success: false,
              error: generateError.message
            });
          } else {
            console.log(`✅ Generated ${generateResult.generated_count} questions for "${topic.title}"`);
            results.push({
              topic_id: topic.id,
              topic_title: topic.title,
              success: true,
              generated_count: generateResult.generated_count
            });
          }
        } catch (error) {
          console.error(`❌ Exception generating for topic ${topic.id}:`, error);
          results.push({
            topic_id: topic.id,
            topic_title: topic.title,
            success: false,
            error: error.message
          });
        }
      } else {
        results.push({
          topic_id: topic.id,
          topic_title: topic.title,
          success: true,
          skipped: true,
          reason: 'Sufficient questions available'
        });
      }
    }

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`✅ Cron job completed: ${successCount} generated, ${skippedCount} skipped, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_topics: topics?.length || 0,
        generated: successCount,
        skipped: skippedCount,
        failed: failedCount
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
