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
    console.log('🚀 Starting batch generation...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const grades = [1, 2, 3];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const domains = [
      "Zahlen & Operationen",
      "Größen & Messen", 
      "Raum & Form",
      "Daten & Zufall"
    ];
    
    const questionsPerCombination = 5;
    let totalGenerated = 0;
    let totalErrors = 0;
    const results: any[] = [];

    console.log(`📊 Total combinations: ${grades.length * quarters.length * domains.length} × ${questionsPerCombination} questions each`);

    for (const grade of grades) {
      for (const quarter of quarters) {
        for (const domain of domains) {
          try {
            console.log(`📝 Grade ${grade}, ${quarter}, ${domain}...`);
            
            const { data, error } = await supabase.functions.invoke('generate-questions', {
              body: {
                grade,
                quarter,
                domain,
                count: questionsPerCombination,
                difficulty: 'AFB I'
              }
            });

            if (error) {
              console.error(`❌ Error for ${grade}/${quarter}/${domain}:`, error);
              totalErrors++;
              results.push({ grade, quarter, domain, status: 'error', error: error.message });
              continue;
            }

            if (data?.success) {
              totalGenerated += data.generated || 0;
              results.push({ grade, quarter, domain, status: 'success', generated: data.generated });
              console.log(`✅ ${grade}/${quarter}/${domain}: ${data.generated} questions`);
            } else {
              totalErrors++;
              results.push({ grade, quarter, domain, status: 'error', error: data?.error || 'Unknown error' });
              console.log(`❌ ${grade}/${quarter}/${domain}: Failed`);
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`💥 Exception for ${grade}/${quarter}/${domain}:`, error);
            totalErrors++;
            results.push({ grade, quarter, domain, status: 'error', error: error.message });
          }
        }
      }
    }

    const totalExpected = grades.length * quarters.length * domains.length * questionsPerCombination;
    console.log(`🏁 Batch completed: ${totalGenerated}/${totalExpected} questions generated, ${totalErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      totalGenerated,
      totalErrors,
      totalCombinations: grades.length * quarters.length * domains.length,
      questionsPerCombination,
      totalExpected,
      successRate: ((totalGenerated / totalExpected) * 100).toFixed(1) + '%',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Batch generation failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});