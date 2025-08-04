import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const subjects = ['Mathematik','Deutsch','Englisch','Geographie','Geschichte','Physik','Biologie','Chemie','Latein'];
    const results = [];
    
    console.log('Starting batch test of question_factory_v2...');

    // Generate 20 random test cases
    for (let i = 0; i < 20; i++) {
      const grade = Math.floor(Math.random() * 10) + 1;
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      
      console.log(`Test ${i+1}: Grade ${grade}, Subject ${subject}`);
      
      try {
        const { data, error } = await supabase.functions.invoke('question_factory_v2', {
          body: { grade, subject }
        });
        
        if (error) {
          console.error(`Test ${i+1} failed:`, error);
          results.push({
            test: i+1,
            grade,
            subject,
            success: false,
            error: error.message
          });
        } else {
          console.log(`Test ${i+1} succeeded:`, data);
          results.push({
            test: i+1,
            grade,
            subject,
            success: true,
            result: data
          });
        }
      } catch (callError) {
        console.error(`Test ${i+1} exception:`, callError);
        results.push({
          test: i+1,
          grade,
          subject,
          success: false,
          error: callError.message
        });
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Batch test completed: ${successCount} successes, ${failCount} failures`);

    return new Response(JSON.stringify({
      summary: {
        total: 20,
        successes: successCount,
        failures: failCount
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Batch test error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});